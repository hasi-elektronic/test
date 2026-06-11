import { useEffect, useState, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";

export function Card({
  title,
  children,
  right,
  summary,
  collapsible,
}: {
  title?: string;
  children: ReactNode;
  right?: ReactNode;
  summary?: ReactNode;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      {(title || right) && (
        <div
          className={`flex items-center justify-between gap-3 px-5 py-3 ${open ? "border-b border-slate-100" : ""} ${collapsible ? "cursor-pointer select-none" : ""}`}
          onClick={collapsible ? () => setOpen(!open) : undefined}
        >
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            {collapsible && <span className="text-slate-400 text-xs w-3">{open ? "▾" : "▸"}</span>}
            {title}
          </h2>
          <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
            {right}
            {summary !== undefined && <span className="text-sm font-bold text-slate-700 whitespace-nowrap">{summary}</span>}
          </div>
        </div>
      )}
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  ...props
}: { children: ReactNode; variant?: "primary" | "secondary" | "danger" | "ghost" } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    ghost: "text-slate-500 hover:text-slate-800 hover:bg-slate-100",
  };
  return (
    <button
      {...props}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 bg-white ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 bg-white ${props.className ?? ""}`}
    />
  );
}

// Zahleneingabe mit deutschem Komma; gibt number weiter
export function NumInput({
  value,
  onValue,
  className,
  ...props
}: { value: number; onValue: (v: number) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [text, setText] = useState<string>(value === 0 ? "" : String(value).replace(".", ","));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(value === 0 ? "" : String(value).replace(".", ","));
  }, [value, focused]);

  return (
    <input
      {...props}
      inputMode="decimal"
      value={text}
      onFocus={(e) => {
        setFocused(true);
        e.target.select();
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const t = e.target.value;
        setText(t);
        const parsed = parseFloat(t.replace(/\./g, "").replace(",", ".")) || parseFloat(t.replace(",", "."));
        onValue(Number.isFinite(parsed) ? parsed : 0);
      }}
      className={`w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 bg-white ${className ?? ""}`}
    />
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-xl shadow-xl w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[90vh] overflow-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Badge({ children, color }: { children: ReactNode; color: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{children}</span>
  );
}

export const STATUS_COLORS: Record<string, string> = {
  entwurf: "bg-slate-100 text-slate-700",
  angebot: "bg-blue-100 text-blue-700",
  auftrag: "bg-amber-100 text-amber-700",
  abgeschlossen: "bg-green-100 text-green-700",
  abgelehnt: "bg-red-100 text-red-700",
};

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
}
