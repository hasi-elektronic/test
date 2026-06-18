import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Button, Field, TextInput } from "../components/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-white font-bold text-3xl">Sickinger</div>
          <div className="text-blue-400 text-sm font-medium tracking-widest uppercase">Kalkulationssystem</div>
        </div>
        <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
          <Field label="E-Mail">
            <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
          </Field>
          <Field label="Passwort">
            <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full py-2.5">
            {busy ? "Anmelden…" : "Anmelden"}
          </Button>
          <div className="text-center">
            <a href="/reset-password" className="text-xs text-slate-400 hover:text-blue-600">
              Passwort vergessen?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
