import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { fmtEur, fmtDate, fmtNum } from "../format";
import { Button, Spinner } from "../components/ui";
import type { CalcRow } from "../../../shared/types";
import { CALC_TYPE_LABELS } from "../../../shared/types";

// CI-Farbe Manfred Sickinger
const CI = "#1B5E9E";
const CI_LIGHT = "#EEF4FB";

// Firmenstammdaten für Briefkopf & Fußzeile
const FIRMA = {
  name: "Manfred Sickinger GmbH & Co.KG",
  strasse: "Mönchswiesen 12",
  ort: "71735 Eberdingen",
  tel: "+49 (0) 7042 7098",
  email: "info@apparatebau-sickinger.de",
  web: "www.apparatebau-sickinger.de",
  ust: "USt-IdNr: DE145024838",
  iban: "IBAN: DE71 6045 0050 0030 2488 01",
  reg: "Stuttgart HRA 720254",
  slogan: "DRÜCKTEILE · APPARATEBAU · VENTILATOREN · LASERSCHNEIDEN",
};

const KONDITIONEN = [
  "Alle Preise verstehen sich netto zzgl. der gesetzlichen Mehrwertsteuer.",
  "Lieferung ab Werk, zzgl. Verpackung.",
  "Lieferzeit nach Vereinbarung – abhängig von Materialverfügbarkeit.",
  "Zahlungsbedingungen: 30 Tage netto ohne Abzug.",
  "Dieses Angebot ist freibleibend und 30 Tage gültig.",
];

// Marken-Logo als SVG nachempfunden (MOS-Monogramm + Schriftzug + Slogan),
// Fallback solange kein echtes Logo im R2-Bucket liegt.
function LogoFallback() {
  const dark = "#1B5E9E";
  const light = "#5B9BD5";
  const gray = "#6B7280";
  return (
    <svg viewBox="0 0 344 84" className="h-20 w-auto" role="img" aria-label="Manfred Sickinger GmbH & Co.KG">
      {/* MOS-Monogramm: 2×2 Kacheln */}
      <rect x="0" y="4" width="36" height="36" rx="4" fill={dark} />
      <text x="18" y="29" textAnchor="middle" fontSize="24" fontWeight="700" fill="#fff" fontFamily="Arial, sans-serif">
        M
      </text>
      {/* Lüfterrad-Icon */}
      <rect x="40" y="4" width="36" height="36" rx="4" fill={light} />
      <g fill="#fff">
        {[...Array(6)].map((_, i) => (
          <ellipse key={i} cx="58" cy="14" rx="2.6" ry="7" transform={`rotate(${i * 60} 58 22)`} />
        ))}
        <circle cx="58" cy="22" r="3.4" fill={light} stroke="#fff" strokeWidth="1.6" />
      </g>
      {/* Gedrücktes Ringteil (das „O") */}
      <rect x="0" y="44" width="36" height="36" rx="4" fill={light} />
      <ellipse cx="18" cy="62" rx="13" ry="8" fill="none" stroke="#fff" strokeWidth="2.4" />
      <ellipse cx="18" cy="62" rx="6" ry="3.6" fill="none" stroke="#fff" strokeWidth="1.6" />
      <rect x="40" y="44" width="36" height="36" rx="4" fill={dark} />
      <text x="58" y="69" textAnchor="middle" fontSize="24" fontWeight="700" fill="#fff" fontFamily="Arial, sans-serif">
        S
      </text>

      {/* Schriftzug */}
      <text x="90" y="35" fontSize="27" fontWeight="700" fill={gray} fontFamily="Arial, sans-serif">
        Manfred Sickinger
      </text>
      <text x="91" y="55" fontSize="15" fontWeight="600" fill="#9CA3AF" fontFamily="Arial, sans-serif">
        GmbH &amp; Co.KG
      </text>
      <text x="92" y="72" fontSize="7.6" fontWeight="600" fill={dark} letterSpacing="0.4" fontFamily="Arial, sans-serif">
        DRÜCKTEILE · APPARATEBAU · VENTILATOREN · LASERSCHNEIDEN
      </text>
    </svg>
  );
}

export default function OfferPrintPage() {
  const { id } = useParams();
  const [calc, setCalc] = useState<CalcRow | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [logoOk, setLogoOk] = useState(true);

  useEffect(() => {
    Promise.all([api.get<CalcRow>(`/calculations/${id}`), api.get<Record<string, string>>("/settings")]).then(
      ([c, s]) => {
        setCalc(c);
        setSettings(s);
      }
    );
  }, [id]);

  if (!calc) return <Spinner />;

  const titel = calc.title || CALC_TYPE_LABELS[calc.calc_type];
  const jahr = (calc.calc_date || "").slice(0, 4) || String(new Date().getFullYear());
  const angebotNr = `${jahr}-${String(calc.id).padStart(4, "0")}`;
  const qty = calc.data.batchQty || 1;

  // Optionaler Angebotstext des Kalkulators (Vorlage mit Platzhaltern)
  const freitext = (calc.offer_text?.trim()
    ? calc.offer_text
    : (settings.offer_template || "")
        .replace("{titel}", titel)
        .replace("{preis}", fmtEur(calc.sales_unit))
  ).trim();

  // Produktbeschreibung automatisch aus der Kalkulation: Typ · Hauptabmessung · Werkstoff(e)
  const specParts: string[] = [];
  const typLabel = CALC_TYPE_LABELS[calc.calc_type];
  if (titel.toLowerCase() !== typLabel.toLowerCase()) specParts.push(typLabel);

  const d = calc.data;
  const matDim = (m: { shape?: string; width: number; height: number; thickness: number }) => {
    const dicke = m.thickness ? ` × ${fmtNum(m.thickness)} mm` : "";
    if (m.shape === "rund") return m.width ? `Ø ${fmtNum(m.width)}${dicke}` : "";
    return m.width && m.height ? `${fmtNum(m.width)} × ${fmtNum(m.height)}${dicke}` : "";
  };
  if (d.materials?.length) {
    const used = d.materials.filter((m) => m.material || m.width || m.thickness);
    if (used.length) {
      const haupt = used.reduce((a, b) => ((b.width || 0) > (a.width || 0) ? b : a));
      const dim = matDim(haupt);
      if (dim) specParts.push(used.length > 1 ? `${dim} u. a.` : dim);
      const werkstoffe = [...new Set(used.map((m) => m.material).filter(Boolean))];
      if (werkstoffe.length) specParts.push(werkstoffe.join(", "));
    }
  } else if (d.skMaterials?.length) {
    const teile = d.skMaterials.filter((m) => (m.qty || 0) > 0).length;
    if (teile) specParts.push(`${teile} Positionen, komplett gefertigt`);
  }
  const produktSpec = specParts.join(" · ");

  // Positionstabelle (eine Position je Kalkulation)
  const positionen = [
    {
      nr: 1,
      bezeichnung: titel,
      spec: produktSpec,
      detail: calc.drawing_no ? `Zeichnung ${calc.drawing_no}` : "",
      menge: `${qty} Stück`,
      einzel: calc.sales_unit,
      gesamt: calc.sales_total,
    },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="no-print flex justify-between items-center mb-4">
        <Link to={`/kalkulationen/${calc.id}`} className="text-blue-600 hover:underline text-sm">
          ← Zurück zur Kalkulation
        </Link>
        <Button onClick={() => window.print()}>🖨 Drucken / Als PDF speichern</Button>
      </div>

      <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-10 print:shadow-none print:border-0 print:rounded-none print:p-0 flex flex-col print:min-h-[247mm]">
        {/* Briefkopf: Logo oben rechts */}
        <div className="flex justify-between items-start mb-8">
          <div className="text-[11px] text-slate-500 leading-snug pt-2">
            <div className="font-semibold text-slate-700">{FIRMA.name}</div>
            <div>{FIRMA.strasse}</div>
            <div>{FIRMA.ort}</div>
          </div>
          <div className="shrink-0">
            {logoOk ? (
              <img
                src="/api/logo"
                alt="Manfred Sickinger GmbH & Co.KG"
                onError={() => setLogoOk(false)}
                className="h-20 w-auto object-contain"
              />
            ) : (
              <LogoFallback />
            )}
          </div>
        </div>

        {/* Empfänger + Angebotsdaten */}
        <div className="flex justify-between items-start gap-8 mb-8">
          <div className="text-sm text-slate-800">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">An</div>
            <div className="font-semibold">{calc.customer_name || "—"}</div>
          </div>
          <table className="text-sm text-slate-700">
            <tbody>
              <tr>
                <td className="pr-4 text-slate-400">Angebot-Nr.</td>
                <td className="font-medium text-right">{angebotNr}</td>
              </tr>
              <tr>
                <td className="pr-4 text-slate-400">Datum</td>
                <td className="font-medium text-right">{fmtDate(calc.calc_date)}</td>
              </tr>
              {calc.inquiry_no && (
                <tr>
                  <td className="pr-4 text-slate-400">Ihre Anfrage</td>
                  <td className="font-medium text-right">{calc.inquiry_no}</td>
                </tr>
              )}
              {calc.drawing_no && (
                <tr>
                  <td className="pr-4 text-slate-400">Zeichnung</td>
                  <td className="font-medium text-right">{calc.drawing_no}</td>
                </tr>
              )}
              {calc.sachbearbeiter && (
                <tr>
                  <td className="pr-4 text-slate-400">Sachbearbeiter</td>
                  <td className="font-medium text-right">{calc.sachbearbeiter}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Blaue CI-Überschrift */}
        <div
          className="text-white font-bold text-base px-4 py-2 rounded-sm mb-5"
          style={{ backgroundColor: CI }}
        >
          Angebot Nr. {angebotNr} – {titel}
        </div>

        {/* Anrede + Einleitung */}
        <div className="text-sm text-slate-700 leading-relaxed mb-4">
          <p className="mb-2">Sehr geehrte Damen und Herren,</p>
          <p>
            vielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen hierfür das folgende Angebot:
          </p>
        </div>

        {freitext && (
          <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed mb-5">{freitext}</div>
        )}

        {/* Preistabelle mit blauem Kopf und Zebra-Zeilen */}
        <table className="w-full text-sm mb-2">
          <thead>
            <tr className="text-white" style={{ backgroundColor: CI }}>
              <th className="text-left font-semibold px-3 py-2 w-10">Pos.</th>
              <th className="text-left font-semibold px-3 py-2">Bezeichnung</th>
              <th className="text-right font-semibold px-3 py-2">Menge</th>
              <th className="text-right font-semibold px-3 py-2">Einzelpreis</th>
              <th className="text-right font-semibold px-3 py-2">Gesamtpreis</th>
            </tr>
          </thead>
          <tbody>
            {positionen.map((p, i) => (
              <tr key={p.nr} style={{ backgroundColor: i % 2 === 1 ? CI_LIGHT : "white" }}>
                <td className="px-3 py-2.5 align-top text-slate-500">{p.nr}</td>
                <td className="px-3 py-2.5 align-top">
                  <div className="font-medium text-slate-800">{p.bezeichnung}</div>
                  {p.spec && <div className="text-xs text-slate-500">{p.spec}</div>}
                  {p.detail && <div className="text-xs text-slate-400">{p.detail}</div>}
                </td>
                <td className="px-3 py-2.5 align-top text-right whitespace-nowrap">{p.menge}</td>
                <td className="px-3 py-2.5 align-top text-right whitespace-nowrap">{fmtEur(p.einzel)}</td>
                <td className="px-3 py-2.5 align-top text-right font-medium whitespace-nowrap">{fmtEur(p.gesamt)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Angebotssumme */}
        <div className="flex justify-end mb-6">
          <div className="w-64 text-sm">
            <div className="flex justify-between border-t-2 px-3 py-2 font-bold" style={{ borderColor: CI }}>
              <span>Angebotssumme netto</span>
              <span>{fmtEur(calc.sales_total)}</span>
            </div>
          </div>
        </div>

        {/* Konditionen */}
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: CI }}>
            Konditionen
          </div>
          <ul className="text-sm text-slate-700 space-y-1">
            {KONDITIONEN.map((k, i) => (
              <li key={i} className="flex gap-2">
                <span style={{ color: CI }}>•</span>
                <span>{k}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Schlusswort */}
        <div className="text-sm text-slate-700 leading-relaxed mb-2">
          <p className="mb-3">
            Wir würden uns freuen, Ihren Auftrag zu erhalten, und stehen für Rückfragen jederzeit gerne zur
            Verfügung.
          </p>
          <p>Mit freundlichen Grüßen</p>
          <p className="font-semibold text-slate-800 mt-1">{FIRMA.name}</p>
        </div>

        {/* Zentrierte 3-zeilige Fußzeile am Seitenende */}
        <div className="mt-auto pt-6">
          <div
            className="border-t-2 pt-3 text-center text-[10px] leading-relaxed text-slate-500"
            style={{ borderColor: CI }}
          >
            <div className="font-semibold" style={{ color: CI }}>
              {FIRMA.name} · {FIRMA.strasse} · {FIRMA.ort}
            </div>
            <div>
              Tel: {FIRMA.tel} · {FIRMA.email} · {FIRMA.web}
            </div>
            <div>
              {FIRMA.ust} · {FIRMA.iban} · {FIRMA.reg}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
