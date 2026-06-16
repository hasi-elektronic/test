import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { fmtEur, fmtDate } from "../format";
import { Button, Field, NumInput, Spinner, TextInput } from "../components/ui";
import type { CartItem, Customer } from "../../../shared/types";
import { CI, CI_LIGHT, FIRMA, KONDITIONEN, LogoFallback, cartChanged } from "../offer";

// A4 bei 96 dpi
const PAGE_W = 794;
const PAGE_H = 1123;
const PAD_X = 52;
const PAD_TOP = 44;
const PAD_BOTTOM = 28;

export default function OfferPrintPage() {
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [logoOk, setLogoOk] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const heute = new Date().toISOString().slice(0, 10);
  const [empfaenger, setEmpfaenger] = useState("");
  const [anfrage, setAnfrage] = useState("");
  const [datum, setDatum] = useState(heute);
  const [freitext, setFreitext] = useState("");

  // Auto-fit auf eine A4-Seite
  const pageRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [hint, setHint] = useState("");

  const load = () => {
    Promise.all([api.get<CartItem[]>("/cart"), api.get<Customer[]>("/customers")]).then(([c, cu]) => {
      setItems(c);
      setCustomers(cu);
      if (c.length && !empfaenger) setEmpfaenger(c.find((x) => x.customer_name)?.customer_name ?? "");
    });
  };
  useEffect(load, []);

  const jahr = datum.slice(0, 4) || String(new Date().getFullYear());
  const angebotNr = `${jahr}-${datum.slice(5, 10).replace("-", "")}`;
  const summe = (items ?? []).reduce((a, p) => a + (p.menge || 0) * (p.einzel || 0), 0);

  // Inhalt messen und ggf. herunterskalieren, damit alles auf eine Seite passt
  // (CSS-transform verändert scrollHeight nicht → keine Endlosschleife)
  useLayoutEffect(() => {
    if (!bodyRef.current || !footerRef.current) return;
    const footerH = footerRef.current.offsetHeight;
    const available = PAGE_H - PAD_TOP - PAD_BOTTOM - footerH - 10;
    const content = bodyRef.current.scrollHeight;
    setScale(content > available ? Math.max(0.4, available / content) : 1);
  }, [items, empfaenger, anfrage, datum, freitext, logoOk]);

  if (!items) return <Spinner />;

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
        await api.put(`/cart/${it.id}`, { bezeichnung: it.bezeichnung, spec: it.spec, menge: it.menge, einzel: it.einzel });
      }
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  };

  const pdfName = () =>
    `Angebot-${angebotNr}${empfaenger ? "-" + empfaenger.replace(/[^\w-]+/g, "_") : ""}.pdf`;

  // UTF-8-sicheres Base64
  const b64 = (str: string) => btoa(String.fromCharCode(...new TextEncoder().encode(str)));
  const downloadBlob = (blob: Blob, name: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Angebot als PDF erzeugen (html-to-image + jsPDF, lazy geladen)
  const makePdf = async () => {
    if (!pageRef.current) return null;
    const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
    const dataUrl = await toPng(pageRef.current, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      width: PAGE_W,
      height: PAGE_H,
    });
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    pdf.addImage(dataUrl, "PNG", 0, 0, 210, 297);
    return pdf;
  };

  const downloadPdf = async () => {
    setPdfBusy(true);
    setHint("");
    try {
      const pdf = await makePdf();
      pdf?.save(pdfName());
    } finally {
      setPdfBusy(false);
    }
  };

  // Outlook-E-Mail (.eml) mit PDF im Anhang erzeugen.
  // X-Unsent: 1 → Outlook öffnet beim Doppelklick eine neue, sendebereite E-Mail.
  const sendEmail = async () => {
    setPdfBusy(true);
    setHint("");
    try {
      const pdf = await makePdf();
      if (!pdf) return;
      const pdfB64 = (pdf.output("datauristring") as string).split("base64,")[1];
      const kunde = customers.find((c) => c.name === empfaenger && c.email);
      const betreff = `Angebot Nr. ${angebotNr}${empfaenger ? ` – ${empfaenger}` : ""}`;
      const body = [
        "Sehr geehrte Damen und Herren,",
        "",
        "vielen Dank für Ihre Anfrage und Ihr Interesse an unseren Produkten.",
        "",
        `anbei erhalten Sie unser Angebot Nr. ${angebotNr} als PDF. Die Angebotssumme beträgt ${fmtEur(summe)} netto (zzgl. der gesetzlichen MwSt., ab Werk, zzgl. Verpackung).`,
        "",
        "Über Ihren Auftrag würden wir uns sehr freuen. Für Rückfragen stehen wir Ihnen jederzeit gerne zur Verfügung.",
        "",
        "Mit freundlichen Grüßen",
        FIRMA.name,
        `${FIRMA.strasse} · ${FIRMA.ort}`,
        `Tel: ${FIRMA.tel}`,
        `${FIRMA.email} · ${FIRMA.web}`,
      ].join("\r\n");

      const datei = pdfName();
      const boundary = "SICK_" + Math.random().toString(36).slice(2);
      const wrap = (s: string) => s.replace(/.{1,76}/g, "$&\r\n").trimEnd();
      const header = [
        `Date: ${new Date().toUTCString()}`,
        kunde?.email ? `To: ${kunde.email}` : "",
        `Subject: =?utf-8?B?${b64(betreff)}?=`,
        "X-Unsent: 1",
        "MIME-Version: 1.0",
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ].filter(Boolean);
      const eml =
        header.join("\r\n") +
        "\r\n\r\n" +
        `--${boundary}\r\n` +
        "Content-Type: text/plain; charset=utf-8\r\n" +
        "Content-Transfer-Encoding: base64\r\n\r\n" +
        wrap(b64(body)) +
        "\r\n\r\n" +
        `--${boundary}\r\n` +
        `Content-Type: application/pdf; name="${datei}"\r\n` +
        "Content-Transfer-Encoding: base64\r\n" +
        `Content-Disposition: attachment; filename="${datei}"\r\n\r\n` +
        wrap(pdfB64) +
        "\r\n\r\n" +
        `--${boundary}--\r\n`;

      downloadBlob(new Blob([eml], { type: "message/rfc822" }), datei.replace(/\.pdf$/, ".eml"));
      setHint("E-Mail mit PDF im Anhang erstellt – Datei doppelklicken, Outlook öffnet sie sendebereit.");
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="mx-auto" style={{ maxWidth: PAGE_W }}>
      <div className="no-print flex justify-between items-center mb-4">
        <Link to="/kalkulationen" className="text-blue-600 hover:underline text-sm">← Zu den Kalkulationen</Link>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <Button variant="secondary" onClick={clearAll} className="!text-red-600 hover:!bg-red-50">Korb leeren</Button>
          )}
          <Button variant="secondary" onClick={downloadPdf} disabled={items.length === 0 || pdfBusy}>
            {pdfBusy ? "PDF…" : "⬇ PDF"}
          </Button>
          <Button variant="secondary" onClick={() => window.print()} disabled={items.length === 0}>🖨 Drucken</Button>
          <Button onClick={sendEmail} disabled={items.length === 0 || pdfBusy}>
            {pdfBusy ? "Erzeuge E-Mail…" : "📧 Per E-Mail senden"}
          </Button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="no-print text-xs -mt-2 mb-4 text-right">
          {hint ? (
            <span className="text-green-600">✓ {hint}</span>
          ) : (
            <span className="text-slate-400">„📧 Per E-Mail senden" erstellt eine Outlook-E-Mail mit dem Angebot-PDF im Anhang (Datei doppelklicken).</span>
          )}
        </div>
      )}

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
                {scale < 1 && <span className="text-xs text-amber-600">auf eine Seite verkleinert ({Math.round(scale * 100)} %)</span>}
                <Button onClick={save} disabled={saving}>{saving ? "Speichern…" : "💾 Speichern"}</Button>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              <Field label="Empfänger / Kunde">
                <TextInput list="dl-kunden" value={empfaenger} onChange={(e) => setEmpfaenger(e.target.value)} />
                <datalist id="dl-kunden">{customers.map((c) => <option key={c.id} value={c.name} />)}</datalist>
              </Field>
              <Field label="Ihre Anfrage (optional)">
                <TextInput value={anfrage} onChange={(e) => setAnfrage(e.target.value)} />
              </Field>
              <Field label="Datum"><TextInput type="date" value={datum} onChange={(e) => setDatum(e.target.value)} /></Field>
            </div>
            <div className="space-y-2">
              {items.map((p, i) => (
                <div key={p.id} className="flex gap-2 items-start">
                  <span className="text-xs text-slate-400 pt-2 w-6">{i + 1}.</span>
                  <div className="flex-1 grid gap-1">
                    <TextInput placeholder="Bezeichnung" value={p.bezeichnung} onChange={(e) => upd(i, { bezeichnung: e.target.value })} />
                    <TextInput placeholder="Beschreibung / Maße" value={p.spec} onChange={(e) => upd(i, { spec: e.target.value })} className="text-xs" />
                  </div>
                  <div className="w-16"><Field label="Menge"><NumInput value={p.menge} onValue={(v) => upd(i, { menge: v })} /></Field></div>
                  <div className="w-24"><Field label="Einzel €"><NumInput value={p.einzel} onValue={(v) => upd(i, { einzel: v })} /></Field></div>
                  <div className="w-24 text-right text-sm pt-6 font-medium">{fmtEur((p.menge || 0) * (p.einzel || 0))}</div>
                  <button onClick={() => remove(p.id)} className="text-slate-300 hover:text-red-500 pt-6">×</button>
                </div>
              ))}
            </div>
            <Field label="Einleitungstext (optional)">
              <textarea value={freitext} onChange={(e) => setFreitext(e.target.value)} rows={2}
                placeholder="Zusätzlicher Text unter der Anrede – leer lassen für Standard."
                className="w-full px-3 py-2 mt-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
            </Field>
          </div>

          {/* A4-Druckseite mit Auto-Fit auf genau eine Seite */}
          <div
            ref={pageRef}
            className="angebot-page bg-white shadow-sm mx-auto relative overflow-hidden print:shadow-none"
            style={{ width: PAGE_W, height: PAGE_H }}
          >
            <div
              ref={bodyRef}
              style={{
                position: "absolute",
                top: PAD_TOP,
                left: PAD_X,
                width: PAGE_W - 2 * PAD_X,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              {/* Briefkopf */}
              <div className="flex justify-between items-start mb-7">
                <div className="text-[11px] text-slate-500 leading-snug pt-2">
                  <div className="font-semibold text-slate-700">{FIRMA.name}</div>
                  <div>{FIRMA.strasse}</div>
                  <div>{FIRMA.ort}</div>
                </div>
                <div className="shrink-0">
                  {logoOk ? (
                    <img src="/api/logo" alt={FIRMA.name} onError={() => setLogoOk(false)} onLoad={() => setLogoOk(true)} className="h-20 w-auto object-contain" />
                  ) : (
                    <LogoFallback />
                  )}
                </div>
              </div>

              {/* Empfänger + Angebotsdaten */}
              <div className="flex justify-between items-start gap-8 mb-7">
                <div className="text-sm text-slate-800">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">An</div>
                  <div className="font-semibold">{empfaenger || "—"}</div>
                </div>
                <table className="text-sm text-slate-700">
                  <tbody>
                    <tr><td className="pr-4 text-slate-400">Angebot-Nr.</td><td className="font-medium text-right">{angebotNr}</td></tr>
                    <tr><td className="pr-4 text-slate-400">Datum</td><td className="font-medium text-right">{fmtDate(datum)}</td></tr>
                    {anfrage && <tr><td className="pr-4 text-slate-400">Ihre Anfrage</td><td className="font-medium text-right">{anfrage}</td></tr>}
                  </tbody>
                </table>
              </div>

              <div className="text-white font-bold text-base px-4 py-2 rounded-sm mb-4" style={{ backgroundColor: CI }}>
                Angebot Nr. {angebotNr}
              </div>

              <div className="text-sm text-slate-700 leading-relaxed mb-3">
                <p className="mb-2">Sehr geehrte Damen und Herren,</p>
                <p>vielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen hierfür das folgende Angebot:</p>
              </div>

              {freitext.trim() && <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed mb-4">{freitext}</div>}

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
                      <td className="px-3 py-2 align-top text-slate-500">{i + 1}</td>
                      <td className="px-3 py-2 align-top">
                        <div className="font-medium text-slate-800">{p.bezeichnung || "—"}</div>
                        {p.spec && <div className="text-xs text-slate-500">{p.spec}</div>}
                        {p.drawing_no && <div className="text-xs text-slate-400">Zeichnung {p.drawing_no}</div>}
                      </td>
                      <td className="px-3 py-2 align-top text-right whitespace-nowrap">{p.menge} Stück</td>
                      <td className="px-3 py-2 align-top text-right whitespace-nowrap">{fmtEur(p.einzel)}</td>
                      <td className="px-3 py-2 align-top text-right font-medium whitespace-nowrap">{fmtEur((p.menge || 0) * (p.einzel || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end mb-5">
                <div className="w-64 text-sm">
                  <div className="flex justify-between border-t-2 px-3 py-2 font-bold" style={{ borderColor: CI }}>
                    <span>Angebotssumme netto</span><span>{fmtEur(summe)}</span>
                  </div>
                </div>
              </div>

              <div className="mb-5">
                <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: CI }}>Konditionen</div>
                <ul className="text-sm text-slate-700 space-y-1">
                  {KONDITIONEN.map((k, i) => (
                    <li key={i} className="flex gap-2"><span style={{ color: CI }}>•</span><span>{k}</span></li>
                  ))}
                </ul>
              </div>

              <div className="text-sm text-slate-700 leading-relaxed">
                <p className="mb-3">Wir würden uns freuen, Ihren Auftrag zu erhalten, und stehen für Rückfragen jederzeit gerne zur Verfügung.</p>
                <p>Mit freundlichen Grüßen</p>
                <p className="font-semibold text-slate-800 mt-1">{FIRMA.name}</p>
              </div>
            </div>

            {/* Fußzeile fest am Seitenende */}
            <div ref={footerRef} style={{ position: "absolute", left: PAD_X, right: PAD_X, bottom: PAD_BOTTOM }}>
              <div className="border-t-2 pt-3 text-center text-[10px] leading-relaxed text-slate-500" style={{ borderColor: CI }}>
                <div className="font-semibold" style={{ color: CI }}>{FIRMA.name} · {FIRMA.strasse} · {FIRMA.ort}</div>
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
