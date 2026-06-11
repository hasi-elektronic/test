import { useEffect, useState } from "react";
import { api } from "../api";
import { fmtDate } from "../format";
import { Badge, Button, Field, Modal, Select, Spinner, TextInput } from "../components/ui";
import type { User } from "../../../shared/types";

export default function UsersPage() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [edit, setEdit] = useState<any | null>(null);
  const [error, setError] = useState("");

  const load = () => api.get<User[]>("/users").then(setUsers);
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setError("");
    try {
      if (edit.id) await api.put(`/users/${edit.id}`, edit);
      else await api.post("/users", edit);
      setEdit(null);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (!users) return <Spinner />;

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Benutzer</h1>
        <Button onClick={() => setEdit({ email: "", name: "", role: "user", active: 1, password: "" })}>
          + Neuer Benutzer
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">E-Mail</th>
              <th className="text-left px-4 py-3">Rolle</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Erstellt</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-800">{u.name}</td>
                <td className="px-4 py-2.5 text-slate-600">{u.email}</td>
                <td className="px-4 py-2.5">
                  <Badge color={u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-700"}>
                    {u.role === "admin" ? "Administrator" : "Benutzer"}
                  </Badge>
                </td>
                <td className="px-4 py-2.5">
                  <Badge color={u.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                    {u.active ? "Aktiv" : "Deaktiviert"}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-right text-slate-400">{fmtDate(u.created_at)}</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => setEdit({ ...u, password: "" })} className="text-slate-400 hover:text-blue-600 px-1.5">✎</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <Modal title={edit.id ? "Benutzer bearbeiten" : "Neuer Benutzer"} onClose={() => setEdit(null)}>
          <div className="space-y-3">
            {!edit.id && (
              <Field label="E-Mail">
                <TextInput type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
              </Field>
            )}
            <Field label="Name">
              <TextInput value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </Field>
            <Field label="Rolle">
              <Select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>
                <option value="user">Benutzer</option>
                <option value="admin">Administrator</option>
              </Select>
            </Field>
            {edit.id ? (
              <>
                <Field label="Status">
                  <Select value={String(edit.active)} onChange={(e) => setEdit({ ...edit, active: Number(e.target.value) })}>
                    <option value="1">Aktiv</option>
                    <option value="0">Deaktiviert</option>
                  </Select>
                </Field>
                <Field label="Neues Passwort (leer = unverändert)">
                  <TextInput type="password" value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} />
                </Field>
              </>
            ) : (
              <Field label="Passwort (min. 8 Zeichen)">
                <TextInput type="password" value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} />
              </Field>
            )}
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setEdit(null)}>Abbrechen</Button>
              <Button onClick={save}>Speichern</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
