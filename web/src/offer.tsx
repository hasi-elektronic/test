// Gemeinsame Angebots-Bausteine: CI-Farben, Firmendaten, Spezifikation, Logo
import { fmtNum } from "./format";
import type { CalcRow } from "../../shared/types";
import { CALC_TYPE_LABELS } from "../../shared/types";

export const CI = "#1B5E9E";
export const CI_LIGHT = "#EEF4FB";

export const FIRMA = {
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

export const KONDITIONEN = [
  "Alle Preise verstehen sich netto zzgl. der gesetzlichen Mehrwertsteuer.",
  "Lieferung ab Werk, zzgl. Verpackung.",
  "Lieferzeit nach Vereinbarung – abhängig von Materialverfügbarkeit.",
  "Zahlungsbedingungen: 30 Tage netto ohne Abzug.",
  "Dieses Angebot ist freibleibend und 30 Tage gültig.",
];

// Produktbeschreibung automatisch aus der Kalkulation: Typ · Hauptabmessung · Werkstoff(e)
export function produktSpecOf(c: CalcRow): string {
  const parts: string[] = [];
  const typLabel = CALC_TYPE_LABELS[c.calc_type];
  const titel = c.title || typLabel;
  if (titel.toLowerCase() !== typLabel.toLowerCase()) parts.push(typLabel);
  const d = c.data;
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
      if (dim) parts.push(used.length > 1 ? `${dim} u. a.` : dim);
      const werkstoffe = [...new Set(used.map((m) => m.material).filter(Boolean))];
      if (werkstoffe.length) parts.push(werkstoffe.join(", "));
    }
  } else if (d.skMaterials?.length) {
    const teile = d.skMaterials.filter((m) => (m.qty || 0) > 0).length;
    if (teile) parts.push(`${teile} Positionen, komplett gefertigt`);
  }
  return parts.join(" · ");
}

// Marken-Logo als SVG (Fallback, solange kein echtes Logo im R2-Bucket liegt)
export function LogoFallback() {
  const dark = "#1B5E9E";
  const light = "#5B9BD5";
  const gray = "#6B7280";
  return (
    <svg viewBox="0 0 344 84" className="h-20 w-auto" role="img" aria-label="Manfred Sickinger GmbH & Co.KG">
      <rect x="0" y="4" width="36" height="36" rx="4" fill={dark} />
      <text x="18" y="29" textAnchor="middle" fontSize="24" fontWeight="700" fill="#fff" fontFamily="Arial, sans-serif">
        M
      </text>
      <rect x="40" y="4" width="36" height="36" rx="4" fill={light} />
      <g fill="#fff">
        {[...Array(6)].map((_, i) => (
          <ellipse key={i} cx="58" cy="14" rx="2.6" ry="7" transform={`rotate(${i * 60} 58 22)`} />
        ))}
        <circle cx="58" cy="22" r="3.4" fill={light} stroke="#fff" strokeWidth="1.6" />
      </g>
      <rect x="0" y="44" width="36" height="36" rx="4" fill={light} />
      <ellipse cx="18" cy="62" rx="13" ry="8" fill="none" stroke="#fff" strokeWidth="2.4" />
      <ellipse cx="18" cy="62" rx="6" ry="3.6" fill="none" stroke="#fff" strokeWidth="1.6" />
      <rect x="40" y="44" width="36" height="36" rx="4" fill={dark} />
      <text x="58" y="69" textAnchor="middle" fontSize="24" fontWeight="700" fill="#fff" fontFamily="Arial, sans-serif">
        S
      </text>
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

// Kleiner Helfer: aktuelle Anzahl Positionen im Angebotskorb (für Badge)
export function cartChanged() {
  window.dispatchEvent(new Event("cart-changed"));
}
