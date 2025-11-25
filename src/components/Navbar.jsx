import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Navbar() {
  const { roleId } = useAuth();
  const navigate = useNavigate();
  const [activas, setActivas] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('auth_email');
    localStorage.removeItem('auth_roleId');
    navigate('/login');
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await api.get('/alertas/metrics');
        if (mounted) setActivas(res.data?.activas ?? null);
      } catch (_) {
        // silencioso
      }
    };
    load(); // sólo al montar, sin intervalos
    return () => { mounted = false; };
  }, []);

  return (
    <header className="sticky top-0 z-10 w-full bg-white/80 dark:bg-background-dark/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
      <div className="container mx-auto px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl">polymer</span>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Sensora</h2>
        </div>
        <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
          <Link to="/dashboard" className="hover:text-primary">Dashboard</Link>
          <Link to="/medidores" className="hover:text-primary">Medidores</Link>
          <Link to="/facturas" className="hover:text-primary">Facturas</Link>
          <Link to="/alertas" className="hover:text-primary flex items-center gap-1">
            Alertas
            {typeof activas === 'number' && activas > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[11px] font-bold bg-red-600 text-white">
                {activas}
              </span>
            )}
          </Link>
          <Link to="/mensajes" className="hover:text-primary">Mensajes</Link>
          <Link to="/procesos" className="hover:text-primary">Procesos</Link>
          {roleId === 1 && (
            <>
              <Link to="/usuarios" className="hover:text-primary">Usuarios</Link>
              <Link to="/roles" className="hover:text-primary">Roles</Link>
            </>
          )}
        </nav>
        <button 
          onClick={handleLogout}
          className="bg-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-primary/90"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
