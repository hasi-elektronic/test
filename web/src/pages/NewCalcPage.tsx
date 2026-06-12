import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { emptyCalcData } from "../../../shared/calc";
import type { CalcData, CalcType, StepTemplate, MaterialPreset } from "../../../shared/types";

const TYPES: { type: CalcType; icon: string; title: string; desc: string }[] = [
  { type: "laufrad", icon: "🌀", title: "Laufrad", desc: "Fan-Laufräder: Material nach Kg, Arbeitsgänge mit Rüst- & Fertigungszeit, externe Bearbeitung, Versand." },
  { type: "drueckteile", icon: "⚙️", title: "Drückteile", desc: "Drückteile: Drücken, Abschneiden, Abbrennen – gleiche Kalkulationslogik wie Laufrad." },
  { type: "baugruppe", icon: "🔩", title: "Baugruppe", desc: "Baugruppen / Schweißkonstruktionen: Biegen, Heften, Schweißen, Mechanik." },
  { type: "schallkabine", icon: "🔇", title: "Schallkabine", desc: "Zuschlagskalkulation: Material nach m²/Kg mit Verschnitt-Zuschlag, stundenbasierte Fertigung, Angebotstext." },
  { type: "ventilator", icon: "💨", title: "Ventilator", desc: "Komplette Ventilatoren: alle Bauteile (Gehäuse, Bock, Laufrad, Düse…) mit Verschnitt-Zuschlag, stundenbasierte Fertigung nach Baugruppen." },
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
      data.materials = Array.from({ length: 6 }, () => ({
        label: "",
        material: "",
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
      data.externals = Array.from({ length: 3 }, () => ({ name: "", supplier: "", offerNo: "", price: 0, perPiece: false }));
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
            <div className="text-3xl mb-2">{t.icon}</div>
            <div className="font-semibold text-slate-800 group-hover:text-blue-600 text-lg">{t.title}</div>
            <div className="text-sm text-slate-500 mt-1">{t.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
