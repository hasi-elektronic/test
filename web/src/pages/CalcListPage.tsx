import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { fmtEur, fmtDate } from "../format";
import { Badge, Button, Select, Spinner, STATUS_COLORS, TextInput } from "../components/ui";
import { CALC_TYPE_LABELS, STATUS_LABELS } from "../../../shared/types";

interface Row {
  id: number;
  calc_type: string;
  title: string;
  version: number;
  parent_id: number | null;
  status: string;
  customer_name: string;
  inquiry_no: string;
  drawing_no: string;
  calc_date: string;
  sales_total: number;
  sales_unit: number;
  updated_at: string;
  created_by_name: string;
}

export default function CalcListPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const load = () => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    api.get<Row[]>(`/calculations?${params}`).then(setRows);
  };

  useEffect(load, [type, status]);

  const copy = async (id: number) => {
    const res = await api.post<{ id: number }>(`/calculations/${id}/copy`);
    navigate(`/kalkulationen/${res.id}`);
  };

  const del = async (id: number) => {
    if (!confirm("Kalkulation wirklich löschen?")) return;
    await api.delete(`/calculations/${id}`);
    load();
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Kalkulationen</h1>
        <Link to="/kalkulationen/neu" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + Neue Kalkulation
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-44">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Alle Typen</option>
            {Object.entries(CALC_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Alle Status</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <div className="w-72 flex gap-2">
          <TextInput
            placeholder="Suche: Titel, Kunde, Anfrage-Nr…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
          <Button variant="secondary" onClick={load}>Suchen</Button>
        </div>
      </div>

      {!rows ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          Keine Kalkulationen gefunden.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left px-4 py-3">Bezeichnung</th>
                <th className="text-left px-4 py-3">Typ</th>
                <th className="text-left px-4 py-3">Kunde</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Preis/Stück</th>
                <th className="text-right px-4 py-3">Gesamt</th>
                <th className="text-right px-4 py-3">Geändert</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link to={`/kalkulationen/${r.id}`} className="text-blue-600 hover:underline font-medium">
                      {r.title || "(ohne Titel)"}
                    </Link>{" "}
                    <span className="text-xs text-slate-400">V{r.version}</span>
                    {r.drawing_no && <div className="text-xs text-slate-400">Zeichn. {r.drawing_no}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{(CALC_TYPE_LABELS as any)[r.calc_type] ?? r.calc_type}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.customer_name}</td>
                  <td className="px-4 py-2.5">
                    <Badge color={STATUS_COLORS[r.status] ?? ""}>{(STATUS_LABELS as any)[r.status] ?? r.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">{fmtEur(r.sales_unit)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{fmtEur(r.sales_total)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-400">{fmtDate(r.updated_at)}</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <button onClick={() => copy(r.id)} title="Neue Version erstellen" className="text-slate-400 hover:text-blue-600 px-1.5">
                      ⧉
                    </button>
                    <button onClick={() => del(r.id)} title="Löschen" className="text-slate-400 hover:text-red-600 px-1.5">
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
