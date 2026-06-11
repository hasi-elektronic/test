import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { fmtEur, fmtDate } from "../format";
import { Button, Spinner } from "../components/ui";
import type { CalcRow } from "../../../shared/types";
import { CALC_TYPE_LABELS } from "../../../shared/types";

export default function OfferPrintPage() {
  const { id } = useParams();
  const [calc, setCalc] = useState<CalcRow | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([api.get<CalcRow>(`/calculations/${id}`), api.get<Record<string, string>>("/settings")]).then(
      ([c, s]) => {
        setCalc(c);
        setSettings(s);
      }
    );
  }, [id]);

  if (!calc) return <Spinner />;

  const defaultText = (settings.offer_template || "")
    .replace("{titel}", calc.title || CALC_TYPE_LABELS[calc.calc_type])
    .replace("{preis}", fmtEur(calc.sales_unit));
  const text = calc.offer_text?.trim() ? calc.offer_text : defaultText;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="no-print flex justify-between items-center mb-4">
        <Link to={`/kalkulationen/${calc.id}`} className="text-blue-600 hover:underline text-sm">
          ← Zurück zur Kalkulation
        </Link>
        <Button onClick={() => window.print()}>🖨 Drucken / Als PDF speichern</Button>
      </div>

      <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-10 print:shadow-none print:border-0 print:rounded-none print:p-0">
        {/* Briefkopf */}
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-8">
          <div>
            <div className="text-2xl font-bold text-slate-900">{settings.company_name || "Sickinger GmbH"}</div>
            {settings.company_address && (
              <div className="text-sm text-slate-500 whitespace-pre-line">{settings.company_address}</div>
            )}
          </div>
          <div className="text-right text-sm text-slate-500">
            {settings.company_contact && <div className="whitespace-pre-line">{settings.company_contact}</div>}
            <div className="mt-1">{fmtDate(calc.calc_date)}</div>
          </div>
        </div>

        {/* Betreff */}
        <h1 className="text-lg font-bold text-slate-900 mb-1">
          Angebot – {calc.title || CALC_TYPE_LABELS[calc.calc_type]}
        </h1>
        <div className="text-sm text-slate-500 mb-6 space-x-3">
          {calc.customer_name && <span>Kunde: {calc.customer_name}</span>}
          {calc.inquiry_no && <span>Ihre Anfrage: {calc.inquiry_no}</span>}
          {calc.drawing_no && <span>Zeichnung: {calc.drawing_no}</span>}
        </div>

        {/* Angebotstext */}
        <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed mb-8">{text}</div>

        {/* Preistabelle */}
        <table className="w-full text-sm border-t border-b border-slate-300 mb-8">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-400">
              <th className="py-2">Position</th>
              <th className="py-2 text-right">Menge</th>
              <th className="py-2 text-right">Einzelpreis</th>
              <th className="py-2 text-right">Gesamtpreis</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-200">
              <td className="py-3 font-medium text-slate-800">
                {calc.title || CALC_TYPE_LABELS[calc.calc_type]}
                {calc.drawing_no && <span className="text-slate-400 font-normal"> · Zeichnung {calc.drawing_no}</span>}
              </td>
              <td className="py-3 text-right">{calc.data.batchQty || 1} Stück</td>
              <td className="py-3 text-right">{fmtEur(calc.sales_unit)}</td>
              <td className="py-3 text-right font-bold">{fmtEur(calc.sales_total)}</td>
            </tr>
          </tbody>
        </table>

        <p className="text-sm text-slate-600 mb-6">
          Alle Preise zzgl. gesetzlicher Mehrwertsteuer, zzgl. Verpackung und ab Werk.
        </p>

        {settings.offer_footer && (
          <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{settings.offer_footer}</div>
        )}
      </div>
    </div>
  );
}
