import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { emptyCalcData } from "../../../shared/calc";
import type { CalcData, CalcType, StepTemplate, MaterialPreset } from "../../../shared/types";

// Stilisierte Produkt-Illustrationen (an die CAD-Modelle angelehnt)
const ICONS: Record<CalcType, JSX.Element> = {
  laufrad: (
    <svg viewBox="0 0 64 64" className="w-16 h-16">
      <circle cx="32" cy="32" r="26" fill="#2e86c1" />
      {[0, 72, 144, 216, 288].map((a) => (
        <path
          key={a}
          d="M32 8 C42 10 47 19 45 28 L37 26 C38 18 35 13 30 11 Z"
          fill="#e67e22"
          transform={`rotate(${a} 32 32)`}
        />
      ))}
      <circle cx="32" cy="32" r="15" fill="none" stroke="#aab7ab" strokeWidth="7" />
      <circle cx="32" cy="32" r="5" fill="#f8fafc" />
    </svg>
  ),
  drueckteile: (
    <svg viewBox="0 0 64 64" className="w-16 h-16">
      <ellipse cx="32" cy="38" rx="26" ry="13" fill="none" stroke="#64748b" strokeWidth="2.5" />
      <ellipse cx="32" cy="27" rx="17" ry="8.5" fill="none" stroke="#64748b" strokeWidth="2.5" />
      <path d="M6 38 Q8 30 15 27 M58 38 Q56 30 49 27" fill="none" stroke="#64748b" strokeWidth="2.5" />
      <ellipse cx="32" cy="25" rx="17" ry="8.5" fill="#eef2f7" stroke="#64748b" strokeWidth="1.5" />
    </svg>
  ),
  baugruppe: (
    <svg viewBox="0 0 64 64" className="w-16 h-16">
      <rect x="20" y="6" width="26" height="7" rx="1.5" fill="#aab7ab" />
      <path d="M12 13 h40 v36 q0 4 -4 4 h-32 q-4 0 -4 -4 z" fill="#6da544" />
      <circle cx="38" cy="33" r="11" fill="#eef2f7" stroke="#4d7c2e" strokeWidth="2" />
      <rect x="16" y="20" width="10" height="14" rx="1" fill="#e67e22" />
      <path d="M10 53 l8 7 M54 53 l-8 7" stroke="#4d7c2e" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
  schallkabine: (
    <svg viewBox="0 0 64 64" className="w-16 h-16">
      <rect x="10" y="12" width="44" height="44" rx="3" fill="#aab7ab" />
      <rect x="14" y="16" width="36" height="36" rx="2" fill="none" stroke="#f8fafc" strokeWidth="1.5" strokeDasharray="4 3" />
      <rect x="36" y="26" width="12" height="26" rx="1" fill="#8a9a8c" stroke="#f8fafc" strokeWidth="1.5" />
      {[22, 27, 32, 37].map((y) => (
        <line key={y} x1="18" y1={y} x2="30" y2={y} stroke="#f8fafc" strokeWidth="2" />
      ))}
    </svg>
  ),
  ventilator: (
    <svg viewBox="0 0 64 64" className="w-16 h-16">
      <rect x="34" y="4" width="16" height="13" fill="#aab7ab" />
      <path d="M30 14 a22 22 0 1 0 0.01 0 M30 14 h20 v8 h-14" fill="#6da544" />
      <circle cx="30" cy="36" r="20" fill="#6da544" />
      <circle cx="30" cy="36" r="10" fill="#e67e22" />
      <circle cx="30" cy="36" r="10" fill="none" stroke="#aab7ab" strokeWidth="4" />
      <rect x="8" y="56" width="44" height="4" rx="1" fill="#64748b" />
      <path d="M16 56 l6 -8 M44 56 l-6 -8" stroke="#4d7c2e" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
};

const TYPES: { type: CalcType; title: string; desc: string }[] = [
  { type: "laufrad", title: "Laufrad", desc: "Fan-Laufräder: Material nach Kg, Arbeitsgänge mit Rüst- & Fertigungszeit, externe Bearbeitung, Versand." },
  { type: "drueckteile", title: "Drückteile", desc: "Drückteile: Drücken, Abschneiden, Abbrennen – gleiche Kalkulationslogik wie Laufrad." },
  { type: "baugruppe", title: "Baugruppe", desc: "Baugruppen / Schweißkonstruktionen: Biegen, Heften, Schweißen, Mechanik." },
  { type: "schallkabine", title: "Schallkabine", desc: "Zuschlagskalkulation: Material nach m²/Kg mit Verschnitt-Zuschlag, stundenbasierte Fertigung, Angebotstext." },
  { type: "ventilator", title: "Ventilator", desc: "Komplette Ventilatoren: alle Bauteile (Gehäuse, Bock, Laufrad, Düse…) mit Verschnitt-Zuschlag, stundenbasierte Fertigung nach Baugruppen." },
];

export default function NewCalcPage() {
  const navigate = useNavigate();

  const create = async (type: CalcType) => {
    const tpl = await api.get<{ steps: StepTemplate[]; presets: MaterialPreset[] }>(`/templates?type=${type}`);
    const data: CalcData = emptyCalcData(type);

    if (type === "schallkabine" || type === "ventilator") {
      data.skWorks = tpl.steps.map((s) => ({ name: s.name, qty: 0, hours: 0, rate: s.rate, group: s.grp || "" }));
      data.skMaterials = tpl.presets.map((p) => ({
        comment: p.comment,
        name: p.name,
        supplier: p.supplier,
        qty: 0,
        amount: 0,
        unitPrice: p.unit_price,
        group: p.grp || "",
      }));
      data.areas = type === "schallkabine" ? Array.from({ length: 4 }, () => ({ label: "", value: 0 })) : [];
    } else {
      // Typische Positionen je Typ vorbelegen (aus den Excel-Originalen)
      // Deckscheibe/Rückwand/Konus/Nabe sind rund (Durchmesser), Drückteile fast immer rund
      const matLabels: Record<string, { label: string; shape: "rund" | "eckig" }[]> = {
        laufrad: [
          { label: "Deckscheibe", shape: "rund" },
          { label: "Rückwand", shape: "rund" },
          { label: "Schaufeln", shape: "eckig" },
          { label: "Konus", shape: "rund" },
          { label: "Nabe", shape: "rund" },
          { label: "", shape: "eckig" },
        ],
        drueckteile: Array.from({ length: 6 }, () => ({ label: "", shape: "rund" as const })),
      };
      const extPresets: Record<string, { name: string; supplier: string }[]> = {
        laufrad: [
          { name: "Beizen", supplier: "Inox" },
          { name: "Glühen", supplier: "Raiser" },
          { name: "WM-Nabe", supplier: "" },
        ],
        baugruppe: [
          { name: "Nabe", supplier: "" },
          { name: "Beizen", supplier: "Inox" },
          { name: "", supplier: "" },
        ],
      };
      data.materials = (
        matLabels[type] ?? Array.from({ length: 6 }, () => ({ label: "", shape: "eckig" as const }))
      ).map((row) => ({
        label: row.label,
        material: "",
        shape: row.shape,
        width: 0,
        height: 0,
        thickness: 0,
        qtyPerPiece: 0,
        pricePerKg: 0,
      }));
      data.works = tpl.steps.map((s) => ({
        name: s.name,
        rate: s.rate,
        qtyPerPiece: 0,
        setupMin: s.setup_min,
        prodMin: 0,
      }));
      data.externals = (extPresets[type] ?? Array.from({ length: 3 }, () => ({ name: "", supplier: "" }))).map(
        (e) => ({ name: e.name, supplier: e.supplier, offerNo: "", price: 0, perPiece: false })
      );
      data.shipping = [
        { kind: "fahrzeug" as const, name: "", unitPrice: 0, qty: 0 },
        { kind: "verpackung" as const, name: "", unitPrice: 0, qty: 0 },
      ];
    }

    const res = await api.post<{ id: number }>("/calculations", {
      calc_type: type,
      title: "",
      status: "entwurf",
      customer_id: null,
      customer_name: "",
      inquiry_no: "",
      drawing_no: "",
      calc_date: new Date().toISOString().slice(0, 10),
      offer_text: "",
      data,
    });
    navigate(`/kalkulationen/${res.id}`);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Neue Kalkulation</h1>
      <p className="text-slate-500 text-sm">Kalkulationstyp wählen – Arbeitsgänge und Stundensätze werden automatisch aus den Vorlagen übernommen.</p>
      <div className="grid sm:grid-cols-2 gap-4">
        {TYPES.map((t) => (
          <button
            key={t.type}
            onClick={() => create(t.type)}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-left hover:border-blue-400 hover:shadow-md transition group"
          >
            <div className="mb-3">{ICONS[t.type]}</div>
            <div className="font-semibold text-slate-800 group-hover:text-blue-600 text-lg">{t.title}</div>
            <div className="text-sm text-slate-500 mt-1">{t.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
