// Deutsche Zahlen- und Währungsformatierung

const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const num = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });

export const fmtEur = (v: number) => eur.format(v || 0);
export const fmtNum = (v: number) => num.format(v || 0);
export const fmtPct = (v: number) => `${num.format((v || 0) * 100)} %`;

export const fmtDate = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso.includes("T") || iso.includes(" ") ? iso.replace(" ", "T") + "Z" : iso);
  return d.toLocaleDateString("de-DE");
};
