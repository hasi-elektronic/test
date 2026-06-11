import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { fmtEur, fmtDate } from "../format";
import { Badge, Card, Spinner, STATUS_COLORS } from "../components/ui";
import { CALC_TYPE_LABELS, STATUS_LABELS } from "../../../shared/types";

interface Dashboard {
  byStatus: { status: string; count: number; total: number }[];
  byType: { calc_type: string; count: number }[];
  recent: {
    id: number;
    calc_type: string;
    title: string;
    version: number;
    status: string;
    customer_name: string;
    sales_total: number;
    updated_at: string;
    created_by_name: string;
  }[];
  sums: { count: number; sales: number; profit: number; cost: number };
}

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    api.get<Dashboard>("/dashboard").then(setData);
  }, []);

  if (!data) return <Spinner />;

  const statusOf = (s: string) => data.byStatus.find((x) => x.status === s);
  const margin = data.sums.cost > 0 ? data.sums.profit / data.sums.cost : 0;

  const kpis = [
    { label: "Kalkulationen gesamt", value: String(data.sums.count) },
    { label: "Offene Angebote", value: fmtEur(statusOf("angebot")?.total ?? 0), sub: `${statusOf("angebot")?.count ?? 0} Stück` },
    { label: "Aufträge", value: fmtEur(statusOf("auftrag")?.total ?? 0), sub: `${statusOf("auftrag")?.count ?? 0} Stück` },
    { label: "Ø Gewinnmarge", value: `${(margin * 100).toFixed(1)} %` },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <Link to="/kalkulationen/neu" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + Neue Kalkulation
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{k.label}</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{k.value}</div>
            {k.sub && <div className="text-xs text-slate-400 mt-0.5">{k.sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="Zuletzt bearbeitet">
            {data.recent.length === 0 ? (
              <p className="text-slate-400 text-sm">Noch keine Kalkulationen vorhanden.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase">
                    <th className="pb-2">Bezeichnung</th>
                    <th className="pb-2">Typ</th>
                    <th className="pb-2">Kunde</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Preis</th>
                    <th className="pb-2 text-right">Datum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recent.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-2">
                        <Link to={`/kalkulationen/${r.id}`} className="text-blue-600 hover:underline font-medium">
                          {r.title || "(ohne Titel)"} <span className="text-slate-400">V{r.version}</span>
                        </Link>
                      </td>
                      <td className="py-2 text-slate-600">{(CALC_TYPE_LABELS as any)[r.calc_type] ?? r.calc_type}</td>
                      <td className="py-2 text-slate-600">{r.customer_name}</td>
                      <td className="py-2">
                        <Badge color={STATUS_COLORS[r.status] ?? ""}>{(STATUS_LABELS as any)[r.status] ?? r.status}</Badge>
                      </td>
                      <td className="py-2 text-right font-medium">{fmtEur(r.sales_total)}</td>
                      <td className="py-2 text-right text-slate-400">{fmtDate(r.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Nach Typ">
            <div className="space-y-2">
              {Object.entries(CALC_TYPE_LABELS).map(([key, label]) => {
                const n = data.byType.find((t) => t.calc_type === key)?.count ?? 0;
                return (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-slate-600">{label}</span>
                    <span className="font-semibold text-slate-800">{n}</span>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card title="Nach Status">
            <div className="space-y-2">
              {Object.entries(STATUS_LABELS).map(([key, label]) => {
                const s = statusOf(key);
                return (
                  <div key={key} className="flex justify-between items-center text-sm">
                    <Badge color={STATUS_COLORS[key] ?? ""}>{label}</Badge>
                    <span className="font-semibold text-slate-800">{s?.count ?? 0}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
