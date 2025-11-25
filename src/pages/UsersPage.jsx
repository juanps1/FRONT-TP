import { useEffect, useState } from 'react';
import api from '../api/client';
import Navbar from '../components/Navbar';

export default function UsersPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/usuarios');
        setUsuarios(res.data || []);
        setError('');
      } catch (e) {
        setError(e.response?.data?.message || 'No se pudo cargar usuarios');
      }
    };
    load();
  }, []);

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen">
      <Navbar />
      <main className="p-6">
        <h1 className="text-2xl font-bold mb-4">Usuarios</h1>
        {error && <p className="text-red-500 mb-3">{error}</p>}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3 text-left text-xs uppercase">ID</th>
              <th className="p-3 text-left text-xs uppercase">Nombre</th>
              <th className="p-3 text-left text-xs uppercase">Email</th>
              <th className="p-3 text-left text-xs uppercase">Rol</th>
              <th className="p-3 text-left text-xs uppercase">Estado</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length > 0 ? usuarios.map(u => (
              <tr key={u.id} className="border-t">
                <td className="p-3">{u.id}</td>
                <td className="p-3">{u.nombreCompleto || '—'}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.rol?.descripcion || u.rol?.nombre || '—'}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${u.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{u.estado}</span>
                </td>
              </tr>
            )) : (
              <tr>
                <td className="p-4 text-center" colSpan="5">No hay usuarios</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </main>
    </div>
  );
}
