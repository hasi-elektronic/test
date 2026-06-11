import { Navigate, Route, Routes, NavLink, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import { useState } from "react";
import { api } from "./api";
import { Button, Field, Modal, Spinner, TextInput } from "./components/ui";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CalcListPage from "./pages/CalcListPage";
import NewCalcPage from "./pages/NewCalcPage";
import CalcEditorPage from "./pages/CalcEditorPage";
import OfferPrintPage from "./pages/OfferPrintPage";
import StammdatenPage from "./pages/StammdatenPage";
import UsersPage from "./pages/UsersPage";
import SettingsPage from "./pages/SettingsPage";

function PasswordModal({ onClose }: { onClose: () => void }) {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const save = async () => {
    try {
      await api.post("/auth/change-password", { oldPassword: oldPw, newPassword: newPw });
      setDone(true);
      setTimeout(onClose, 1200);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <Modal title="Passwort ändern" onClose={onClose}>
      {done ? (
        <p className="text-green-600 font-medium">Passwort geändert ✓</p>
      ) : (
        <div className="space-y-3">
          <Field label="Aktuelles Passwort">
            <TextInput type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} />
          </Field>
          <Field label="Neues Passwort (min. 8 Zeichen)">
            <TextInput type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          </Field>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
            <Button onClick={save}>Speichern</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);

  const navItem = "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition";
  const cls = ({ isActive }: { isActive: boolean }) =>
    `${navItem} ${isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-700/60 hover:text-white"}`;

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="no-print w-60 shrink-0 bg-slate-900 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-700/60">
          <div className="text-white font-bold text-lg leading-tight">Sickinger</div>
          <div className="text-blue-400 text-xs font-medium tracking-wide uppercase">Kalkulation</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavLink to="/" end className={cls}>📊 Dashboard</NavLink>
          <NavLink to="/kalkulationen" className={cls}>🧮 Kalkulationen</NavLink>
          <NavLink to="/stammdaten" className={cls}>🗂️ Stammdaten</NavLink>
          {user?.role === "admin" && <NavLink to="/benutzer" className={cls}>👥 Benutzer</NavLink>}
          {user?.role === "admin" && <NavLink to="/einstellungen" className={cls}>⚙️ Einstellungen</NavLink>}
        </nav>
        <div className="p-4 border-t border-slate-700/60 text-sm">
          <div className="text-white font-medium truncate">{user?.name}</div>
          <div className="text-slate-400 text-xs truncate mb-2">{user?.email}</div>
          <div className="flex gap-2">
            <button onClick={() => setShowPw(true)} className="text-xs text-slate-400 hover:text-white">
              Passwort
            </button>
            <span className="text-slate-600">·</span>
            <button
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
              className="text-xs text-slate-400 hover:text-white"
            >
              Abmelden
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-6">{children}</main>
      {showPw && <PasswordModal onClose={() => setShowPw(false)} />}
    </div>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Protected><DashboardPage /></Protected>} />
        <Route path="/kalkulationen" element={<Protected><CalcListPage /></Protected>} />
        <Route path="/kalkulationen/neu" element={<Protected><NewCalcPage /></Protected>} />
        <Route path="/kalkulationen/:id" element={<Protected><CalcEditorPage /></Protected>} />
        <Route path="/kalkulationen/:id/angebot" element={<Protected><OfferPrintPage /></Protected>} />
        <Route path="/stammdaten" element={<Protected><StammdatenPage /></Protected>} />
        <Route path="/benutzer" element={<Protected><UsersPage /></Protected>} />
        <Route path="/einstellungen" element={<Protected><SettingsPage /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
