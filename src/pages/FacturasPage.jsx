import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

export default function FacturasPage() {
  const navigate = useNavigate();
  const { roleId, email } = useAuth();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");
  const [msg, setMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");
  
  // Modal generar factura
  const generarModalRef = useRef(null);
  const [generarForm, setGenerarForm] = useState({
    usuarioId: "",
    fechaInicio: "",
    fechaFin: "",
    observaciones: ""
  });
  const [generando, setGenerando] = useState(false);

  // Modal pagar factura
  const pagarModalRef = useRef(null);
  const [pagarForm, setPagarForm] = useState({
    facturaId: null,
    montoPagado: "",
    metodoPago: "transferencia"
  });
  const [pagando, setPagando] = useState(false);

  // Modal ver pagos
  const pagosModalRef = useRef(null);
  const [pagosFactura, setPagosFactura] = useState([]);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);

  // Calcular si hay facturas vencidas
  const tieneFacturasVencidas = facturas.some(f => f.estado?.toUpperCase() === "VENCIDA");
  const cantidadVencidas = facturas.filter(f => f.estado?.toUpperCase() === "VENCIDA").length;
  const cantidadPendientes = facturas.filter(f => f.estado?.toUpperCase() === "PENDIENTE").length;

  // Obtener ID usuario desde email - usando endpoint de perfil actual
  useEffect(() => {
    const fetchUserId = async () => {
      if (!email) return;
      try {
        // Intentar primero obtener el perfil del usuario actual
        let user = null;
        // Usar ID fijo para demo
        const userId = 1;
        setCurrentUserId(userId);
        setGenerarForm(prev => ({ ...prev, usuarioId: userId }));
        return;
        if (user) {
          setCurrentUserId(user.id);
          setGenerarForm(prev => ({ ...prev, usuarioId: user.id }));
        }
      } catch (e) { 
        console.error('Error obteniendo usuario:', e);
        // Para demo, usar ID 1 si no se puede obtener
        const userId = 1;
        setCurrentUserId(userId);
        setGenerarForm(prev => ({ ...prev, usuarioId: userId }));
      }
    };
    fetchUserId();
  }, [email]);

  useEffect(() => {
    if (currentUserId) cargarFacturas();
  }, [currentUserId]);

  const cargarFacturas = async () => {
    if (!currentUserId) return;
    try {
      // Si es admin, carga todas; si no, solo las del usuario
      const endpoint = roleId === 1 ? "/facturas" : `/facturas/usuario/${currentUserId}`;
      const res = await api.get(endpoint);
      setFacturas(res.data || []);
    } catch (err) {
      console.error("Error al cargar facturas:", err);
    }
  };

  const generarFactura = async (e) => {
    e.preventDefault();
    setGenerando(true);
    setErrMsg("");
    setMsg("");
    try {
      const res = await api.post("/facturas/generar", {
        usuarioId: Number(generarForm.usuarioId),
        fechaInicio: generarForm.fechaInicio,
        fechaFin: generarForm.fechaFin,
        observaciones: generarForm.observaciones || null
      });
      setFacturas(prev => [res.data, ...prev]);
      setMsg("Factura generada correctamente");
      setTimeout(() => setMsg(""), 3000);
      setGenerarForm({ usuarioId: currentUserId || "", fechaInicio: "", fechaFin: "", observaciones: "" });
      generarModalRef.current?.close();
    } catch (err) {
      console.error("Error al generar factura:", err);
      setErrMsg(err.response?.data?.mensaje || err.response?.data?.message || "No se pudo generar la factura");
    } finally {
      setGenerando(false);
    }
  };

  const abrirPagar = (factura) => {
    setPagarForm({
      facturaId: factura.id,
      montoPagado: factura.monto || "",
      metodoPago: "transferencia"
    });
    pagarModalRef.current?.showModal();
  };

  const registrarPago = async (e) => {
    e.preventDefault();
    setPagando(true);
    setErrMsg("");
    setMsg("");
    try {
      const res = await api.post("/pagos/registrar", {
        facturaId: pagarForm.facturaId,
        montoPagado: Number(pagarForm.montoPagado),
        metodoPago: pagarForm.metodoPago
      });
      // Actualizar factura en la lista
      setFacturas(prev => prev.map(f => f.id === res.data.facturaActualizada.id ? res.data.facturaActualizada : f));
      setMsg(`Pago registrado. Factura ${res.data.facturaActualizada.estado}`);
      setTimeout(() => setMsg(""), 3000);
      pagarModalRef.current?.close();
    } catch (err) {
      console.error("Error al registrar pago:", err);
      setErrMsg(err.response?.data?.mensaje || err.response?.data?.message || "No se pudo registrar el pago");
    } finally {
      setPagando(false);
    }
  };

  const verPagos = async (factura) => {
    try {
      const res = await api.get(`/pagos/factura/${factura.id}`);
      setPagosFactura(res.data || []);
      setFacturaSeleccionada(factura);
      pagosModalRef.current?.showModal();
    } catch (err) {
      console.error("Error al cargar pagos:", err);
    }
  };

  const facturasFiltradas = facturas.filter((f) => {
    const coincideBusqueda =
      f.usuarioId?.toString().includes(busqueda) ||
      f.id?.toString().includes(busqueda);
    const matchEstado = filtroEstado === "Todos" || f.estado?.toUpperCase() === filtroEstado.toUpperCase();
    
    // Filtro por fechas
    let matchFecha = true;
    if (filtroFechaDesde) {
      const fechaEmision = new Date(f.fechaEmision);
      const fechaDesde = new Date(filtroFechaDesde);
      matchFecha = matchFecha && fechaEmision >= fechaDesde;
    }
    if (filtroFechaHasta) {
      const fechaEmision = new Date(f.fechaEmision);
      const fechaHasta = new Date(filtroFechaHasta);
      matchFecha = matchFecha && fechaEmision <= fechaHasta;
    }
    
    return coincideBusqueda && matchEstado && matchFecha;
  });

  return (
    <div className="bg-background-light dark:bg-background-dark text-[#212529] dark:text-gray-200 min-h-screen">
      <Navbar />

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-black">Gestión de Facturas</h1>
              <p className="text-sm text-slate-500 mt-1">Cada proceso completado genera automáticamente su factura individual</p>
            </div>
            <button
              onClick={() => generarModalRef.current?.showModal()}
              className="flex items-center gap-2 bg-primary text-white font-bold px-4 py-2 rounded-lg shadow hover:bg-primary/90"
              title="Generar factura consolidada manual (opcional)"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Generar Consolidada
            </button>
          </div>

          {/* Mensajes */}
          {tieneFacturasVencidas && (
            <div className="mb-4 rounded-lg p-4 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-l-4 border-red-600">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-2xl">warning</span>
                <div>
                  <p className="font-bold">⚠️ Tienes {cantidadVencidas} factura{cantidadVencidas > 1 ? 's' : ''} vencida{cantidadVencidas > 1 ? 's' : ''}</p>
                  <p className="text-sm mt-1">No podrás crear nuevas solicitudes de proceso hasta que regularices tu situación. Por favor, realiza los pagos pendientes.</p>
                </div>
              </div>
            </div>
          )}

          {/* Resumen de facturas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <p className="text-xs uppercase font-semibold text-slate-500 mb-1">Total Facturas</p>
              <p className="text-2xl font-bold">{facturas.length}</p>
            </div>
            <div className="p-4 rounded-xl border border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20">
              <p className="text-xs uppercase font-semibold text-yellow-700 dark:text-yellow-300 mb-1">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{cantidadPendientes}</p>
            </div>
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20">
              <p className="text-xs uppercase font-semibold text-red-700 dark:text-red-300 mb-1">Vencidas</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">{cantidadVencidas}</p>
            </div>
            <div className="p-4 rounded-xl border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20">
              <p className="text-xs uppercase font-semibold text-green-700 dark:text-green-300 mb-1">Pagadas</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{facturas.filter(f => f.estado?.toUpperCase() === "PAGADA").length}</p>
            </div>
          </div>
          
          {(msg || errMsg) && (
            <div
              className={`mb-4 rounded-lg p-3 text-sm ${
                errMsg
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                  : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
              }`}
            >
              {errMsg || msg}
            </div>
          )}

          {/* Barra de herramientas */}
          <div className="flex flex-wrap items-end gap-3 border-b border-gray-200 dark:border-gray-800 pb-4 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400">search</span>
              <input
                type="text"
                className="pl-10 border rounded-lg p-2 w-full"
                placeholder="Buscar por ID..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            
            <label className="flex flex-col">
              <span className="text-xs text-slate-500 mb-1">Estado</span>
              <select
                className="border rounded-lg p-2 text-sm"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option>Todos</option>
                <option>PENDIENTE</option>
                <option>PAGADA</option>
                <option>VENCIDA</option>
              </select>
            </label>

            <label className="flex flex-col">
              <span className="text-xs text-slate-500 mb-1">Desde</span>
              <input
                type="date"
                className="border rounded-lg p-2 text-sm"
                value={filtroFechaDesde}
                onChange={(e) => setFiltroFechaDesde(e.target.value)}
              />
            </label>

            <label className="flex flex-col">
              <span className="text-xs text-slate-500 mb-1">Hasta</span>
              <input
                type="date"
                className="border rounded-lg p-2 text-sm"
                value={filtroFechaHasta}
                onChange={(e) => setFiltroFechaHasta(e.target.value)}
              />
            </label>

            <button
              onClick={() => {
                setBusqueda("");
                setFiltroEstado("Todos");
                setFiltroFechaDesde("");
                setFiltroFechaHasta("");
              }}
              className="px-3 py-2 rounded-lg border bg-white dark:bg-slate-800 text-sm hover:bg-slate-50"
            >
              Limpiar
            </button>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#182431]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-800 text-gray-500 uppercase bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Usuario ID</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3">Emisión</th>
                  <th className="px-6 py-3">Vencimiento</th>
                  <th className="px-6 py-3">Monto</th>
                  <th className="px-6 py-3">Observaciones</th>
                  <th className="px-6 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {facturasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                      No hay facturas que mostrar
                    </td>
                  </tr>
                ) : (
                  facturasFiltradas.map((f) => (
                    <tr key={f.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 font-medium">#{f.id}</td>
                      <td className="px-6 py-4">{f.usuarioId}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                            f.estado?.toUpperCase() === "PAGADA"
                              ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300"
                              : f.estado?.toUpperCase() === "PENDIENTE"
                              ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300"
                              : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300"
                          }`}
                        >
                          {f.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4">{f.fechaEmision?.slice(0, 10)}</td>
                      <td className="px-6 py-4">{f.fechaVencimiento?.slice(0, 10)}</td>
                      <td className="px-6 py-4 font-semibold">${f.monto?.toFixed(2)}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate" title={f.observaciones}>{f.observaciones || "—"}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => verPagos(f)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-semibold"
                            title="Ver pagos"
                          >
                            <span className="material-symbols-outlined text-sm text-gray-500">visibility</span>
                            Ver Pagos
                          </button>
                          {(f.estado?.toUpperCase() === "PENDIENTE" || f.estado?.toUpperCase() === "VENCIDA") && (
                            <button
                              onClick={() => abrirPagar(f)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 text-xs font-semibold"
                              title="Registrar pago"
                            >
                              <span className="material-symbols-outlined text-sm">payment</span>
                              Pagar
                            </button>
                          )}
                          {f.estado?.toUpperCase() === "PAGADA" && (
                            <span className="text-xs text-gray-500">Pagada</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Generar Factura */}
      <dialog ref={generarModalRef} className="modal p-0 rounded-xl">
        <form onSubmit={generarFactura} className="bg-white dark:bg-[#182431] rounded-xl p-6 w-[90%] max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-2 text-primary">Generar Factura Consolidada</h2>
          <p className="text-sm text-slate-500 mb-4">⚠️ Opcional: Genera una factura sumando el costo de múltiples procesos completados en el rango de fechas. Las facturas individuales se generan automáticamente al completarse cada proceso.</p>
          
          <label className="block mb-4">
            <p className="text-sm font-medium mb-2">Usuario ID</p>
            <input
              type="number"
              value={generarForm.usuarioId}
              onChange={(e) => setGenerarForm({ ...generarForm, usuarioId: e.target.value })}
              className="border w-full rounded-lg p-2"
              required
            />
          </label>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <p className="text-sm font-medium mb-2">Fecha Inicio</p>
              <input
                type="date"
                value={generarForm.fechaInicio}
                onChange={(e) => setGenerarForm({ ...generarForm, fechaInicio: e.target.value })}
                className="border w-full rounded-lg p-2"
                required
              />
            </label>
            <label className="block">
              <p className="text-sm font-medium mb-2">Fecha Fin</p>
              <input
                type="date"
                value={generarForm.fechaFin}
                onChange={(e) => setGenerarForm({ ...generarForm, fechaFin: e.target.value })}
                className="border w-full rounded-lg p-2"
                required
              />
            </label>
          </div>

          <label className="block mb-4">
            <p className="text-sm font-medium mb-2">Observaciones (opcional)</p>
            <input
              value={generarForm.observaciones}
              onChange={(e) => setGenerarForm({ ...generarForm, observaciones: e.target.value })}
              className="border w-full rounded-lg p-2"
              placeholder="Ej: Cierre mensual"
            />
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => generarModalRef.current?.close()}
              className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={generando}
              className="px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-50"
            >
              {generando ? "Generando..." : "Generar"}
            </button>
          </div>
        </form>
      </dialog>

      {/* Modal Pagar Factura */}
      <dialog ref={pagarModalRef} className="modal p-0 rounded-xl">
        <form onSubmit={registrarPago} className="bg-white dark:bg-[#182431] rounded-xl p-6 w-[90%] max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-4 text-primary">Registrar Pago</h2>
          <p className="text-sm text-slate-500 mb-4">Factura #{pagarForm.facturaId}</p>
          
          <label className="block mb-4">
            <p className="text-sm font-medium mb-2">Monto Pagado</p>
            <input
              type="number"
              step="0.01"
              value={pagarForm.montoPagado}
              onChange={(e) => setPagarForm({ ...pagarForm, montoPagado: e.target.value })}
              className="border w-full rounded-lg p-2"
              required
            />
          </label>

          <label className="block mb-4">
            <p className="text-sm font-medium mb-2">Método de Pago</p>
            <select
              value={pagarForm.metodoPago}
              onChange={(e) => setPagarForm({ ...pagarForm, metodoPago: e.target.value })}
              className="border w-full rounded-lg p-2"
            >
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="efectivo">Efectivo</option>
              <option value="debito">Débito</option>
              <option value="otro">Otro</option>
            </select>
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => pagarModalRef.current?.close()}
              className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pagando}
              className="px-4 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 disabled:opacity-50"
            >
              {pagando ? "Registrando..." : "Registrar Pago"}
            </button>
          </div>
        </form>
      </dialog>

      {/* Modal Ver Pagos */}
      <dialog ref={pagosModalRef} className="modal p-0 rounded-xl">
        <div className="bg-white dark:bg-[#182431] rounded-xl p-6 w-[90%] max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-primary">Pagos de Factura #{facturaSeleccionada?.id}</h2>
            <button onClick={() => pagosModalRef.current?.close()} className="text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          
          {pagosFactura.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">No hay pagos registrados para esta factura.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-2 text-left">ID</th>
                    <th className="px-4 py-2 text-left">Fecha Pago</th>
                    <th className="px-4 py-2 text-left">Monto</th>
                    <th className="px-4 py-2 text-left">Método</th>
                  </tr>
                </thead>
                <tbody>
                  {pagosFactura.map(p => (
                    <tr key={p.id} className="border-b">
                      <td className="px-4 py-3">#{p.id}</td>
                      <td className="px-4 py-3">{new Date(p.fechaPago).toLocaleString()}</td>
                      <td className="px-4 py-3 font-semibold">${p.montoPagado?.toFixed(2)}</td>
                      <td className="px-4 py-3 capitalize">{p.metodoPago}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end mt-4">
            <button
              onClick={() => pagosModalRef.current?.close()}
              className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
