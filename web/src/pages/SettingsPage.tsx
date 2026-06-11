import { useEffect, useState } from "react";
import { api } from "../api";
import { Button, Card, Field, Spinner, TextInput } from "../components/ui";

const FIELDS: { key: string; label: string; textarea?: boolean; hint?: string }[] = [
  { key: "company_name", label: "Firmenname" },
  { key: "company_address", label: "Adresse (für Angebots-Briefkopf)", textarea: true },
  { key: "company_contact", label: "Kontakt (Telefon, E-Mail)", textarea: true },
  {
    key: "offer_template",
    label: "Angebotstext-Vorlage",
    textarea: true,
    hint: "Platzhalter: {titel} = Bezeichnung der Kalkulation, {preis} = Verkaufspreis pro Stück",
  },
  { key: "offer_footer", label: "Angebots-Fußtext (Lieferzeit etc.)", textarea: true },
];

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string> | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    api.get<Record<string, string>>("/settings").then(setValues);
  }, []);

  if (!values) return <Spinner />;

  const save = async () => {
    await api.put("/settings", values);
    setSavedAt(new Date());
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Einstellungen</h1>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-xs text-green-600">Gespeichert {savedAt.toLocaleTimeString("de-DE")}</span>}
          <Button onClick={save}>💾 Speichern</Button>
        </div>
      </div>
      <Card title="Firma & Angebot">
        <div className="space-y-4">
          {FIELDS.map((f) => (
            <Field key={f.key} label={f.label}>
              {f.textarea ? (
                <textarea
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  rows={f.key === "offer_template" ? 8 : 3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              ) : (
                <TextInput value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
              )}
              {f.hint && <p className="text-xs text-slate-400 mt-1">{f.hint}</p>}
            </Field>
          ))}
        </div>
      </Card>
    </div>
  );
}
