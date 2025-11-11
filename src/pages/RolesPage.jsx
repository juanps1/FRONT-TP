import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

export default function RolesPage() {
  const { roleId } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [msg, setMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [query, setQuery] = useState("");

  const cargarUsuarios = async () => {
    setErrMsg("");
    try {
      const res = await api.get("/usuarios");
      setUsuarios(res.data || []);
    } catch (e) {
      const st = e.response?.status;
      if (st === 401 || st === 403) {
        setErrMsg("Se requieren permisos de administrador.");
      } else {
        setErrMsg(e.response?.data?.message || "No se pudo cargar la lista de usuarios");
      }
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const usuariosFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter((u) =>
      (u.email?.toLowerCase()?.includes(q)) ||
      (u.nombreCompleto?.toLowerCase()?.includes(q)) ||
      String(u.id).includes(q)
    );
  }, [usuarios, query]);

  const setRolLocal = (userId, rolId) => {
    setUsuarios((prev) => prev.map((u) => u.id === userId ? ({
      ...u,
      rol: rolId === 1 ? { id: 1, descripcion: 'ADMIN' } : { id: 2, descripcion: 'USER' }
    }) : u));
  };

  const guardarRol = async (user) => {
    if (roleId !== 1) {
      setErrMsg('Permiso denegado: solo administradores pueden cambiar roles.');
      setTimeout(() => setErrMsg(''), 3000);
      return;
    }
    const nuevoRolId = Number(user.rol?.id) === 1 ? 1 : 2; // asegurar 1|2
    setSavingId(user.id);
    setErrMsg("");
    setMsg("");
    try {
      await api.patch(`/usuarios/${user.id}/rol`, { rolId: nuevoRolId });
      setMsg("Rol actualizado correctamente");
      setTimeout(() => setMsg(""), 2500);
      // refrescar para asegurar consistencia con backend
      await cargarUsuarios();
    } catch (e) {
      const st = e.response?.status;
      if (st === 401 || st === 403) {
        setErrMsg("Se requieren permisos de administrador (401/403)");
      } else if (st === 404) {
        setErrMsg("Usuario no encontrado (404)");
        // refrescar lista
        await cargarUsuarios();
      } else {
        setErrMsg(e.response?.data?.message || 'Error al actualizar el rol');
      }
      setTimeout(() => setErrMsg(""), 3500);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-200 min-h-screen font-display">
      <Navbar />

      <main className="p-6 lg:p-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-extrabold">Gestión de Roles</h1>
        </div>

        {(msg || errMsg) && (
          <div className={`mb-4 rounded-lg p-3 text-sm ${errMsg ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>
            {errMsg || msg}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3 mb-6">
          <label className="flex-1 min-w-56">
            <p className="text-sm font-medium">Buscar</p>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border w-full rounded-lg p-2"
              placeholder="ID, email o nombre"
            />
          </label>
          <button
            type="button"
            onClick={cargarUsuarios}
            className="h-10 px-4 rounded-lg border bg-white dark:bg-slate-800"
          >
            Recargar
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2430]">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider">ID</th>
                <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider">Email</th>
                <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider">Nombre</th>
                <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider">Estado</th>
                <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider">Rol</th>
                <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((u) => (
                <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="p-4 font-medium text-slate-600 dark:text-slate-300">{u.id}</td>
                  <td className="p-4">{u.email}</td>
                  <td className="p-4">{u.nombreCompleto}</td>
                  <td className="p-4 capitalize">{u.estado}</td>
                  <td className="p-4">
                    <select
                      value={u.rol?.id ?? 2}
                      disabled={savingId === u.id}
                      onChange={(e) => setRolLocal(u.id, Number(e.target.value))}
                      className="border rounded-lg p-2 bg-white dark:bg-slate-900"
                    >
                      <option value={1}>ADMIN</option>
                      <option value={2}>USER</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => guardarRol(u)}
                      disabled={savingId === u.id}
                      className={`px-3 py-1.5 rounded-lg text-white ${savingId === u.id ? 'bg-slate-400' : 'bg-primary hover:bg-primary/90'}`}
                    >
                      {savingId === u.id ? 'Guardando...' : 'Guardar'}
                    </button>
                  </td>
                </tr>
              ))}
              {usuariosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">No hay usuarios</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
