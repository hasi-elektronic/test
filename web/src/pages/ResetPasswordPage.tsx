import { useState } from "react";
import { api } from "../api";
import { Button, Field, TextInput } from "../components/ui";

export default function ResetPasswordPage() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/auth/request-reset", { email });
      setMsg("Falls ein Konto mit dieser E-Mail existiert, wurde ein Reset-Link gesendet.");
    } catch { setMsg("Fehler – bitte erneut versuchen."); }
    setBusy(false);
  };

  const doReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== password2) { setMsg("Passwörter stimmen nicht überein."); return; }
    if (password.length < 8) { setMsg("Passwort muss mindestens 8 Zeichen haben."); return; }
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
      setMsg("Passwort erfolgreich geändert. Sie können sich jetzt anmelden.");
    } catch (err: any) { setMsg(err.message ?? "Fehler – Token ungültig oder abgelaufen."); }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-white font-bold text-3xl">Sickinger</div>
          <div className="text-blue-400 text-sm font-medium tracking-widest uppercase">Passwort zurücksetzen</div>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
          {token ? (
            done ? (
              <div className="space-y-4">
                <p className="text-green-600 text-sm">{msg}</p>
                <a href="/login" className="block text-center text-blue-600 text-sm hover:underline">Zur Anmeldung →</a>
              </div>
            ) : (
              <form onSubmit={doReset} className="space-y-4">
                <Field label="Neues Passwort">
                  <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoFocus />
                </Field>
                <Field label="Passwort wiederholen">
                  <TextInput type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} required />
                </Field>
                {msg && <p className="text-red-600 text-sm">{msg}</p>}
                <Button type="submit" disabled={busy} className="w-full py-2.5">
                  {busy ? "Speichern…" : "Passwort speichern"}
                </Button>
              </form>
            )
          ) : (
            <form onSubmit={requestReset} className="space-y-4">
              <p className="text-sm text-slate-600">Geben Sie Ihre E-Mail-Adresse ein. Sie erhalten einen Link zum Zurücksetzen.</p>
              <Field label="E-Mail">
                <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
              </Field>
              {msg && <p className="text-green-700 text-sm">{msg}</p>}
              <Button type="submit" disabled={busy} className="w-full py-2.5">
                {busy ? "Senden…" : "Reset-Link anfordern"}
              </Button>
              <div className="text-center">
                <a href="/login" className="text-xs text-slate-400 hover:text-blue-600">← Zurück zur Anmeldung</a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
