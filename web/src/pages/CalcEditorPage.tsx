import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { calculate } from "../../../shared/calc";
import type {
  CalcData,
  CalcRow,
  Customer,
  ExternalItem,
  Material,
  MaterialItem,
  Sachbearbeiter,
  ShippingItem,
  ShippingMaster,
  SkMaterialItem,
  SkWorkItem,
  WorkItem,
} from "../../../shared/types";
import { CALC_TYPE_LABELS, STATUS_LABELS } from "../../../shared/types";
import { fmtDate, fmtEur, fmtNum } from "../format";
import { Button, Card, Field, NumInput, Select, Spinner, TextInput } from "../components/ui";

function SectionSum({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <span className="font-bold text-slate-800">{fmtEur(value)}</span>
    </div>
  );
}

// Checkbox im Karten-Kopf: nur Positionen mit Werten anzeigen
function UsedFilter({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer whitespace-nowrap font-normal">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="accent-blue-600" />
      nur verwendete
    </label>
  );
}

const isUsed = {
  material: (m: MaterialItem) =>
    !!(m.label || m.material || m.width || m.height || m.thickness || m.qtyPerPiece || m.pricePerKg),
  work: (w: WorkItem) => (w.qtyPerPiece || 0) > 0 || (w.prodMin || 0) > 0,
  external: (e: ExternalItem) => !!(e.name || e.supplier || e.price),
  shipping: (s: ShippingItem) => !!(s.name || s.unitPrice || s.qty),
  skMaterial: (m: SkMaterialItem) => (m.qty || 0) > 0,
  skWork: (w: SkWorkItem) => (w.qty || 0) > 0 || (w.hours || 0) > 0,
};

// Zeitauswahl in 15-Minuten-Schritten (+ 5/10 min für kurze Rüstzeiten)
const MINUTE_STEPS = [0, 5, 10, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 210, 240, 270, 300, 330, 360, 420, 480, 540, 600];

function minuteLabel(m: number): string {
  if (m === 0) return "–";
  if (m < 60) return `${m} min`;
  return `${m} min (${fmtNum(m / 60)} h)`;
}

function MinutesSelect({ value, onValue }: { value: number; onValue: (v: number) => void }) {
  const opts = MINUTE_STEPS.includes(value) ? MINUTE_STEPS : [...MINUTE_STEPS, value].sort((a, b) => a - b);
  return (
    <Select value={value} onChange={(e) => onValue(Number(e.target.value))}>
      {opts.map((m) => (
        <option key={m} value={m}>{minuteLabel(m)}</option>
      ))}
    </Select>
  );
}

const th = "text-left text-xs text-slate-400 uppercase font-medium px-2 py-1.5";
const thR = "text-right text-xs text-slate-400 uppercase font-medium px-2 py-1.5";
const td = "px-1 py-1";
const tdOut = "px-2 py-1 text-right text-sm text-slate-700 whitespace-nowrap";
const usedRow = "bg-blue-50/50";

function RowButtons({ onCopy, onRemove }: { onCopy?: () => void; onRemove: () => void }) {
  return (
    <div className="flex items-center whitespace-nowrap">
      {onCopy && (
        <button onClick={onCopy} title="Zeile duplizieren" className="text-slate-300 hover:text-blue-600 px-0.5">
          ⧉
        </button>
      )}
      <button onClick={onRemove} title="Zeile löschen" className="text-slate-300 hover:text-red-500 px-0.5">
        ×
      </button>
    </div>
  );
}

export default function CalcEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [calc, setCalc] = useState<CalcRow | null>(null);
  const [data, setData] = useState<CalcData | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [shipMaster, setShipMaster] = useState<ShippingMaster[]>([]);
  const [bearbeiter, setBearbeiter] = useState<Sachbearbeiter[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");

  // "nur verwendete"-Filter je Tabelle
  const [hideMat, setHideMat] = useState(false);
  const [hideWorks, setHideWorks] = useState(false);
  const [hideExt, setHideExt] = useState(false);
  const [hideShip, setHideShip] = useState(false);
  const [hideSkMat, setHideSkMat] = useState(false);
  const [hideSkWorks, setHideSkWorks] = useState(false);

  const firstLoad = useRef(true);

  useEffect(() => {
    firstLoad.current = true;
    Promise.all([
      api.get<CalcRow>(`/calculations/${id}`),
      api.get<Material[]>("/materials"),
      api.get<Customer[]>("/customers"),
      api.get<ShippingMaster[]>("/shipping_items"),
      api.get<Sachbearbeiter[]>("/sachbearbeiter"),
    ]).then(([c, m, cu, sh, sb]) => {
      setCalc(c);
      setData(c.data);
      setMaterials(m.filter((x) => x.active));
      setCustomers(cu);
      setShipMaster(sh);
      setBearbeiter(sb);
      // Bei bestehenden Kalkulationen lange Vorlagen-Listen automatisch filtern
      setHideWorks((c.data.works ?? []).some(isUsed.work));
      setHideSkWorks((c.data.skWorks ?? []).some(isUsed.skWork));
      setHideSkMat((c.data.skMaterials ?? []).some(isUsed.skMaterial));
    });
  }, [id]);

  const densities = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of materials) map[m.name] = m.density;
    return map;
  }, [materials]);

  const result = useMemo(() => (data ? calculate(data, densities) : null), [data, densities]);

  // Strg+S speichert
  const saveRef = useRef<() => void>(() => {});
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Warnung beim Verlassen mit ungespeicherten Änderungen
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  // Autosave: 2,5s nach der letzten Änderung
  const payloadKey = useMemo(
    () =>
      calc && data
        ? JSON.stringify([
            calc.title, calc.status, calc.customer_id, calc.customer_name,
            calc.inquiry_no, calc.drawing_no, calc.calc_date, calc.offer_text, data,
          ])
        : "",
    [calc, data]
  );
  useEffect(() => {
    if (!payloadKey) return;
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    setDirty(true);
    const t = setTimeout(() => saveRef.current(), 2500);
    return () => clearTimeout(t);
  }, [payloadKey]);

  if (!calc || !data || !result) return <Spinner />;

  const upd = (patch: Partial<CalcData>) => setData({ ...data, ...patch });
  const updCalc = (patch: Partial<CalcRow>) => setCalc({ ...calc, ...patch });

  const updateRow = <K extends keyof CalcData>(key: K, index: number, patch: object) => {
    const arr = [...(data[key] as any[])];
    arr[index] = { ...arr[index], ...patch };
    upd({ [key]: arr } as any);
  };
  const addRow = <K extends keyof CalcData>(key: K, row: object) =>
    upd({ [key]: [...(data[key] as any[]), row] } as any);
  const removeRow = <K extends keyof CalcData>(key: K, index: number) =>
    upd({ [key]: (data[key] as any[]).filter((_, i) => i !== index) } as any);
  const duplicateRow = <K extends keyof CalcData>(key: K, index: number) => {
    const arr = [...(data[key] as any[])];
    arr.splice(index + 1, 0, { ...arr[index] });
    upd({ [key]: arr } as any);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await api.put(`/calculations/${calc.id}`, {
        calc_type: calc.calc_type,
        title: calc.title,
        status: calc.status,
        customer_id: calc.customer_id,
        customer_name: calc.customer_name,
        inquiry_no: calc.inquiry_no,
        drawing_no: calc.drawing_no,
        calc_date: calc.calc_date,
        sachbearbeiter: calc.sachbearbeiter,
        offer_text: calc.offer_text,
        data,
      });
      setSavedAt(new Date());
      setDirty(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  saveRef.current = save;

  // Excel-ähnliche Eingabe: Enter springt zum nächsten Feld, Shift+Enter zurück
  const handleEnterNav = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter") return;
    const t = e.target as HTMLElement;
    if (t.tagName !== "INPUT" && t.tagName !== "SELECT") return;
    e.preventDefault();
    const els = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>('input:not([type="checkbox"]), select')
    );
    const next = els[els.indexOf(t) + (e.shiftKey ? -1 : 1)];
    if (next) {
      next.focus();
      if (next instanceof HTMLInputElement) next.select();
    }
  };

  const copyVersion = async () => {
    await save();
    const res = await api.post<{ id: number }>(`/calculations/${calc.id}/copy`);
    navigate(`/kalkulationen/${res.id}`);
    window.location.reload();
  };

  const deleteCalc = async () => {
    if (!confirm(`Kalkulation "${calc.title || "ohne Titel"}" (V${calc.version}) wirklich löschen?`)) return;
    setError("");
    try {
      await api.delete(`/calculations/${calc.id}`);
      setDirty(false);
      navigate("/kalkulationen");
    } catch (e: any) {
      setError(e.message);
    }
  };

  const isSk = data.type === "schallkabine" || data.type === "ventilator";

  // Preis-Warnungen für den Sachbearbeiter: fehlende, veraltete oder stark abweichende Materialpreise
  const STALE_DAYS = 90;
  const priceWarnings: string[] = [];
  if (!isSk) {
    const byName: Record<string, Material> = {};
    for (const m of materials) byName[m.name] = m;
    data.materials.forEach((row, idx) => {
      if (!row.material) return;
      const master = byName[row.material];
      if (!master) return;
      const pos = `Pos. ${idx + 1} (${row.material})`;
      if (!master.price_per_kg) {
        priceWarnings.push(`${pos}: kein Preis/Kg in den Stammdaten gepflegt – Preis bitte prüfen.`);
        return;
      }
      if (master.price_updated_at) {
        const age = (Date.now() - new Date(master.price_updated_at.replace(" ", "T")).getTime()) / 86_400_000;
        if (age > STALE_DAYS) {
          priceWarnings.push(
            `${pos}: Stammdaten-Preis zuletzt am ${fmtDate(master.price_updated_at)} aktualisiert (älter als ${STALE_DAYS} Tage) – bitte aktualisieren.`
          );
        }
      } else {
        priceWarnings.push(`${pos}: Stammdaten-Preis ohne Aktualisierungsdatum – bitte prüfen.`);
      }
      if (row.pricePerKg > 0 && Math.abs(row.pricePerKg - master.price_per_kg) / master.price_per_kg > 0.3) {
        priceWarnings.push(
          `${pos}: eingetragener Preis ${fmtEur(row.pricePerKg)}/kg weicht stark vom Stammdaten-Preis ${fmtEur(master.price_per_kg)}/kg ab.`
        );
      }
    });
  }

  // Gefilterte Sichten mit Original-Index
  const matRows = data.materials.map((m, i) => ({ m, i })).filter(({ m }) => !hideMat || isUsed.material(m));
  const workRows = data.works.map((w, i) => ({ w, i })).filter(({ w }) => !hideWorks || isUsed.work(w));
  const extRows = data.externals.map((e, i) => ({ e, i })).filter(({ e }) => !hideExt || isUsed.external(e));
  const shipRows = data.shipping.map((s, i) => ({ s, i })).filter(({ s }) => !hideShip || isUsed.shipping(s));
  const skMatRows = data.skMaterials.map((m, i) => ({ m, i })).filter(({ m }) => !hideSkMat || isUsed.skMaterial(m));
  const skWorkRows = data.skWorks.map((w, i) => ({ w, i })).filter(({ w }) => !hideSkWorks || isUsed.skWork(w));

  const saveState = saving ? (
    <span className="text-xs text-slate-400">Speichert…</span>
  ) : dirty ? (
    <span className="text-xs text-amber-600">● ungespeichert</span>
  ) : savedAt ? (
    <span className="text-xs text-green-600">✓ Gespeichert {savedAt.toLocaleTimeString("de-DE")}</span>
  ) : null;

  return (
    <div className="max-w-7xl space-y-5" onKeyDown={handleEnterNav}>
      {/* Kopfzeile */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <div className="text-xs text-slate-400">
            <Link to="/kalkulationen" className="hover:underline">Kalkulationen</Link> / {CALC_TYPE_LABELS[calc.calc_type]}
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            {calc.title || "Neue Kalkulation"} <span className="text-slate-400 font-normal">V{calc.version}</span>
          </h1>
          <div className="text-xs text-slate-400 mt-0.5">⏎ Enter = nächstes Feld · Shift+⏎ = zurück · Strg+S = Speichern · Änderungen werden automatisch gespeichert</div>
        </div>
        <div className="flex items-center gap-2">
          {saveState}
          {error && <span className="text-xs text-red-600">{error}</span>}
          <Button variant="secondary" onClick={deleteCalc} className="!text-red-600 hover:!bg-red-50">
            🗑 Löschen
          </Button>
          <Button variant="secondary" onClick={copyVersion}>⧉ Neue Version</Button>
          <Link
            to={`/kalkulationen/${calc.id}/angebot`}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300"
          >
            📄 Angebot
          </Link>
          <Button onClick={save} disabled={saving}>{saving ? "Speichern…" : "💾 Speichern"}</Button>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_320px] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          {/* Stammdaten der Kalkulation */}
          <Card title="Projektdaten" collapsible>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Field label="Bezeichnung / Titel">
                <TextInput value={calc.title} onChange={(e) => updCalc({ title: e.target.value })} />
              </Field>
              <Field label="Kunde">
                <Select
                  value={calc.customer_id ?? ""}
                  onChange={(e) => {
                    const cid = e.target.value ? Number(e.target.value) : null;
                    const cu = customers.find((x) => x.id === cid);
                    updCalc({ customer_id: cid, customer_name: cu?.name ?? "" });
                  }}
                >
                  <option value="">– wählen –</option>
                  {customers.map((cu) => (
                    <option key={cu.id} value={cu.id}>{cu.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select value={calc.status} onChange={(e) => updCalc({ status: e.target.value as any })}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Kunden Anfrage Nr.">
                <TextInput value={calc.inquiry_no} onChange={(e) => updCalc({ inquiry_no: e.target.value })} />
              </Field>
              <Field label="Zeichnungsnummer">
                <TextInput value={calc.drawing_no} onChange={(e) => updCalc({ drawing_no: e.target.value })} />
              </Field>
              <Field label="Datum">
                <TextInput type="date" value={calc.calc_date} onChange={(e) => updCalc({ calc_date: e.target.value })} />
              </Field>
              <Field label="Sachbearbeiter">
                <Select value={calc.sachbearbeiter ?? ""} onChange={(e) => updCalc({ sachbearbeiter: e.target.value })}>
                  <option value="">– wählen –</option>
                  {bearbeiter.map((b) => (
                    <option key={b.id} value={b.kuerzel || b.name}>
                      {b.name} {b.kuerzel && `(${b.kuerzel})`}
                    </option>
                  ))}
                </Select>
              </Field>
              {!isSk && (
                <Field label="Kalkulationsstückzahl">
                  <NumInput value={data.batchQty} onValue={(v) => upd({ batchQty: v })} />
                </Field>
              )}
            </div>
            {calc.customer_id && customers.find((x) => x.id === calc.customer_id)?.special_terms && (
              <div className="mt-3 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
                ⚠ Sondervereinbarung: {customers.find((x) => x.id === calc.customer_id)!.special_terms}
              </div>
            )}
          </Card>

          {!isSk ? (
            <>
              {/* Material (Blech) */}
              <Card
                title="Material (Blech)"
                collapsible
                summary={fmtEur(result.materialSum)}
                right={<UsedFilter value={hideMat} onChange={setHideMat} />}
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[840px]">
                    <thead>
                      <tr>
                        <th className={th}>Was</th>
                        <th className={th}>Material</th>
                        <th className={thR}>Breite mm</th>
                        <th className={thR}>Höhe mm</th>
                        <th className={thR}>Dicke mm</th>
                        <th className={thR}>St./Stück</th>
                        <th className={thR}>Kg</th>
                        <th className={thR}>Preis/Kg</th>
                        <th className={thR}>Preis</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {matRows.map(({ m, i }) => (
                        <tr key={i} className={isUsed.material(m) ? usedRow : undefined}>
                          <td className={`${td} w-36`}>
                            <TextInput value={m.label} onChange={(e) => updateRow("materials", i, { label: e.target.value })} />
                          </td>
                          <td className={`${td} w-44`}>
                            <Select
                              value={m.material}
                              onChange={(e) => {
                                const mat = materials.find((x) => x.name === e.target.value);
                                updateRow("materials", i, {
                                  material: e.target.value,
                                  pricePerKg: mat && mat.price_per_kg > 0 ? mat.price_per_kg : m.pricePerKg,
                                  ...(e.target.value && !m.qtyPerPiece ? { qtyPerPiece: 1 } : {}),
                                });
                              }}
                            >
                              <option value="">–</option>
                              {materials.map((mat) => (
                                <option key={mat.id} value={mat.name}>{mat.name}</option>
                              ))}
                            </Select>
                          </td>
                          <td className={`${td} w-20`}><NumInput value={m.width} onValue={(v) => updateRow("materials", i, { width: v })} /></td>
                          <td className={`${td} w-20`}><NumInput value={m.height} onValue={(v) => updateRow("materials", i, { height: v })} /></td>
                          <td className={`${td} w-16`}><NumInput value={m.thickness} onValue={(v) => updateRow("materials", i, { thickness: v })} /></td>
                          <td className={`${td} w-16`}><NumInput value={m.qtyPerPiece} onValue={(v) => updateRow("materials", i, { qtyPerPiece: v })} /></td>
                          <td className={tdOut}>{fmtNum(result.materialWeights[i])}</td>
                          <td className={`${td} w-20`}><NumInput value={m.pricePerKg} onValue={(v) => updateRow("materials", i, { pricePerKg: v })} /></td>
                          <td className={`${tdOut} font-medium`}>{fmtEur(result.materialPrices[i])}</td>
                          <td className={td}>
                            <RowButtons onCopy={() => duplicateRow("materials", i)} onRemove={() => removeRow("materials", i)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setHideMat(false);
                    addRow("materials", { label: "", material: "", width: 0, height: 0, thickness: 0, qtyPerPiece: 0, pricePerKg: 0 });
                  }}
                >
                  + Zeile
                </Button>
                {priceWarnings.length > 0 && (
                  <div className="mt-3 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 space-y-1">
                    {priceWarnings.map((w, i) => (
                      <div key={i}>⚠ {w}</div>
                    ))}
                  </div>
                )}
                <div className="grid sm:grid-cols-3 gap-3 mt-3">
                  <Field label="Gesamtgewicht (Kg)">
                    <div className="px-2.5 py-1.5 text-sm text-slate-600">{fmtNum(result.totalWeight)} kg</div>
                  </Field>
                  <Field label="Sonstiges Kleinmaterial (€)">
                    <NumInput value={data.smallMaterial} onValue={(v) => upd({ smallMaterial: v })} />
                  </Field>
                  <Field label="Materialzuschlagssatz (%)">
                    <NumInput value={data.materialSurcharge * 100} onValue={(v) => upd({ materialSurcharge: v / 100 })} />
                  </Field>
                </div>
                <SectionSum label="Summe Materialkosten" value={result.materialSum} />
              </Card>

              {/* Arbeitszeit */}
              <Card
                title="Arbeitszeit / Fertigung"
                collapsible
                summary={fmtEur(result.prodSum)}
                right={<UsedFilter value={hideWorks} onChange={setHideWorks} />}
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px]">
                    <thead>
                      <tr>
                        <th className={th}>Arbeitsgang</th>
                        <th className={thR}>Satz €/h</th>
                        <th className={thR}>St./Stück</th>
                        <th className={thR}>Gesamt St.</th>
                        <th className={thR}>Rüsten min</th>
                        <th className={thR}>Fertigung min</th>
                        <th className={thR}>Preis</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {workRows.map(({ w, i }) => (
                        <tr key={i} className={isUsed.work(w) ? usedRow : undefined}>
                          <td className={`${td} w-56`}>
                            <TextInput value={w.name} onChange={(e) => updateRow("works", i, { name: e.target.value })} />
                          </td>
                          <td className={`${td} w-20`}><NumInput value={w.rate} onValue={(v) => updateRow("works", i, { rate: v })} /></td>
                          <td className={`${td} w-20`}><NumInput value={w.qtyPerPiece} onValue={(v) => updateRow("works", i, { qtyPerPiece: v })} /></td>
                          <td className={tdOut}>{fmtNum((w.qtyPerPiece || 0) * (data.batchQty || 0))}</td>
                          <td className={`${td} w-28`}>
                            <MinutesSelect
                              value={w.setupMin}
                              onValue={(v) =>
                                updateRow("works", i, { setupMin: v, ...(v > 0 && !w.qtyPerPiece ? { qtyPerPiece: 1 } : {}) })
                              }
                            />
                          </td>
                          <td className={`${td} w-32`}>
                            <MinutesSelect
                              value={w.prodMin}
                              onValue={(v) =>
                                updateRow("works", i, { prodMin: v, ...(v > 0 && !w.qtyPerPiece ? { qtyPerPiece: 1 } : {}) })
                              }
                            />
                          </td>
                          <td
                            className={`${tdOut} font-medium`}
                            title={result.workPrices[i] > 0 ? undefined : "Zählt erst, wenn St./Stück > 0 eingetragen ist"}
                          >
                            {result.workPrices[i] > 0 ? fmtEur(result.workPrices[i]) : "–"}
                          </td>
                          <td className={td}>
                            <RowButtons onRemove={() => removeRow("works", i)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {hideWorks && workRows.length < data.works.length && (
                  <p className="text-xs text-slate-400 mt-1">{data.works.length - workRows.length} leere Arbeitsgänge ausgeblendet – Haken oben entfernen zum Anzeigen.</p>
                )}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setHideWorks(false);
                    addRow("works", { name: "", rate: 58, qtyPerPiece: 0, setupMin: 0, prodMin: 0 });
                  }}
                >
                  + Arbeitsgang
                </Button>
                <div className="grid sm:grid-cols-3 gap-3 mt-3">
                  <Field label="Stunden gesamt">
                    <div className="px-2.5 py-1.5 text-sm text-slate-600">{fmtNum(result.totalHours)} h</div>
                  </Field>
                  <Field label="Sonstige Einmalkosten Fertigung (€)">
                    <NumInput value={data.prodOneTime} onValue={(v) => upd({ prodOneTime: v })} />
                  </Field>
                </div>
                <SectionSum label="Summe Fertigungskosten" value={result.prodSum} />
              </Card>

              {/* Externe Bearbeitung */}
              <Card
                title="Externe Bearbeitung / Zukaufsteile"
                collapsible
                summary={fmtEur(result.extSum)}
                right={<UsedFilter value={hideExt} onChange={setHideExt} />}
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px]">
                    <thead>
                      <tr>
                        <th className={th}>Arbeitsgang / Zukaufsteil</th>
                        <th className={th}>Lieferant</th>
                        <th className={th}>Angebotsnr.</th>
                        <th className={thR}>Angebotspreis</th>
                        <th className={thR}>pro Stück?</th>
                        <th className={thR}>Preis</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {extRows.map(({ e, i }) => (
                        <tr key={i} className={isUsed.external(e) ? usedRow : undefined}>
                          <td className={td}><TextInput value={e.name} onChange={(ev) => updateRow("externals", i, { name: ev.target.value })} /></td>
                          <td className={`${td} w-40`}><TextInput value={e.supplier} onChange={(ev) => updateRow("externals", i, { supplier: ev.target.value })} /></td>
                          <td className={`${td} w-32`}><TextInput value={e.offerNo} onChange={(ev) => updateRow("externals", i, { offerNo: ev.target.value })} /></td>
                          <td className={`${td} w-28`}><NumInput value={e.price} onValue={(v) => updateRow("externals", i, { price: v })} /></td>
                          <td className="px-2 py-1 text-center">
                            <input
                              type="checkbox"
                              checked={e.perPiece}
                              onChange={(ev) => updateRow("externals", i, { perPiece: ev.target.checked })}
                              className="accent-blue-600"
                            />
                          </td>
                          <td className={`${tdOut} font-medium`}>{fmtEur(result.extPrices[i])}</td>
                          <td className={td}>
                            <RowButtons onRemove={() => removeRow("externals", i)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setHideExt(false);
                    addRow("externals", { name: "", supplier: "", offerNo: "", price: 0, perPiece: false });
                  }}
                >
                  + Zeile
                </Button>
                <div className="grid sm:grid-cols-3 gap-3 mt-3">
                  <Field label="Sonstige Einmalkosten extern (€)">
                    <NumInput value={data.extOneTime} onValue={(v) => upd({ extOneTime: v })} />
                  </Field>
                </div>
                <SectionSum label="Summe Kosten externe Bearbeitung" value={result.extSum} />
              </Card>

              {/* Versand */}
              <Card
                title="Versandkosten"
                collapsible
                summary={fmtEur(result.shipSum)}
                right={<UsedFilter value={hideShip} onChange={setHideShip} />}
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px]">
                    <thead>
                      <tr>
                        <th className={th}>Art</th>
                        <th className={th}>Bezeichnung</th>
                        <th className={thR}>Einzelpreis / €/h</th>
                        <th className={thR}>Anzahl / Std.</th>
                        <th className={thR}>Preis</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {shipRows.map(({ s, i }) => (
                        <tr key={i} className={isUsed.shipping(s) ? usedRow : undefined}>
                          <td className={`${td} w-32`}>
                            <Select value={s.kind} onChange={(e) => updateRow("shipping", i, { kind: e.target.value })}>
                              <option value="fahrzeug">Fahrzeug</option>
                              <option value="verpackung">Verpackung</option>
                            </Select>
                          </td>
                          <td className={td}>
                            <Select
                              value=""
                              onChange={(e) => {
                                const m = shipMaster.find((x) => String(x.id) === e.target.value);
                                if (m) {
                                  updateRow("shipping", i, {
                                    name: m.dimensions ? `${m.name} (${m.dimensions})` : m.name,
                                    unitPrice: s.kind === "fahrzeug" ? m.shipping_price : m.shipping_price + m.packaging_price,
                                  });
                                }
                              }}
                              className="mb-1"
                            >
                              <option value="">– aus Stammdaten übernehmen –</option>
                              {shipMaster
                                .filter((x) => x.category === s.kind)
                                .map((x) => (
                                  <option key={x.id} value={x.id}>
                                    {x.name} {x.dimensions && `(${x.dimensions})`}
                                  </option>
                                ))}
                            </Select>
                            <TextInput value={s.name} onChange={(e) => updateRow("shipping", i, { name: e.target.value })} />
                          </td>
                          <td className={`${td} w-28`}><NumInput value={s.unitPrice} onValue={(v) => updateRow("shipping", i, { unitPrice: v })} /></td>
                          <td className={`${td} w-24`}><NumInput value={s.qty} onValue={(v) => updateRow("shipping", i, { qty: v })} /></td>
                          <td className={`${tdOut} font-medium`}>{fmtEur(result.shipPrices[i])}</td>
                          <td className={td}>
                            <RowButtons onRemove={() => removeRow("shipping", i)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setHideShip(false);
                    addRow("shipping", { kind: "verpackung", name: "", unitPrice: 0, qty: 0 });
                  }}
                >
                  + Zeile
                </Button>
                <div className="grid sm:grid-cols-3 gap-3 mt-3">
                  <Field label="Sonstige Einmalkosten Versand (€)">
                    <NumInput value={data.shipOneTime} onValue={(v) => upd({ shipOneTime: v })} />
                  </Field>
                </div>
                <SectionSum label="Summe Versandkosten" value={result.shipSum} />
              </Card>
            </>
          ) : (
            <>
              {/* Flächenberechnung (nur Schallkabine) */}
              {data.type === "schallkabine" && (
              <Card title="Flächenberechnung" collapsible summary={`${fmtNum(result.areaTotal)} m²`}>
                <div className="grid sm:grid-cols-2 gap-2">
                  {data.areas.map((a, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <TextInput
                        placeholder={`Fläche ${i + 1} (z.B. Seitenwand)`}
                        value={a.label}
                        onChange={(e) => updateRow("areas", i, { label: e.target.value })}
                      />
                      <div className="w-28">
                        <NumInput value={a.value} onValue={(v) => updateRow("areas", i, { value: v })} placeholder="m²" />
                      </div>
                      <button onClick={() => removeRow("areas", i)} className="text-slate-300 hover:text-red-500">×</button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <Button variant="ghost" onClick={() => addRow("areas", { label: "", value: 0 })}>+ Fläche</Button>
                  <span className="text-sm font-semibold text-slate-700">Gesamt: {fmtNum(result.areaTotal)} m²</span>
                </div>
              </Card>
              )}

              {/* Zuschlagskalkulation: Material */}
              <Card
                title="Materialkosten"
                collapsible
                summary={fmtEur(result.materialSum)}
                right={<UsedFilter value={hideSkMat} onChange={setHideSkMat} />}
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[840px]">
                    <thead>
                      <tr>
                        <th className={th}>Kommentar</th>
                        <th className={th}>Was</th>
                        <th className={th}>Lieferant</th>
                        <th className={thR}>Stückzahl</th>
                        <th className={thR}>Kg / m²</th>
                        <th className={thR}>Preis/Einheit</th>
                        <th className={thR}>Summe</th>
                        <th className={thR}>inkl. Zuschlag</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {skMatRows.map(({ m, i }) => (
                        <tr key={i} className={isUsed.skMaterial(m) ? usedRow : undefined}>
                          <td className={`${td} w-32`}><TextInput value={m.comment} onChange={(e) => updateRow("skMaterials", i, { comment: e.target.value })} /></td>
                          <td className={td}><TextInput value={m.name} onChange={(e) => updateRow("skMaterials", i, { name: e.target.value })} /></td>
                          <td className={`${td} w-32`}><TextInput value={m.supplier} onChange={(e) => updateRow("skMaterials", i, { supplier: e.target.value })} /></td>
                          <td className={`${td} w-20`}><NumInput value={m.qty} onValue={(v) => updateRow("skMaterials", i, { qty: v })} /></td>
                          <td className={`${td} w-20`}><NumInput value={m.amount} onValue={(v) => updateRow("skMaterials", i, { amount: v })} /></td>
                          <td className={`${td} w-24`}><NumInput value={m.unitPrice} onValue={(v) => updateRow("skMaterials", i, { unitPrice: v })} /></td>
                          <td className={tdOut}>{fmtEur(result.skMatBase[i])}</td>
                          <td className={`${tdOut} font-medium`}>{fmtEur(result.skMatPrices[i])}</td>
                          <td className={td}>
                            <RowButtons onCopy={() => duplicateRow("skMaterials", i)} onRemove={() => removeRow("skMaterials", i)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {hideSkMat && skMatRows.length < data.skMaterials.length && (
                  <p className="text-xs text-slate-400 mt-1">{data.skMaterials.length - skMatRows.length} leere Positionen ausgeblendet – Haken oben entfernen zum Anzeigen.</p>
                )}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setHideSkMat(false);
                    addRow("skMaterials", { comment: "", name: "", supplier: "", qty: 0, amount: 0, unitPrice: 0 });
                  }}
                >
                  + Zeile
                </Button>
                <p className="text-xs text-slate-400 mt-1">Tipp: „Kg / m²" leer lassen (0) bei Tafel- oder Pauschalpreisen – dann gilt Stückzahl × Preis.</p>
                <div className="grid sm:grid-cols-3 gap-3 mt-3">
                  <Field label="Verschnitt / Zuschlag (%)">
                    <NumInput value={data.materialSurcharge * 100} onValue={(v) => upd({ materialSurcharge: v / 100 })} />
                  </Field>
                  <Field label="Sonstiger Materialsonderzuschlag (%)">
                    <NumInput value={data.materialSpecialSurcharge * 100} onValue={(v) => upd({ materialSpecialSurcharge: v / 100 })} />
                  </Field>
                </div>
                <SectionSum label="Materialkosten" value={result.materialSum} />
              </Card>

              {/* Zuschlagskalkulation: Fertigung */}
              <Card
                title="Fertigungskosten"
                collapsible
                summary={fmtEur(result.prodSum)}
                right={<UsedFilter value={hideSkWorks} onChange={setHideSkWorks} />}
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr>
                        <th className={th}>Arbeitsgang</th>
                        <th className={thR}>Stückzahl</th>
                        <th className={thR}>Arbeitszeit (h)</th>
                        <th className={thR}>Stundensatz</th>
                        <th className={thR}>Preis</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {skWorkRows.map(({ w, i }) => (
                        <tr key={i} className={isUsed.skWork(w) ? usedRow : undefined}>
                          <td className={td}><TextInput value={w.name} onChange={(e) => updateRow("skWorks", i, { name: e.target.value })} /></td>
                          <td className={`${td} w-24`}><NumInput value={w.qty} onValue={(v) => updateRow("skWorks", i, { qty: v })} /></td>
                          <td className={`${td} w-28`}>
                            <NumInput
                              value={w.hours}
                              onValue={(v) => updateRow("skWorks", i, { hours: v, ...(v > 0 && !w.qty ? { qty: 1 } : {}) })}
                            />
                          </td>
                          <td className={`${td} w-24`}><NumInput value={w.rate} onValue={(v) => updateRow("skWorks", i, { rate: v })} /></td>
                          <td className={`${tdOut} font-medium`}>{result.skWorkPrices[i] > 0 ? fmtEur(result.skWorkPrices[i]) : "–"}</td>
                          <td className={td}>
                            <RowButtons onRemove={() => removeRow("skWorks", i)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {hideSkWorks && skWorkRows.length < data.skWorks.length && (
                  <p className="text-xs text-slate-400 mt-1">{data.skWorks.length - skWorkRows.length} leere Arbeitsgänge ausgeblendet – Haken oben entfernen zum Anzeigen.</p>
                )}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setHideSkWorks(false);
                    addRow("skWorks", { name: "", qty: 0, hours: 0, rate: 58 });
                  }}
                >
                  + Arbeitsgang
                </Button>
                <div className="grid sm:grid-cols-3 gap-3 mt-3">
                  <Field label="Summe Fertigungszeiten">
                    <div className="px-2.5 py-1.5 text-sm text-slate-600">{fmtNum(result.totalHours)} h</div>
                  </Field>
                  <Field label="Sonstiger Fertigungszuschlag (%)">
                    <NumInput value={data.prodSurcharge * 100} onValue={(v) => upd({ prodSurcharge: v / 100 })} />
                  </Field>
                </div>
                <SectionSum label="Fertigungskosten" value={result.prodSum} />
              </Card>
            </>
          )}

          {/* Angebotstext */}
          <Card title="Angebotstext" collapsible>
            <textarea
              value={calc.offer_text}
              onChange={(e) => updCalc({ offer_text: e.target.value })}
              rows={8}
              placeholder="Optionaler Angebotstext – wird im PDF-Angebot verwendet. Leer lassen für Standardvorlage."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </Card>
        </div>

        {/* Endpreis-Panel */}
        <div className="xl:sticky xl:top-6 space-y-4">
          <div className="bg-slate-900 text-white rounded-xl shadow-lg p-5">
            <h2 className="font-semibold text-slate-300 text-sm uppercase tracking-wide mb-4">Endpreis</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Materialkosten</span><span>{fmtEur(result.materialSum)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Fertigungskosten</span><span>{fmtEur(result.prodSum)}</span></div>
              {!isSk && (
                <>
                  <div className="flex justify-between"><span className="text-slate-400">Externe Bearbeitung</span><span>{fmtEur(result.extSum)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Versandkosten</span><span>{fmtEur(result.shipSum)}</span></div>
                </>
              )}
              <div className="flex justify-between border-t border-slate-700 pt-2 font-semibold">
                <span>Herstellkosten</span><span>{fmtEur(result.manufacturingCost)}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-400">Gewinnzuschlag</span>
                <div className="w-20">
                  <NumInput
                    value={data.profitRate * 100}
                    onValue={(v) => upd({ profitRate: v / 100 })}
                    className="!bg-slate-800 !border-slate-600 !text-white"
                  />
                </div>
              </div>
              <div className="flex justify-between"><span className="text-slate-400">Gewinn</span><span className="text-green-400">{fmtEur(result.profit)}</span></div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-700">
              <div className="flex justify-between items-baseline">
                <span className="text-slate-300 text-sm">Verkaufspreis gesamt</span>
                <span className="text-2xl font-bold text-blue-400">{fmtEur(result.salesTotal)}</span>
              </div>
              <div className="flex justify-between items-baseline mt-1">
                <span className="text-slate-400 text-xs">pro Stück ({data.batchQty || 1}×)</span>
                <span className="font-semibold">{fmtEur(result.salesPerUnit)}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-xs text-slate-500 space-y-1">
            <div>Erstellt von: {calc.created_by_name ?? "–"}</div>
            <div>Typ: {CALC_TYPE_LABELS[calc.calc_type]} · Version {calc.version}</div>
            {result.totalWeight > 0 && <div>Gesamtgewicht: {fmtNum(result.totalWeight)} kg</div>}
            {result.totalHours > 0 && <div>Fertigungszeit: {fmtNum(result.totalHours)} h</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
