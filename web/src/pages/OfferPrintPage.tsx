import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { fmtEur, fmtDate } from "../format";
import { Button, Field, NumInput, Spinner, TextInput } from "../components/ui";
import type { CartItem, Customer } from "../../../shared/types";
import { CI, CI_LIGHT, FIRMA, KONDITIONEN, LogoFallback, cartChanged } from "../offer";

export default function OfferPrintPage() {
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [logoOk, setLogoOk] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // Angebotskopf (editierbar, nicht im Druck)
  const heute = new Date().toISOString().slice(0, 10);
  const [empfaenger, setEmpfaenger] = useState("");
  const [anfrage, setAnfrage] = useState("");
  const [datum, setDatum] = useState(heute);
  const [freitext, setFreitext] = useState("");

  const load = () => {
    Promise.all([
      api.get<CartItem[]>("/cart"),
      api.get<Record<string, string>>("/settings"),
      api.get<Customer[]>("/customers"),
    ]).then(([c, s, cu]) => {
      setItems(c);
      setSettings(s);
      setCustomers(cu);
      if (c.length && !empfaenger) setEmpfaenger(c.find((x) => x.customer_name)?.customer_name ?? "");
    });
  };
  useEffect(load, []);

  if (!items) return <Spinner />;

  const jahr = datum.slice(0, 4) || String(new Date().getFullYear());
  const angebotNr = `${jahr}-${datum.slice(5, 10).replace("-", "")}`;
  const summe = items.reduce((a, p) => a + (p.menge || 0) * (p.einzel || 0), 0);

  const upd = (i: number, patch: Partial<CartItem>) =>
    setItems(items.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const remove = async (id: number) => {
    await api.delete(`/cart/${id}`);
    cartChanged();
    load();
  };
  const clearAll = async () => {
    if (!confirm("Angebotskorb leeren?")) return;
    await api.delete("/cart");
    cartChanged();
    load();
  };
  const save = async () => {
    setSaving(true);
    try {
      for (const it of items) {
        await api.put(`/cart/${it.id}`, {
          bezeichnung: it.bezeichnung,
          spec: it.spec,
          menge: it.menge,
          einzel: it.einzel,
        });
      }
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="no-print flex justify-between items-center mb-4">
        <Link to="/kalkulationen" className="text-blue-600 hover:underline text-sm">
          ← Zu den Kalkulationen
        </Link>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <Button variant="secondary" onClick={clearAll} className="!text-red-600 hover:!bg-red-50">
              Korb leeren
            </Button>
          )}
          <Button onClick={() => window.print()} disabled={items.length === 0}>🖨 Drucken / Als PDF speichern</Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          Der Angebotskorb ist leer. Öffnen Sie eine Kalkulation und klicken Sie auf
          <span className="font-medium text-slate-600"> „🛒 Zum Angebot hinzufügen"</span>.
        </div>
      ) : (
        <>
          {/* Editor (nicht im Druck) */}
          <div className="no-print bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800">Angebot bearbeiten</h2>
              <div className="flex items-center gap-2">
                {savedAt && <span className="text-xs text-green-600">✓ Gespeichert {savedAt.toLocaleTimeString("de-DE")}</span>}
                <Button onClick={save} disabled={saving}>{saving ? "Speichern…" : "💾 Speichern"}</Button>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              <Field label="Empfänger / Kunde">
                <TextInput list="dl-kunden" value={empfaenger} onChange={(e) => setEmpfaenger(e.target.value)} />
                <datalist id="dl-kunden">
                  {customers.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </Field>
              <Field label="Ihre Anfrage (optional)">
                <TextInput value={anfrage} onChange={(e) => setAnfrage(e.target.value)} />
              </Field>
              <Field label="Datum">
                <TextInput type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
              </Field>
            </div>

            <div className="space-y-2">
              {items.map((p, i) => (
                <div key={p.id} className="flex gap-2 items-start">
                  <span className="text-xs text-slate-400 pt-2 w-6">{i + 1}.</span>
                  <div className="flex-1 grid gap-1">
                    <TextInput placeholder="Bezeichnung" value={p.bezeichnung} onChange={(e) => upd(i, { bezeichnung: e.target.value })} />
                    <TextInput placeholder="Beschreibung / Maße" value={p.spec} onChange={(e) => upd(i, { spec: e.target.value })} className="text-xs" />
                  </div>
                  <div className="w-16">
                    <Field label="Menge"><NumInput value={p.menge} onValue={(v) => upd(i, { menge: v })} /></Field>
                  </div>
                  <div className="w-24">
                    <Field label="Einzel €"><NumInput value={p.einzel} onValue={(v) => upd(i, { einzel: v })} /></Field>
                  </div>
                  <div className="w-24 text-right text-sm pt-6 font-medium">{fmtEur((p.menge || 0) * (p.einzel || 0))}</div>
                  <button onClick={() => remove(p.id)} className="text-slate-300 hover:text-red-500 pt-6">×</button>
                </div>
              ))}
            </div>

            <Field label="Einleitungstext (optional)">
              <textarea
                value={freitext}
                onChange={(e) => setFreitext(e.target.value)}
                rows={3}
                placeholder="Zusätzlicher Text unter der Anrede – leer lassen für Standard."
                className="w-full px-3 py-2 mt-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </Field>
          </div>

          {/* Druckdokument */}
          <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-10 print:shadow-none print:border-0 print:rounded-none print:p-0 flex flex-col print:min-h-[247mm]">
            {/* Briefkopf */}
            <div className="flex justify-between items-start mb-8">
              <div className="text-[11px] text-slate-500 leading-snug pt-2">
                <div className="font-semibold text-slate-700">{FIRMA.name}</div>
                <div>{FIRMA.strasse}</div>
                <div>{FIRMA.ort}</div>
              </div>
              <div className="shrink-0">
                {logoOk ? (
                  <img src="/api/logo" alt={FIRMA.name} onError={() => setLogoOk(false)} className="h-20 w-auto object-contain" />
                ) : (
                  <LogoFallback />
                )}
              </div>
            </div>

            {/* Empfänger + Angebotsdaten */}
            <div className="flex justify-between items-start gap-8 mb-8">
              <div className="text-sm text-slate-800">
                <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">An</div>
                <div className="font-semibold">{empfaenger || "—"}</div>
              </div>
              <table className="text-sm text-slate-700">
                <tbody>
                  <tr>
                    <td className="pr-4 text-slate-400">Angebot-Nr.</td>
                    <td className="font-medium text-right">{angebotNr}</td>
                  </tr>
                  <tr>
                    <td className="pr-4 text-slate-400">Datum</td>
                    <td className="font-medium text-right">{fmtDate(datum)}</td>
                  </tr>
                  {anfrage && (
                    <tr>
                      <td className="pr-4 text-slate-400">Ihre Anfrage</td>
                      <td className="font-medium text-right">{anfrage}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Blaue CI-Überschrift */}
            <div className="text-white font-bold text-base px-4 py-2 rounded-sm mb-5" style={{ backgroundColor: CI }}>
              Angebot Nr. {angebotNr}
            </div>

            {/* Anrede + Einleitung */}
            <div className="text-sm text-slate-700 leading-relaxed mb-4">
              <p className="mb-2">Sehr geehrte Damen und Herren,</p>
              <p>vielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen hierfür das folgende Angebot:</p>
            </div>

            {freitext.trim() && (
              <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed mb-5">{freitext}</div>
            )}

            {/* Preistabelle */}
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
                {items.map((p, i) => (
                  <tr key={p.id} style={{ backgroundColor: i % 2 === 1 ? CI_LIGHT : "white" }}>
                    <td className="px-3 py-2.5 align-top text-slate-500">{i + 1}</td>
                    <td className="px-3 py-2.5 align-top">
                      <div className="font-medium text-slate-800">{p.bezeichnung || "—"}</div>
                      {p.spec && <div className="text-xs text-slate-500">{p.spec}</div>}
                      {p.drawing_no && <div className="text-xs text-slate-400">Zeichnung {p.drawing_no}</div>}
                    </td>
                    <td className="px-3 py-2.5 align-top text-right whitespace-nowrap">{p.menge} Stück</td>
                    <td className="px-3 py-2.5 align-top text-right whitespace-nowrap">{fmtEur(p.einzel)}</td>
                    <td className="px-3 py-2.5 align-top text-right font-medium whitespace-nowrap">
                      {fmtEur((p.menge || 0) * (p.einzel || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Angebotssumme */}
            <div className="flex justify-end mb-6">
              <div className="w-64 text-sm">
                <div className="flex justify-between border-t-2 px-3 py-2 font-bold" style={{ borderColor: CI }}>
                  <span>Angebotssumme netto</span>
                  <span>{fmtEur(summe)}</span>
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
                Wir würden uns freuen, Ihren Auftrag zu erhalten, und stehen für Rückfragen jederzeit gerne zur Verfügung.
              </p>
              <p>Mit freundlichen Grüßen</p>
              <p className="font-semibold text-slate-800 mt-1">{FIRMA.name}</p>
            </div>

            {/* Fußzeile */}
            <div className="mt-auto pt-6">
              <div className="border-t-2 pt-3 text-center text-[10px] leading-relaxed text-slate-500" style={{ borderColor: CI }}>
                <div className="font-semibold" style={{ color: CI }}>
                  {FIRMA.name} · {FIRMA.strasse} · {FIRMA.ort}
                </div>
                <div>Tel: {FIRMA.tel} · {FIRMA.email} · {FIRMA.web}</div>
                <div>{FIRMA.ust} · {FIRMA.iban} · {FIRMA.reg}</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
