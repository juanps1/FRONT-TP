import { useEffect, useState } from "react";
import api from "../api/client";
import Navbar from "../components/Navbar";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    sensores: 0,
    mediciones: 0,
  });
  const [statsError, setStatsError] = useState({ sensores: false, mediciones: false });
  const [actividad, setActividad] = useState([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const errors = { sensores: false, mediciones: false };
    
    try {
      // Cargar sensores
      let sensoresCount = 0;
      try {
        const sensoresRes = await api.get("/sensores");
        sensoresCount = (sensoresRes.data || []).length;
      } catch (err) {
        errors.sensores = true;
        console.error('Error cargando sensores:', err.response?.status);
      }
      
      // Cargar mediciones
      let medicionesCount = 0;
      try {
        const medicionesRes = await api.get("/mediciones");
        medicionesCount = (medicionesRes.data || []).length;
      } catch (err) {
        errors.mediciones = true;
        console.error('Error cargando mediciones:', err.response?.status);
      }
      
      setStats({
        sensores: sensoresCount,
        mediciones: medicionesCount,
      });
      setStatsError(errors);

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
      <Navbar />

      {/* Main */}
      <main className="flex-grow container mx-auto px-6 py-10">
        <h1 className="text-3xl font-black mb-8 text-slate-900 dark:text-white">
          ¡Bienvenido de nuevo!
        </h1>

        {/* Cards: solo sensores y mediciones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          <Card 
            titulo="Sensores" 
            valor={stats.sensores} 
            color="orange" 
            icon="speed"
            error={statsError.sensores}
          />
          <Card 
            titulo="Mediciones" 
            valor={stats.mediciones} 
            color="green" 
            icon="monitoring"
            error={statsError.mediciones}
          />
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

function Card({ titulo, valor, color, icon, error }) {
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
        <h2 className="text-2xl font-bold">{error ? '—' : valor}</h2>
        <p className="text-sm text-slate-500">{titulo}</p>
        {error && (
          <p className="text-xs text-red-500 dark:text-red-400 mt-1">
            ⚠️ Endpoint no disponible
          </p>
        )}
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
