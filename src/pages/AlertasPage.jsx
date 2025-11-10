import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AlertasPage() {
  const { roleId } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex bg-background-light dark:bg-background-dark">
      <aside className="w-64 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#182431] p-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-full bg-primary/10 p-3">
            <span className="material-symbols-outlined text-primary text-3xl">notifications</span>
          </div>
          <div>
            <h1 className="font-bold text-lg text-primary">Persistencia Políglota</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Alertas</p>
          </div>
        </div>
        <nav className="flex flex-col gap-2">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <span className="material-symbols-outlined">dashboard</span> Dashboard
          </button>
          <button onClick={() => navigate('/medidores')} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <span className="material-symbols-outlined">speed</span> Medidores
          </button>
          <button onClick={() => navigate('/facturas')} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <span className="material-symbols-outlined">receipt_long</span> Facturas
          </button>
          <button className="flex items-center gap-3 p-2 rounded-lg bg-primary/20 dark:bg-primary/30 text-primary font-semibold">
            <span className="material-symbols-outlined">notifications</span> Alertas
          </button>
          <button onClick={() => navigate('/mensajes')} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <span className="material-symbols-outlined">chat</span> Mensajes
          </button>
          {roleId === 1 && (
            <button onClick={() => navigate('/usuarios')} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <span className="material-symbols-outlined">group</span> Usuarios
            </button>
          )}
        </nav>
      </aside>
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-black mb-4">Alertas</h1>
        <p className="text-slate-600 dark:text-slate-300">Listado de alertas del sistema.</p>
      </main>
    </div>
  );
}
