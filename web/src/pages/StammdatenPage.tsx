import { useEffect, useState } from "react";
import { api } from "../api";
import { Button, Field, Modal, NumInput, Select, Spinner, TextInput } from "../components/ui";
import { fmtEur, fmtNum } from "../format";
import { CALC_TYPE_LABELS } from "../../../shared/types";

// Generischer Stammdaten-Editor: Spaltendefinition → Tabelle + Modal-Formular

type FieldDef = {
  key: string;
  label: string;
  type: "text" | "number" | "percent" | "select" | "textarea";
  options?: { value: string; label: string }[];
  showEur?: boolean;
};

function MasterTable({ endpoint, fields, title, defaultRow }: {
  endpoint: string;
  fields: FieldDef[];
  title: string;
  defaultRow: Record<string, unknown>;
}) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [edit, setEdit] = useState<any | null>(null);

  const load = () => {
    api.get<any[]>(`/${endpoint}`).then(setRows);
  };
  useEffect(load, [endpoint]);

  const save = async () => {
    if (edit.id) await api.put(`/${endpoint}/${edit.id}`, edit);
    else await api.post(`/${endpoint}`, edit);
    setEdit(null);
    load();
  };

  const del = async (id: number) => {
    if (!confirm("Eintrag wirklich löschen?")) return;
    await api.delete(`/${endpoint}/${id}`);
    load();
  };

  if (!rows) return <Spinner />;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button onClick={() => setEdit({ ...defaultRow })}>+ Neu</Button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              {fields.map((f) => (
                <th key={f.key} className={`px-4 py-3 ${f.type === "number" || f.type === "percent" ? "text-right" : "text-left"}`}>
                  {f.label}
                </th>
              ))}
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                {fields.map((f) => (
                  <td key={f.key} className={`px-4 py-2.5 ${f.type === "number" || f.type === "percent" ? "text-right" : ""} ${f.key === "name" ? "font-medium text-slate-800" : "text-slate-600"}`}>
                    {f.type === "number"
                      ? f.showEur ? fmtEur(r[f.key]) : fmtNum(r[f.key])
                      : f.type === "select"
                        ? (f.options?.find((o) => o.value === String(r[f.key]))?.label ?? r[f.key])
                        : String(r[f.key] ?? "").slice(0, 60)}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  <button onClick={() => setEdit({ ...r })} className="text-slate-400 hover:text-blue-600 px-1.5">✎</button>
                  <button onClick={() => del(r.id)} className="text-slate-400 hover:text-red-600 px-1.5">🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <Modal title={`${title} ${edit.id ? "bearbeiten" : "anlegen"}`} onClose={() => setEdit(null)}>
          <div className="space-y-3">
            {fields.map((f) => (
              <Field key={f.key} label={f.label}>
                {f.type === "number" || f.type === "percent" ? (
                  <NumInput value={Number(edit[f.key]) || 0} onValue={(v) => setEdit({ ...edit, [f.key]: v })} />
                ) : f.type === "select" ? (
                  <Select value={String(edit[f.key] ?? "")} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })}>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                ) : f.type === "textarea" ? (
                  <textarea
                    value={String(edit[f.key] ?? "")}
                    onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })}
                    rows={3}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                ) : (
                  <TextInput value={String(edit[f.key] ?? "")} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })} />
                )}
              </Field>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setEdit(null)}>Abbrechen</Button>
              <Button onClick={save}>Speichern</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const TABS = [
  { id: "materials", label: "Materialien" },
  { id: "steps", label: "Arbeitsgänge" },
  { id: "shipping", label: "Versand & Verpackung" },
  { id: "presets", label: "Vorlagen-Material" },
  { id: "customers", label: "Kunden" },
  { id: "suppliers", label: "Lieferanten" },
  { id: "sachbearbeiter", label: "Sachbearbeiter" },
];

export default function StammdatenPage() {
  const [tab, setTab] = useState("materials");

  const calcTypeOptions = Object.entries(CALC_TYPE_LABELS).map(([value, label]) => ({ value, label }));

  return (
    <div className="max-w-6xl space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Stammdaten</h1>
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              tab === t.id ? "bg-white border border-slate-200 border-b-white text-blue-600 -mb-px" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "materials" && (
        <MasterTable
          endpoint="materials"
          title="Material"
          defaultRow={{ name: "", price_per_kg: 0, density: 7.85, color_group: "", note: "", sort: 0, active: 1 }}
          fields={[
            { key: "name", label: "Material", type: "text" },
            { key: "price_per_kg", label: "Preis/Kg", type: "number", showEur: true },
            { key: "density", label: "Dichte g/cm³", type: "number" },
            { key: "color_group", label: "Farbliste", type: "text" },
            { key: "note", label: "Hinweis", type: "text" },
            { key: "sort", label: "Sortierung", type: "number" },
          ]}
        />
      )}

      {tab === "steps" && (
        <MasterTable
          endpoint="step_templates"
          title="Arbeitsgang"
          defaultRow={{ calc_type: "laufrad", pos: 0, name: "", rate: 58, setup_min: 0 }}
          fields={[
            { key: "calc_type", label: "Kalkulationstyp", type: "select", options: calcTypeOptions },
            { key: "pos", label: "Pos.", type: "number" },
            { key: "name", label: "Arbeitsgang", type: "text" },
            { key: "rate", label: "Stundensatz €/h", type: "number", showEur: true },
            { key: "setup_min", label: "Rüstzeit (min)", type: "number" },
          ]}
        />
      )}

      {tab === "shipping" && (
        <MasterTable
          endpoint="shipping_items"
          title="Versandposition"
          defaultRow={{ category: "verpackung", name: "", dimensions: "", shipping_price: 0, packaging_price: 0, note: "", sort: 0 }}
          fields={[
            { key: "category", label: "Kategorie", type: "select", options: [
              { value: "verpackung", label: "Verpackung" },
              { value: "fahrzeug", label: "Fahrzeug (€/h)" },
            ] },
            { key: "name", label: "Bezeichnung", type: "text" },
            { key: "dimensions", label: "Maße", type: "text" },
            { key: "shipping_price", label: "Versandpreis", type: "number", showEur: true },
            { key: "packaging_price", label: "Verpackungspreis", type: "number", showEur: true },
            { key: "note", label: "Bemerkung", type: "text" },
          ]}
        />
      )}

      {tab === "presets" && (
        <MasterTable
          endpoint="material_presets"
          title="Material-Vorlage"
          defaultRow={{ calc_type: "schallkabine", pos: 0, name: "", comment: "", supplier: "", unit_price: 0 }}
          fields={[
            { key: "calc_type", label: "Kalkulationstyp", type: "select", options: [
              { value: "schallkabine", label: "Schallkabine" },
              { value: "ventilator", label: "Ventilator" },
            ] },
            { key: "pos", label: "Pos.", type: "number" },
            { key: "name", label: "Bezeichnung", type: "text" },
            { key: "comment", label: "Kommentar", type: "text" },
            { key: "supplier", label: "Lieferant", type: "text" },
            { key: "unit_price", label: "Preis/Einheit", type: "number", showEur: true },
          ]}
        />
      )}

      {tab === "customers" && (
        <MasterTable
          endpoint="customers"
          title="Kunde"
          defaultRow={{ name: "", contact: "", email: "", phone: "", special_terms: "", notes: "" }}
          fields={[
            { key: "name", label: "Name", type: "text" },
            { key: "contact", label: "Ansprechpartner", type: "text" },
            { key: "email", label: "E-Mail", type: "text" },
            { key: "phone", label: "Telefon", type: "text" },
            { key: "special_terms", label: "Sondervereinbarungen", type: "textarea" },
            { key: "notes", label: "Notizen", type: "textarea" },
          ]}
        />
      )}

      {tab === "sachbearbeiter" && (
        <MasterTable
          endpoint="sachbearbeiter"
          title="Sachbearbeiter"
          defaultRow={{ name: "", kuerzel: "" }}
          fields={[
            { key: "name", label: "Name", type: "text" },
            { key: "kuerzel", label: "Kürzel", type: "text" },
          ]}
        />
      )}

      {tab === "suppliers" && (
        <MasterTable
          endpoint="suppliers"
          title="Lieferant"
          defaultRow={{ name: "", contact: "", email: "", phone: "", notes: "" }}
          fields={[
            { key: "name", label: "Name", type: "text" },
            { key: "contact", label: "Ansprechpartner", type: "text" },
            { key: "email", label: "E-Mail", type: "text" },
            { key: "phone", label: "Telefon", type: "text" },
            { key: "notes", label: "Notizen", type: "textarea" },
          ]}
        />
      )}
    </div>
  );
}
