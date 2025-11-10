import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const TIPOS = [
  {
    id: 'informe_max_min',
    nombre: 'Informe Max/Min',
    desc: 'Obtiene las temperaturas y humedades máximas y mínimas registradas en el período seleccionado.'
  },
  {
    id: 'informe_promedio',
    nombre: 'Informe Promedio',
    desc: 'Calcula los promedios de temperatura y humedad en el período seleccionado.'
  },
  {
    id: 'alerta',
    nombre: 'Alerta',
    desc: 'Genera alertas para mediciones que superen los umbrales configurados.'
  },
  {
    id: 'consulta',
    nombre: 'Consulta',
    desc: 'Obtiene el listado completo de mediciones de sensores en el período.'
  }
];

const EstadoBadge = ({ estado }) => {
  const map = {
    pendiente: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    en_proceso: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    completado: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[estado] || 'bg-slate-100 dark:bg-slate-800'}`}>
      {estado}
    </span>
  );
};

export default function ProcesosPage() {
  const navigate = useNavigate();
  const { email } = useAuth();
  const [currentUserId, setCurrentUserId] = useState(null);

  // Formulario
  const [tipoProceso, setTipoProceso] = useState('informe_max_min');
  const [params, setParams] = useState({
    ciudad: '',
    pais: '',
    sensorId: '',
    fechaDesde: '',
    fechaHasta: '',
    temperaturaMin: '',
    temperaturaMax: '',
    humedadMin: '',
    humedadMax: ''
  });
  const [formMsg, setFormMsg] = useState('');
  const [formErr, setFormErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Lista
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [solicitudes, setSolicitudes] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  // Resultado
  const [resultadoOpen, setResultadoOpen] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [resultadoErr, setResultadoErr] = useState('');
  const [pollingMap, setPollingMap] = useState({}); // id -> intervalId

  // Obtener ID usuario desde email
  useEffect(() => {
    const fetchUserId = async () => {
      if (!email) return;
      try {
        const res = await api.get('/usuarios');
        const user = (res.data || []).find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (user) setCurrentUserId(user.id);
      } catch (e) { console.error(e); }
    };
    fetchUserId();
  }, [email]);

  // Cargar mis solicitudes
  const cargarSolicitudes = async () => {
    if (!currentUserId) return;
    try {
      setLoadingList(true);
      const res = await api.get(`/solicitudes-proceso/usuario/${currentUserId}`);
      const lista = (res.data || []).sort((a,b) => new Date(b.fechaSolicitud) - new Date(a.fechaSolicitud));
      setSolicitudes(lista);
    } catch (e) {
      console.error('Error cargando solicitudes', e);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!currentUserId) return;
    cargarSolicitudes();
    const id = setInterval(cargarSolicitudes, 10000);
    return () => clearInterval(id);
  }, [currentUserId]);

  // Validaciones
  const validarFormulario = () => {
    // Al menos un filtro geográfico
    if (!params.sensorId && !params.ciudad && !params.pais) {
      setFormErr('Debes completar al menos Ciudad, País o Sensor ID');
      return false;
    }
    if (!params.fechaDesde || !params.fechaHasta) {
      setFormErr('Las fechas desde/hasta son obligatorias');
      return false;
    }
    const d1 = new Date(params.fechaDesde);
    const d2 = new Date(params.fechaHasta);
    if (Number.isNaN(d1.valueOf()) || Number.isNaN(d2.valueOf()) || d2 < d1) {
      setFormErr('La fecha Hasta debe ser mayor o igual a Desde');
      return false;
    }
    // Umbrales numéricos
    const nums = ['temperaturaMin','temperaturaMax','humedadMin','humedadMax'];
    for (const k of nums) {
      if (params[k] !== '' && isNaN(Number(params[k]))) {
        setFormErr('Los umbrales deben ser numéricos');
        return false;
      }
    }
    setFormErr('');
    return true;
  };

  const solicitarProceso = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;
    try {
      setSubmitting(true);
      setFormMsg('Solicitud creada, procesando en segundo plano...');
      const body = {
        usuarioId: currentUserId,
        tipoProceso,
        parametros: buildParametros(tipoProceso, params)
      };
      const res = await api.post('/solicitudes-proceso', body);
      // Agregar al inicio
      setSolicitudes(prev => [res.data, ...prev]);
      // iniciar polling individual de esa solicitud
      startPollingSolicitud(res.data.id);
      // limpiar mensajes luego de unos segundos
      setTimeout(()=> setFormMsg(''), 3000);
    } catch (err) {
      console.error('Error al crear solicitud', err);
      setFormErr(err.response?.data?.message || 'No se pudo crear la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  const buildParametros = (tipo, p) => {
    const base = {
      ciudad: p.ciudad || undefined,
      pais: p.pais || undefined,
      sensorId: p.sensorId || undefined,
      fechaDesde: p.fechaDesde,
      fechaHasta: p.fechaHasta,
    };
    if (tipo === 'alerta') {
      return {
        ...base,
        temperaturaMin: p.temperaturaMin !== '' ? Number(p.temperaturaMin) : undefined,
        temperaturaMax: p.temperaturaMax !== '' ? Number(p.temperaturaMax) : undefined,
        humedadMin: p.humedadMin !== '' ? Number(p.humedadMin) : undefined,
        humedadMax: p.humedadMax !== '' ? Number(p.humedadMax) : undefined,
      };
    }
    return base;
  };

  const startPollingSolicitud = (id) => {
    if (pollingMap[id]) return; // ya existe
    const intervalId = setInterval(async () => {
      try {
        const r = await api.get(`/solicitudes-proceso/${id}`);
        setSolicitudes(prev => prev.map(s => s.id === id ? r.data : s));
        if (r.data.estado === 'completado' || r.data.estado === 'error') {
          clearInterval(intervalId);
          setPollingMap(pm => { const n = { ...pm }; delete n[id]; return n; });
        }
      } catch (e) {
        console.error('Polling solicitud falló', e);
      }
    }, 5000);
    setPollingMap(prev => ({ ...prev, [id]: intervalId }));
  };

  const verResultado = async (sol) => {
    try {
      setSolicitudSeleccionada(sol);
      setResultadoErr('');
      const r = await api.get(`/solicitudes-proceso/${sol.id}/resultado`);
      setResultado(r.data);
      setResultadoOpen(true);
    } catch (e) {
      setResultado(null);
      setResultadoErr(e.response?.data?.message || 'No se pudo obtener el resultado');
      setResultadoOpen(true);
    }
  };

  const descargarPdf = (id) => {
    window.open(`${api.defaults.baseURL}/solicitudes-proceso/${id}/descargar-pdf`, '_blank');
  };

  const reintentar = async (id) => {
    try {
      await api.post(`/solicitudes-proceso/${id}/reejecutar`);
      // Reiniciar polling de ese ID
      startPollingSolicitud(id);
      cargarSolicitudes();
    } catch (e) {
      alert(e.response?.data?.message || 'No se pudo reintentar');
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar esta solicitud?')) return;
    try {
      await api.delete(`/solicitudes-proceso/${id}`);
      setSolicitudes(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      alert(e.response?.data?.message || 'No se pudo eliminar');
    }
  };

  const solicitudesFiltradas = useMemo(() => {
    return solicitudes.filter(s => (!filtroEstado || s.estado === filtroEstado) && (!filtroTipo || s.tipoProceso === filtroTipo));
  }, [solicitudes, filtroEstado, filtroTipo]);

  return (
    <div className="flex h-screen bg-background-light dark:bg-background-dark text-[#212529] dark:text-gray-200">
      {/* Sidebar navegación */}
      <aside className="w-64 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#182431] p-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-full bg-primary/10 p-3">
            <span className="material-symbols-outlined text-primary text-3xl">analytics</span>
          </div>
          <div>
            <h1 className="font-bold text-lg text-primary">Procesos</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Análisis de datos</p>
          </div>
        </div>
        <nav className="flex flex-col gap-2">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><span className="material-symbols-outlined">dashboard</span> Dashboard</button>
          <button onClick={() => navigate('/medidores')} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><span className="material-symbols-outlined">speed</span> Medidores</button>
          <button onClick={() => navigate('/facturas')} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><span className="material-symbols-outlined">receipt_long</span> Facturas</button>
          <button onClick={() => navigate('/alertas')} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><span className="material-symbols-outlined">notifications</span> Alertas</button>
          <button onClick={() => navigate('/mensajes')} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><span className="material-symbols-outlined">chat</span> Mensajes</button>
          <button className="flex items-center gap-3 p-2 rounded-lg bg-primary/20 dark:bg-primary/30 text-primary font-semibold"><span className="material-symbols-outlined">analytics</span> Procesos</button>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-black mb-6">Gestión de Procesos de Análisis</h1>

          {/* Panel Solicitud */}
          <section className="mb-8 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#182431]">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-bold">Nueva Solicitud</h2>
              <p className="text-sm text-gray-500">Solicita informes o análisis que se procesan en segundo plano.</p>
            </div>
            <form onSubmit={solicitarProceso} className="p-6 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              <label className="flex flex-col">
                <span className="text-sm mb-2">Tipo de Proceso</span>
                <select value={tipoProceso} onChange={(e)=>setTipoProceso(e.target.value)} className="border rounded-lg p-2">
                  {TIPOS.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
                <span className="text-xs text-gray-500 mt-1">{TIPOS.find(t=>t.id===tipoProceso)?.desc}</span>
              </label>

              <label className="flex flex-col">
                <span className="text-sm mb-2">Ciudad (opcional)</span>
                <input value={params.ciudad} onChange={(e)=>setParams({...params, ciudad:e.target.value})} className="border rounded-lg p-2" placeholder="Ej: Buenos Aires"/>
              </label>

              <label className="flex flex-col">
                <span className="text-sm mb-2">País (opcional)</span>
                <input value={params.pais} onChange={(e)=>setParams({...params, pais:e.target.value})} className="border rounded-lg p-2" placeholder="Ej: Argentina"/>
              </label>

              <label className="flex flex-col">
                <span className="text-sm mb-2">Sensor ID (opcional)</span>
                <input value={params.sensorId} onChange={(e)=>setParams({...params, sensorId:e.target.value})} className="border rounded-lg p-2" placeholder="Ej: SENSOR-001"/>
              </label>

              <label className="flex flex-col">
                <span className="text-sm mb-2">Fecha Desde</span>
                <input type="date" value={params.fechaDesde} onChange={(e)=>setParams({...params, fechaDesde:e.target.value})} className="border rounded-lg p-2" required/>
              </label>

              <label className="flex flex-col">
                <span className="text-sm mb-2">Fecha Hasta</span>
                <input type="date" value={params.fechaHasta} onChange={(e)=>setParams({...params, fechaHasta:e.target.value})} className="border rounded-lg p-2" required/>
              </label>

              {tipoProceso === 'alerta' && (
                <div className="md:col-span-2 lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <label className="flex flex-col">
                    <span className="text-sm mb-2">Temp. Min</span>
                    <input type="number" value={params.temperaturaMin} onChange={(e)=>setParams({...params, temperaturaMin:e.target.value})} className="border rounded-lg p-2"/>
                  </label>
                  <label className="flex flex-col">
                    <span className="text-sm mb-2">Temp. Max</span>
                    <input type="number" value={params.temperaturaMax} onChange={(e)=>setParams({...params, temperaturaMax:e.target.value})} className="border rounded-lg p-2"/>
                  </label>
                  <label className="flex flex-col">
                    <span className="text-sm mb-2">Humedad Min</span>
                    <input type="number" value={params.humedadMin} onChange={(e)=>setParams({...params, humedadMin:e.target.value})} className="border rounded-lg p-2"/>
                  </label>
                  <label className="flex flex-col">
                    <span className="text-sm mb-2">Humedad Max</span>
                    <input type="number" value={params.humedadMax} onChange={(e)=>setParams({...params, humedadMax:e.target.value})} className="border rounded-lg p-2"/>
                  </label>
                </div>
              )}

              {formErr && <div className="md:col-span-2 lg:col-span-3 p-3 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-sm">{formErr}</div>}
              {formMsg && <div className="md:col-span-2 lg:col-span-3 p-3 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-sm">{formMsg}</div>}

              <div className="md:col-span-2 lg:col-span-3 flex justify-end">
                <button type="submit" disabled={submitting || !currentUserId} className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50">
                  {submitting ? 'Solicitando...' : 'Solicitar Proceso'}
                </button>
              </div>
            </form>
          </section>

          {/* Lista de mis procesos */}
          <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#182431]">
            <div className="p-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-bold">Mis Procesos</h2>
              <div className="flex items-center gap-3 text-sm">
                <label className="flex items-center gap-2">
                  Estado:
                  <select value={filtroEstado} onChange={(e)=>setFiltroEstado(e.target.value)} className="border rounded p-1">
                    <option value="">Todos</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="en_proceso">En proceso</option>
                    <option value="completado">Completado</option>
                    <option value="error">Error</option>
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  Tipo:
                  <select value={filtroTipo} onChange={(e)=>setFiltroTipo(e.target.value)} className="border rounded p-1">
                    <option value="">Todos</option>
                    {TIPOS.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </label>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 dark:border-gray-800 text-gray-500 uppercase">
                  <tr>
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Tipo</th>
                    <th className="px-6 py-3">Estado</th>
                    <th className="px-6 py-3">Fecha Solicitud</th>
                    <th className="px-6 py-3">Finalización</th>
                    <th className="px-6 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingList ? (
                    <tr><td colSpan={6} className="px-6 py-4">Cargando...</td></tr>
                  ) : solicitudesFiltradas.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-4 text-gray-500">Sin solicitudes</td></tr>
                  ) : (
                    solicitudesFiltradas.map(s => (
                      <tr key={s.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-4 font-medium">#{s.id}</td>
                        <td className="px-6 py-4">{TIPOS.find(t=>t.id===s.tipoProceso)?.nombre || s.tipoProceso}</td>
                        <td className="px-6 py-4"><EstadoBadge estado={s.estado}/></td>
                        <td className="px-6 py-4">{s.fechaSolicitud ? new Date(s.fechaSolicitud).toLocaleString() : '—'}</td>
                        <td className="px-6 py-4">{s.fechaFinalizacion ? new Date(s.fechaFinalizacion).toLocaleString() : '—'}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            {s.estado === 'completado' && (
                              <>
                                <button onClick={() => verResultado(s)} className="h-8 px-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700" title="Ver resultado">
                                  <span className="material-symbols-outlined">visibility</span>
                                </button>
                                <button onClick={() => descargarPdf(s.id)} className="h-8 px-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700" title="Descargar PDF">
                                  <span className="material-symbols-outlined">download</span>
                                </button>
                              </>
                            )}
                            {s.estado === 'error' && (
                              <button onClick={() => reintentar(s.id)} className="h-8 px-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-amber-600" title="Reintentar">
                                <span className="material-symbols-outlined">refresh</span>
                              </button>
                            )}
                            <button onClick={() => eliminar(s.id)} className="h-8 px-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-red-600" title="Eliminar">
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {/* Modal Resultado */}
      {resultadoOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-3xl shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-4">
              <div>
                <h3 className="font-bold text-lg">Resultado del Proceso #{solicitudSeleccionada?.id}</h3>
                <p className="text-xs text-slate-500">{TIPOS.find(t=>t.id===solicitudSeleccionada?.tipoProceso)?.nombre} — Parámetros: {solicitudSeleccionada?.parametrosJson}</p>
              </div>
              <button onClick={()=>setResultadoOpen(false)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              {resultadoErr ? (
                <div className="p-3 bg-red-100 text-red-700 rounded">{resultadoErr}</div>
              ) : !resultado ? (
                <div className="p-3 text-slate-500">Cargando resultado...</div>
              ) : (
                <ResultadoViewer tipo={solicitudSeleccionada?.tipoProceso} data={resultado} />
              )}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between">
              <button onClick={()=>setResultadoOpen(false)} className="px-4 py-2 rounded bg-slate-200 dark:bg-slate-700">Cerrar</button>
              {solicitudSeleccionada?.estado === 'completado' && (
                <button onClick={()=>descargarPdf(solicitudSeleccionada.id)} className="px-4 py-2 rounded bg-primary text-white font-semibold">Descargar PDF</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultadoViewer({ tipo, data }) {
  if (tipo === 'informe_max_min') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CardKV k="Temp. Máxima" v={`${data.temperaturaMax} °C`} />
        <CardKV k="Temp. Mínima" v={`${data.temperaturaMin} °C`} />
        <CardKV k="Humedad Máx." v={`${data.humedadMax} %`} />
        <CardKV k="Humedad Mín." v={`${data.humedadMin} %`} />
        <CardKV k="Total Mediciones" v={data.totalMediciones} />
      </div>
    );
  }
  if (tipo === 'informe_promedio') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <CardKV k="Temp. Promedio" v={`${data.temperaturaPromedio} °C`} />
        <CardKV k="Humedad Prom." v={`${data.humedadPromedio} %`} />
        <CardKV k="Total Mediciones" v={data.totalMediciones} />
      </div>
    );
  }
  if (tipo === 'alerta') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <CardKV k="Alertas generadas" v={data.alertasGeneradas} />
        <CardKV k="Fuera de rango" v={data.medicionesFueraRango} />
        <CardKV k="Total analizadas" v={data.totalMedicionesAnalizadas} />
      </div>
    );
  }
  if (tipo === 'consulta') {
    const rows = Array.isArray(data.mediciones) ? data.mediciones.slice(0,50) : [];
    return (
      <div>
        <CardKV k="Total Registros" v={data.totalRegistros} />
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Sensor</th>
                <th className="px-3 py-2 text-left">Fecha Hora</th>
                <th className="px-3 py-2 text-left">Temp (°C)</th>
                <th className="px-3 py-2 text-left">Humedad (%)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m,i) => (
                <tr key={i} className="border-b">
                  <td className="px-3 py-2">{m.sensorId}</td>
                  <td className="px-3 py-2">{new Date(m.fechaHora).toLocaleString()}</td>
                  <td className="px-3 py-2">{m.temperatura}</td>
                  <td className="px-3 py-2">{m.humedad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  return <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>;
}

function CardKV({ k, v }) {
  return (
    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800">
      <p className="text-xs uppercase text-slate-500 mb-1">{k}</p>
      <p className="text-lg font-bold">{v}</p>
    </div>
  );
}
