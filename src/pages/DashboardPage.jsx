import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { roleId } = useAuth();
  const [stats, setStats] = useState({
    usuarios: 0,
    facturas: 0,
    alertas: 0,
    medidores: 0,
  });
  const [actividad, setActividad] = useState([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [usuarios, facturas, alertas, mediciones] = await Promise.all([
        api.get("/usuarios"),
        api.get("/facturas"),
        api.get("/alertas"),
        api.get("/mediciones"),
      ]);
      setStats({
        usuarios: usuarios.data.length,
        facturas: facturas.data.length,
        alertas: alertas.data.length,
        medidores: mediciones.data.length,
      });

      // Actividad simulada, pero podés reemplazar con /api/logs si tenés
      setActividad([
        { tipo: "factura", texto: "Factura #7892 pagada por Cliente S.A.", tiempo: "Hace 5 min" },
        { tipo: "alerta", texto: "Alto consumo en Medidor #MTR-015", tiempo: "Hace 30 min" },
        { tipo: "usuario", texto: "Nuevo usuario 'j.perez' registrado.", tiempo: "Hace 2 horas" },
        { tipo: "medidor", texto: "Medidor #MTR-891 añadido al sistema.", tiempo: "Hace 1 día" },
      ]);
    } catch (err) {
      console.error("Error al cargar el dashboard:", err);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-display">
      {/* Header */}
      <header className="sticky top-0 z-10 w-full bg-white/80 dark:bg-background-dark/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-2xl">polymer</span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Persistencia Políglota</h2>
          </div>
          <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
            <a className="text-primary font-semibold">Dashboard</a>
            <a href="/medidores" className="hover:text-primary">Medidores</a>
            <a href="/facturas" className="hover:text-primary">Facturas</a>
            <a href="/alertas" className="hover:text-primary">Alertas</a>
            <a href="/mensajes" className="hover:text-primary">Mensajes</a>
            <a href="/procesos" className="hover:text-primary">Procesos</a>
            {roleId === 1 && (
              <a href="/usuarios" className="hover:text-primary">Usuarios</a>
            )}
          </nav>
          <button className="bg-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-primary/90">
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow container mx-auto px-6 py-10">
        <h1 className="text-3xl font-black mb-8 text-slate-900 dark:text-white">
          ¡Bienvenido de nuevo, Admin!
        </h1>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card titulo="Total de Usuarios" valor={stats.usuarios} color="blue" icon="group" />
          <Card titulo="Facturas Generadas" valor={stats.facturas} color="green" icon="receipt_long" />
          <Card titulo="Alertas Activas" valor={stats.alertas} color="red" icon="notifications_active" />
          <Card titulo="Medidores Activos" valor={stats.medidores} color="orange" icon="speed" />
        </div>

        {/* Secciones */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Actividad reciente */}
          <div className="lg:col-span-2 flex flex-col gap-4 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Actividad Reciente</h3>
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {actividad.map((a, i) => (
                <div key={i} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center size-8 rounded-full ${
                        a.tipo === "factura"
                          ? "bg-green-100 dark:bg-green-900/40"
                          : a.tipo === "alerta"
                          ? "bg-red-100 dark:bg-red-900/40"
                          : a.tipo === "usuario"
                          ? "bg-blue-100 dark:bg-blue-900/40"
                          : "bg-slate-100 dark:bg-slate-800"
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {a.tipo === "factura"
                          ? "check"
                          : a.tipo === "alerta"
                          ? "priority_high"
                          : a.tipo === "usuario"
                          ? "person_add"
                          : "add_circle"}
                      </span>
                    </div>
                    <p className="text-sm">{a.texto}</p>
                  </div>
                  <span className="text-xs text-slate-400">{a.tiempo}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Estado del sistema */}
          <div className="flex flex-col gap-4 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Estado del Sistema</h3>
            <EstadoSistema titulo="API" estado="Operacional" color="green" progreso={100} />
            <EstadoSistema titulo="Base de Datos" estado="Operacional" color="green" progreso={100} />
            <EstadoSistema titulo="Servicio de Alertas" estado="Degradado" color="orange" progreso={80} />
          </div>
        </div>
      </main>
    </div>
  );
}

function Card({ titulo, valor, color, icon }) {
  const colores = {
    blue: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
    green: "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400",
    red: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",
    orange: "bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400",
  };
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 transition-transform hover:-translate-y-1">
      <div className={`flex items-center justify-center size-10 rounded-lg ${colores[color]}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold">{valor}</h2>
        <p className="text-sm text-slate-500">{titulo}</p>
      </div>
    </div>
  );
}

function EstadoSistema({ titulo, estado, color, progreso }) {
  const colorMap = {
    green: "bg-green-500 text-green-600 dark:text-green-400",
    orange: "bg-orange-500 text-orange-500 dark:text-orange-400",
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-sm">
        <span>{titulo}</span>
        <span className={`font-semibold ${colorMap[color]}`}>{estado}</span>
      </div>
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
        <div className={`${colorMap[color]} h-1.5 rounded-full`} style={{ width: `${progreso}%` }}></div>
      </div>
    </div>
  );
}
