import { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

// Util: formatear fecha UTC a local
function formatFecha(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return iso || ""; }
}

const ESTADOS = ["ACTIVA", "RESUELTA"]; // para selects
const TIPOS = ["SENSOR", "CLIMATICA"]; 

export default function AlertasPage() {
  const { roleId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [alertas, setAlertas] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState("");
  const [detalle, setDetalle] = useState(null); // alerta seleccionada
  const [accionMsg, setAccionMsg] = useState("");
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkInfo, setBulkInfo] = useState({ deleted: 0, total: 0 });

  // Filtros
  const [fTipo, setFTipo] = useState("");
  const [fEstado, setFEstado] = useState("");
  const [fSensorId, setFSensorId] = useState("");
  const [fSearch, setFSearch] = useState("");
  const [fDesde, setFDesde] = useState("");
  const [fHasta, setFHasta] = useState("");

  const cargarMetrics = useCallback(async () => {
    try {
      const res = await api.get("/alertas/metrics");
      setMetrics(res.data);
    } catch (e) {
      // silencioso
    }
  }, []);

  const cargarListado = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", page);
      params.set("size", size);
      params.set("sort", "fechaHora,desc");
      if (fTipo) params.set("tipo", fTipo);
      if (fEstado) params.set("estado", fEstado);
      if (fSensorId) params.set("sensorId", fSensorId.trim());
      if (fSearch) params.set("search", fSearch.trim());
      // Fechas: desde inclusivo, hasta exclusivo en UTC
      if (fDesde) params.set("desde", new Date(fDesde).toISOString());
      if (fHasta) {
        // hasta exclusivo: sumar un día si viene sólo fecha sin tiempo
        const dt = new Date(fHasta);
        // si se ingresó solo fecha, lo convertimos a su medianoche + 1 día
        dt.setHours(0,0,0,0);
        const exclusive = new Date(dt.getTime() + 24*60*60*1000);
        params.set("hasta", exclusive.toISOString());
      }
      const res = await api.get(`/alertas?${params.toString()}`);
      setAlertas(res.data.content || []);
      setTotalPages(res.data.totalPages || 0);
    } catch (e) {
      setError(e.response?.data?.message || "No se pudo cargar alertas");
    } finally {
      setLoading(false);
    }
  }, [page, size, fTipo, fEstado, fSensorId, fSearch, fDesde, fHasta]);

  useEffect(() => { cargarListado(); }, [cargarListado]);
  useEffect(() => { cargarMetrics(); }, [cargarMetrics]);

  const mostrarDetalle = async (id) => {
    try {
      const res = await api.get(`/alertas/${id}`);
      setDetalle(res.data);
    } catch (e) {
      setError("No se pudo cargar detalle");
    }
  };

  const resolver = async (id) => {
    try {
      await api.patch(`/alertas/${id}/resolver`, { comentario: "Resuelta desde UI" });
      setAccionMsg("Alerta resuelta");
      cargarListado();
      mostrarDetalle(id);
      setTimeout(()=>setAccionMsg(""), 2500);
    } catch (e) {
      setError(e.response?.data?.message || "Error al resolver");
    }
  };

  const reabrir = async (id) => {
    try {
      await api.patch(`/alertas/${id}/reabrir`, { motivo: "Reabierta desde UI" });
      setAccionMsg("Alerta reabierta");
      cargarListado();
      mostrarDetalle(id);
      setTimeout(()=>setAccionMsg(""), 2500);
    } catch (e) {
      setError(e.response?.data?.message || "Error al reabrir");
    }
  };

  const limpiarFiltros = () => {
    setFTipo(""); setFEstado(""); setFSensorId(""); setFSearch(""); setFDesde(""); setFHasta(""); setPage(0);
  };

  // Eliminar todas las alertas (admin). Intenta endpoint masivo y luego fallback por cada alerta.
  const eliminarTodas = async () => {
    if (bulkDeleting || alertas.length === 0) return;
    if (!window.confirm(`¿Eliminar ${alertas.length} alertas visibles según los filtros actuales? Esta acción no se puede deshacer.`)) return;
    setBulkDeleting(true); setError(""); setAccionMsg("");
    try {
      // Intento 1: endpoint masivo estándar
      try {
        await api.delete('/alertas');
        setAccionMsg('Todas las alertas eliminadas');
      } catch (e1) {
        const status1 = e1.response?.status;
        if (status1 === 403) {
          setError('Permisos insuficientes (403) para eliminar todas las alertas.');
          return;
        }
        if (status1 === 404 || status1 === 405) {
          // Fallback: eliminar en todas las páginas según filtros actuales
          // 1) Obtener total de páginas con los filtros actuales
          const paramsBase = new URLSearchParams();
          paramsBase.set('size', 100); // borrar en bloques grandes
          paramsBase.set('sort', 'fechaHora,desc');
          if (fTipo) paramsBase.set('tipo', fTipo);
          if (fEstado) paramsBase.set('estado', fEstado);
          if (fSensorId) paramsBase.set('sensorId', fSensorId.trim());
          if (fSearch) paramsBase.set('search', fSearch.trim());
          if (fDesde) paramsBase.set('desde', new Date(fDesde).toISOString());
          if (fHasta) {
            const dt = new Date(fHasta); dt.setHours(0,0,0,0); const exclusive = new Date(dt.getTime()+24*60*60*1000); paramsBase.set('hasta', exclusive.toISOString());
          }

          // 2) Recorremos páginas, juntamos ids y eliminamos de a uno
          let pageIndex = 0; let total = 0; let deleted = 0; let firstRes = null;
          // leer primera página para conocer totalPages
          firstRes = await api.get(`/alertas?${new URLSearchParams({...Object.fromEntries(paramsBase), page: pageIndex}).toString()}`);
          const totalPagesLocal = firstRes.data?.totalPages ?? 1;
          const processPage = async (content) => {
            const ids = (content || []).map(a => a.id).filter(Boolean);
            total += ids.length; setBulkInfo({ deleted, total });
            for (const id of ids) {
              try { await api.delete(`/alertas/${id}`); deleted += 1; setBulkInfo({ deleted, total }); }
              catch (_) { /* continuar con siguientes */ }
            }
          };
          await processPage(firstRes.data?.content || []);
          for (pageIndex = 1; pageIndex < totalPagesLocal; pageIndex++) {
            const resPage = await api.get(`/alertas?${new URLSearchParams({...Object.fromEntries(paramsBase), page: pageIndex}).toString()}`);
            await processPage(resPage.data?.content || []);
          }
          setAccionMsg('Eliminación por lotes completada');
        } else {
          throw e1;
        }
      }
      // Refrescar listado y métricas
      setPage(0);
      await cargarListado();
      await cargarMetrics();
      setTimeout(()=>setAccionMsg(""), 3000);
    } catch (e) {
      setError(e.response?.data?.message || 'Error al eliminar todas las alertas');
    } finally {
      setBulkDeleting(false);
      setBulkInfo({ deleted: 0, total: 0 });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <Navbar />
      <main className="flex-1 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-black">Alertas</h1>
            {roleId === 1 && (
              <button
                onClick={eliminarTodas}
                disabled={bulkDeleting || alertas.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Eliminar todas las alertas visibles según filtros"
              >
                <span className="material-symbols-outlined text-sm">delete_forever</span>
                {bulkDeleting ? 'Eliminando…' : 'Eliminar todas'}
              </button>
            )}
          </div>

          {/* Métricas */}
          {metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="p-4 rounded-xl border bg-white dark:bg-slate-900">
                <p className="text-xs uppercase font-semibold text-slate-500">Activas</p>
                <p className="text-2xl font-bold">{metrics.activas}</p>
              </div>
              <div className="p-4 rounded-xl border bg-white dark:bg-slate-900">
                <p className="text-xs uppercase font-semibold text-slate-500">Hoy</p>
                <p className="text-2xl font-bold">{metrics.nuevasHoy}</p>
              </div>
              <div className="p-4 rounded-xl border bg-white dark:bg-slate-900">
                <p className="text-xs uppercase font-semibold text-slate-500">Semana Resueltas</p>
                <p className="text-2xl font-bold">{metrics.resueltasSemana}</p>
              </div>
              <div className="p-4 rounded-xl border bg-white dark:bg-slate-900">
                <p className="text-xs uppercase font-semibold text-slate-500">Sensor vs Climática</p>
                <p className="text-sm font-semibold">{metrics.sensorActivas} / {metrics.climaticaActivas}</p>
              </div>
            </div>
          )}

          {(error || accionMsg || bulkDeleting) && (
            <div className={`mb-4 rounded-lg p-3 text-sm ${error ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>
              {error || accionMsg || `Eliminando... ${bulkInfo.deleted}/${bulkInfo.total}`}
            </div>
          )}

          {/* Filtros */}
          <div className="flex flex-wrap gap-3 items-end mb-6">
            <label className="flex flex-col">
              <span className="text-xs text-slate-500 mb-1">Tipo</span>
              <select value={fTipo} onChange={(e)=>{setFTipo(e.target.value); setPage(0);}} className="border rounded-lg p-2 text-sm">
                <option value="">Todos</option>
                {TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="flex flex-col">
              <span className="text-xs text-slate-500 mb-1">Estado</span>
              <select value={fEstado} onChange={(e)=>{setFEstado(e.target.value); setPage(0);}} className="border rounded-lg p-2 text-sm">
                <option value="">Todos</option>
                {ESTADOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="flex flex-col">
              <span className="text-xs text-slate-500 mb-1">Sensor ID</span>
              <input value={fSensorId} onChange={(e)=>setFSensorId(e.target.value)} className="border rounded-lg p-2 text-sm" placeholder="SEN-001" />
            </label>
            <label className="flex flex-col">
              <span className="text-xs text-slate-500 mb-1">Buscar</span>
              <input value={fSearch} onChange={(e)=>setFSearch(e.target.value)} className="border rounded-lg p-2 text-sm" placeholder="Texto en descripción" />
            </label>
            <label className="flex flex-col">
              <span className="text-xs text-slate-500 mb-1">Desde</span>
              <input type="date" value={fDesde} onChange={(e)=>setFDesde(e.target.value)} className="border rounded-lg p-2 text-sm" />
            </label>
            <label className="flex flex-col">
              <span className="text-xs text-slate-500 mb-1">Hasta</span>
              <input type="date" value={fHasta} onChange={(e)=>setFHasta(e.target.value)} className="border rounded-lg p-2 text-sm" />
            </label>
            <button onClick={limpiarFiltros} className="h-10 px-4 rounded-lg border bg-white dark:bg-slate-800 text-sm">Limpiar</button>
            <button onClick={()=>{setPage(0); cargarListado();}} className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold">Aplicar</button>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2430]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="p-2 text-left">ID</th>
                  <th className="p-2 text-left">Tipo</th>
                  <th className="p-2 text-left">Sensor</th>
                  <th className="p-2 text-left">Fecha</th>
                  <th className="p-2 text-left">Descripción</th>
                  <th className="p-2 text-left">Estado</th>
                  <th className="p-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="p-4 text-center">Cargando...</td></tr>
                ) : alertas.length === 0 ? (
                  <tr><td colSpan={7} className="p-4 text-center">Sin resultados</td></tr>
                ) : alertas.map(a => (
                  <tr key={a.id} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="p-2">{a.id}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${a.tipo === 'SENSOR' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'}`}>{a.tipo}</span>
                    </td>
                    <td className="p-2">{a.sensorId || '—'}</td>
                    <td className="p-2 whitespace-nowrap">{formatFecha(a.fechaHora)}</td>
                    <td className="p-2 max-w-xs truncate" title={a.descripcion}>{a.descripcion}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${a.estado === 'ACTIVA' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>{a.estado}</span>
                    </td>
                    <td className="p-2 flex gap-2">
                      <button onClick={()=>mostrarDetalle(a.id)} className="text-primary text-xs font-semibold hover:underline">Ver</button>
                      {a.estado === 'ACTIVA' && (
                        <button onClick={()=>resolver(a.id)} className="text-xs text-green-600 hover:underline">Resolver</button>
                      )}
                      {a.estado === 'RESUELTA' && (
                        <button onClick={()=>reabrir(a.id)} className="text-xs text-yellow-600 hover:underline">Reabrir</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-between mt-4 text-sm">
            <div>Pagina {page + 1} de {totalPages}</div>
            <div className="flex gap-2">
              <button disabled={page===0} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 rounded border disabled:opacity-50">Anterior</button>
              <button disabled={page+1>=totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded border disabled:opacity-50">Siguiente</button>
            </div>
          </div>

          {/* Detalle Modal simple */}
          {detalle && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="w-full max-w-lg rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-lg">
                <h2 className="text-xl font-bold mb-2">Alerta #{detalle.id}</h2>
                <p className="text-sm mb-1"><span className="font-semibold">Tipo:</span> {detalle.tipo}</p>
                <p className="text-sm mb-1"><span className="font-semibold">Sensor:</span> {detalle.sensorId || '—'}</p>
                <p className="text-sm mb-1"><span className="font-semibold">Fecha:</span> {formatFecha(detalle.fechaHora)}</p>
                <p className="text-sm mb-1"><span className="font-semibold">Estado:</span> {detalle.estado}</p>
                {detalle.severidad && <p className="text-sm mb-1"><span className="font-semibold">Severidad:</span> {detalle.severidad}</p>}
                {detalle.origen && <p className="text-sm mb-3"><span className="font-semibold">Origen:</span> {detalle.origen}</p>}
                <p className="text-sm mb-4 whitespace-pre-line border rounded p-2 bg-slate-50 dark:bg-slate-800" style={{maxHeight:'160px', overflowY:'auto'}}>{detalle.descripcion}</p>
                <div className="flex gap-3">
                  {detalle.estado === 'ACTIVA' && <button onClick={()=>resolver(detalle.id)} className="px-4 py-2 rounded bg-green-600 text-white text-sm">Resolver</button>}
                  {detalle.estado === 'RESUELTA' && <button onClick={()=>reabrir(detalle.id)} className="px-4 py-2 rounded bg-yellow-500 text-white text-sm">Reabrir</button>}
                  <button onClick={()=>setDetalle(null)} className="px-4 py-2 rounded bg-slate-200 dark:bg-slate-700 text-sm">Cerrar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
