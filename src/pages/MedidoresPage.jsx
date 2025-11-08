import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function MedidoresPage() {
  const navigate = useNavigate();
  const { roleId } = useAuth();
  const [medidores, setMedidores] = useState([]); // lista de SENSORES
  const [nuevo, setNuevo] = useState({
    nombre: "",
    tipo: "temperatura", // temperatura | humedad
    latitud: "",
    longitud: "",
    ciudad: "",
    pais: "",
    estado: "activo", // activo | inactivo | falla
    inicioEmision: ""
  }); // nuevo sensor
  const [filtro, setFiltro] = useState({ query: "", tipo: "", ciudad: "", estado: "" });
  const [msg, setMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const modalRef = useRef(null);
  const renameRef = useRef(null);
  const [renombrar, setRenombrar] = useState({ id: "", nombre: "" });
  const detailsRef = useRef(null);
  const [detalle, setDetalle] = useState({
    id: "",
    tipo: "temperatura",
    estado: "activo",
    ciudad: "",
    pais: "",
    latitud: "",
    longitud: "",
    inicioEmision: "",
  });

  useEffect(() => {
    cargarMedidores();
  }, []);

  const cargarMedidores = async () => {
    try {
      // Ahora traemos la lista de SENSORES
      const res = await api.get("/sensores");
      const lista = res.data || [];
      // Merge con metadata local (tipo/ciudad/pais/estado/coords/inicio) hasta que backend los soporte
      const meta = JSON.parse(localStorage.getItem('sensorMeta') || '{}');
      const merged = lista.map((s) => ({ ...s, ...(meta[s.id] || {}) }));
      setMedidores(merged);
    } catch (err) {
      console.error("Error al cargar sensores:", err);
    }
  };

  const crearMedidor = async (e) => {
    e.preventDefault();
    // Permisos: solo admin puede crear medidores
    if (roleId !== 1) {
      setErrMsg('Permiso denegado: solo administradores pueden crear medidores.');
      setTimeout(() => setErrMsg(''), 3000);
      return;
    }
    try {
      // Preferencia: ID autogenerado por backend, enviamos solo { nombre }
      const createRes = await api.post("/sensores", { nombre: nuevo.nombre });
      // refrescar lista desde el servidor para asegurar forma correcta
      const created = createRes.data;
      // Guardar metadata local para mostrar columnas no soportadas por backend
      const meta = JSON.parse(localStorage.getItem('sensorMeta') || '{}');
      meta[created.id] = {
        tipo: nuevo.tipo,
        ciudad: nuevo.ciudad,
        pais: nuevo.pais,
        estado: nuevo.estado,
        latitud: nuevo.latitud,
        longitud: nuevo.longitud,
        fechaInicioEmision: nuevo.inicioEmision || null,
      };
      localStorage.setItem('sensorMeta', JSON.stringify(meta));
      await cargarMedidores();
      setNuevo({
        nombre: "",
        tipo: "temperatura",
        latitud: "",
        longitud: "",
        ciudad: "",
        pais: "",
        estado: "activo",
        inicioEmision: "",
      });
      setErrMsg("");
      setMsg("Sensor creado correctamente");
      setTimeout(() => setMsg(""), 2500);
      // Cerrar el modal al guardar exitosamente
      modalRef.current?.close();
    } catch (err) {
      // Si el backend exige ID, generamos uno automáticamente y reintentamos
      const requiresId = (err.response?.status === 400) &&
        (
          /id/i.test(err.response?.data?.message || "") ||
          Object.keys(err.response?.data?.errors || {}).some(k => k.toLowerCase().includes('id'))
        );
      if (requiresId) {
        try {
          const autoId = generarIdDesdeNombre(nuevo.nombre);
          const createRes2 = await api.post("/sensores", { id: autoId, nombre: nuevo.nombre });
          const created2 = createRes2.data;
          const meta2 = JSON.parse(localStorage.getItem('sensorMeta') || '{}');
          meta2[created2.id] = {
            tipo: nuevo.tipo,
            ciudad: nuevo.ciudad,
            pais: nuevo.pais,
            estado: nuevo.estado,
            latitud: nuevo.latitud,
            longitud: nuevo.longitud,
            fechaInicioEmision: nuevo.inicioEmision || null,
          };
          localStorage.setItem('sensorMeta', JSON.stringify(meta2));
          await cargarMedidores();
          setNuevo({ nombre: "", tipo: "temperatura", latitud: "", longitud: "", ciudad: "", pais: "", estado: "activo", inicioEmision: "" });
          setErrMsg("");
          setMsg("Sensor creado (ID autogenerado)");
          setTimeout(() => setMsg(""), 2500);
          modalRef.current?.close();
          return;
        } catch (e2) {
          console.error("Reintento con ID autogenerado falló:", e2);
          const be2 = e2.response?.data;
          setMsg("");
          setErrMsg(be2?.message || be2?.error || e2.message || "No se pudo crear el sensor");
          return;
        }
      }
      console.error("Error al crear sensor:", err);
      const be = err.response?.data;
      setMsg("");
      setErrMsg(be?.message || be?.error || err.message || "No se pudo crear el sensor");
    }
  };

  const generarIdDesdeNombre = (nombre) => {
    const base = (nombre || 'sensor').toString().trim().toUpperCase()
      .normalize('NFD').replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    const sufijo = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${base}-${sufijo}`;
  };

  const medidoresFiltrados = useMemo(() => {
    const q = filtro.query.trim().toLowerCase();
    return (medidores || []).filter((m) => {
      const matchQuery = !q ||
        (m.id?.toLowerCase?.().includes(q)) ||
        (m.nombre?.toLowerCase?.().includes(q)) ||
        (m.ciudad?.toLowerCase?.().includes(q)) ||
        (m.pais?.toLowerCase?.().includes(q));
      const matchTipo = !filtro.tipo || m.tipo === filtro.tipo;
      const matchCiudad = !filtro.ciudad || (m.ciudad?.toLowerCase?.() === filtro.ciudad.toLowerCase());
      const matchEstado = !filtro.estado || m.estado === filtro.estado;
      return matchQuery && matchTipo && matchCiudad && matchEstado;
    });
  }, [medidores, filtro]);

  const resumen = useMemo(() => {
    const porTipo = medidores.reduce((acc, m) => {
      acc[m.tipo || 'desconocido'] = (acc[m.tipo || 'desconocido'] || 0) + 1;
      return acc;
    }, {});
    const porEstado = medidores.reduce((acc, m) => {
      acc[m.estado || 'sin-estado'] = (acc[m.estado || 'sin-estado'] || 0) + 1;
      return acc;
    }, {});
    return { porTipo, porEstado, total: medidores.length };
  }, [medidores]);

  const eliminarMedidor = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este medidor?")) return;
    try {
      await api.delete(`/mediciones/${id}`);
      setMedidores(medidores.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Error al eliminar:", err);
    }
  };

  const abrirRenombrar = (m) => {
    if (roleId !== 1) {
      setErrMsg('Permiso denegado: solo administradores pueden renombrar.');
      setTimeout(() => setErrMsg(''), 3000);
      return;
    }
    setRenombrar({ id: m.id, nombre: m.nombre || '' });
    renameRef.current?.showModal();
  };

  const guardarRenombrar = async (e) => {
    e.preventDefault();
    if (roleId !== 1) {
      setErrMsg('Permiso denegado: solo administradores pueden renombrar.');
      setTimeout(() => setErrMsg(''), 3000);
      return;
    }
    try {
      await api.put(`/sensores/${renombrar.id}`, { nombre: renombrar.nombre });
      setMedidores((prev) => prev.map((x) => x.id === renombrar.id ? { ...x, nombre: renombrar.nombre } : x));
      setMsg('Nombre actualizado');
      setTimeout(() => setMsg(''), 2500);
      renameRef.current?.close();
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message;
      if (status === 405 || status === 404) {
        setErrMsg('El backend aún no permite editar sensores (PUT /api/sensores/{id}).');
      } else {
        setErrMsg(message || 'No se pudo actualizar el nombre');
      }
      setTimeout(() => setErrMsg(''), 3500);
    }
  };

  const abrirDetalles = (m) => {
    if (roleId !== 1) {
      setErrMsg('Permiso denegado: solo administradores pueden editar detalles.');
      setTimeout(() => setErrMsg(''), 3000);
      return;
    }
    // convertir fecha a input date (YYYY-MM-DD)
    const toDate = (v) => {
      if (!v) return "";
      const d = new Date(v);
      if (Number.isNaN(d.valueOf())) return "";
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    };
    setDetalle({
      id: m.id,
      tipo: m.tipo || 'temperatura',
      estado: m.estado || 'activo',
      ciudad: m.ciudad || '',
      pais: m.pais || '',
      latitud: m.latitud || '',
      longitud: m.longitud || '',
      inicioEmision: toDate(m.fechaInicioEmision) || '',
    });
    detailsRef.current?.showModal();
  };

  const guardarDetalles = (e) => {
    e.preventDefault();
    if (roleId !== 1) {
      setErrMsg('Permiso denegado: solo administradores pueden editar detalles.');
      setTimeout(() => setErrMsg(''), 3000);
      return;
    }
    const meta = JSON.parse(localStorage.getItem('sensorMeta') || '{}');
    meta[detalle.id] = {
      ...(meta[detalle.id] || {}),
      tipo: detalle.tipo,
      estado: detalle.estado,
      ciudad: detalle.ciudad,
      pais: detalle.pais,
      latitud: detalle.latitud,
      longitud: detalle.longitud,
      fechaInicioEmision: detalle.inicioEmision || null,
    };
    localStorage.setItem('sensorMeta', JSON.stringify(meta));
    setMedidores((prev) => prev.map((x) => x.id === detalle.id ? { ...x, ...meta[detalle.id] } : x));
    setMsg('Detalles actualizados');
    setTimeout(() => setMsg(''), 2500);
    detailsRef.current?.close();
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-200 min-h-screen font-display">
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-[#182431]">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-primary">Persistencia Políglota</h2>
        </div>
        <nav className="flex items-center gap-6 text-sm font-semibold">
          <a className="text-primary" href="#">Medidores</a>
          <a className="hover:text-primary text-slate-600 dark:text-slate-300" href="/facturas">Facturas</a>
          <a className="hover:text-primary text-slate-600 dark:text-slate-300" href="/alertas">Alertas</a>
          {roleId === 1 && (
            <a className="hover:text-primary text-slate-600 dark:text-slate-300" href="/usuarios">Usuarios</a>
          )}
        </nav>
      </header>

      <main className="p-6 lg:p-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-extrabold">Gestión de Medidores</h1>
          {roleId === 1 && (
            <button
              onClick={() => modalRef.current?.showModal()}
              className="flex items-center gap-2 bg-primary text-white font-bold px-4 py-2 rounded-lg shadow hover:bg-primary/90"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Nuevo Medidor
            </button>
          )}
        </div>

        {/* Mensajes */}
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

        {/* Resumen */}
        <div className="grid gap-3 grid-cols-1 md:grid-cols-3 mb-6">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <p className="text-xs uppercase font-semibold text-slate-500 mb-1">Total Sensores</p>
            <p className="text-2xl font-bold">{resumen.total}</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <p className="text-xs uppercase font-semibold text-slate-500 mb-1">Por Tipo</p>
            <div className="flex flex-wrap gap-2 text-sm">
              {Object.entries(resumen.porTipo).map(([tipo, cant]) => (
                <span key={tipo} className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
                  {tipo}: {cant}
                </span>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <p className="text-xs uppercase font-semibold text-slate-500 mb-1">Por Estado</p>
            <div className="flex flex-wrap gap-2 text-sm">
              {Object.entries(resumen.porEstado).map(([estado, cant]) => (
                <span
                  key={estado}
                  className={"px-2 py-1 rounded-full " +
                    (estado === 'activo' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                     estado === 'inactivo' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                     estado === 'falla' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                     'bg-slate-100 dark:bg-slate-800')}
                >
                  {estado}: {cant}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-end gap-3 mb-8">
          <label className="flex-1 min-w-56">
            <p className="text-sm font-medium">Buscar</p>
            <input
              value={filtro.query}
              onChange={(e) => setFiltro({ ...filtro, query: e.target.value })}
              className="border w-full rounded-lg p-2"
              placeholder="ID, descripción, ciudad o país"
            />
          </label>
          <label className="w-40">
            <p className="text-sm font-medium">Tipo</p>
            <select
              value={filtro.tipo}
              onChange={(e) => setFiltro({ ...filtro, tipo: e.target.value })}
              className="border w-full rounded-lg p-2"
            >
              <option value="">Todos</option>
              <option value="temperatura">Temperatura</option>
              <option value="humedad">Humedad</option>
            </select>
          </label>
          <label className="w-44">
            <p className="text-sm font-medium">Ciudad</p>
            <input
              value={filtro.ciudad}
              onChange={(e) => setFiltro({ ...filtro, ciudad: e.target.value })}
              className="border w-full rounded-lg p-2"
              placeholder="Ej: Buenos Aires"
            />
          </label>
          <label className="w-44">
            <p className="text-sm font-medium">Estado</p>
            <select
              value={filtro.estado}
              onChange={(e) => setFiltro({ ...filtro, estado: e.target.value })}
              className="border w-full rounded-lg p-2"
            >
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="falla">Falla</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => setFiltro({ query: "", tipo: "", ciudad: "", estado: "" })}
            className="h-10 px-4 rounded-lg border bg-white dark:bg-slate-800"
          >
            Limpiar
          </button>
        </div>

        {medidores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
            <p className="text-lg font-bold mb-2">No hay medidores registrados</p>
            <p className="text-slate-500 mb-4">¡Crea el primero para empezar a monitorear!</p>
            {roleId === 1 && (
              <button
                onClick={() => modalRef.current?.showModal()}
                className="flex items-center gap-2 bg-primary text-white font-bold px-4 py-2 rounded-lg shadow hover:bg-primary/90"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Crear Nuevo Medidor
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2430]">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider">ID</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider">Nombre</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider">Tipo</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider">Ciudad</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider">País</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider">Estado</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider">Inicio Emisión</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {medidoresFiltrados.map((m) => (
                  <tr
                    key={m.id}
                    className={"border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 " +
                      (m.estado === 'falla' ? 'bg-red-50 dark:bg-red-900/20' : '')}
                  >
                    <td className="p-4 font-medium text-slate-600 dark:text-slate-300">{m.id}</td>
                    <td className="p-4">{m.nombre || "—"}</td>
                    <td className="p-4 capitalize">{m.tipo || "—"}</td>
                    <td className="p-4">{m.ciudad || "—"}</td>
                    <td className="p-4">{m.pais || "—"}</td>
                    <td className="p-4">
                      <span
                        className={"px-2 py-1 text-xs font-semibold rounded-full capitalize " +
                          (m.estado === 'activo'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : m.estado === 'inactivo'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : m.estado === 'falla'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300')}
                      >
                        {m.estado || '—'}
                      </span>
                    </td>
                    <td className="p-4">{m.fechaInicioEmision ? new Date(m.fechaInicioEmision).toLocaleDateString() : "—"}</td>
                    <td className="p-4 flex gap-2">
                      <button
                        onClick={() => navigate(`/medidores/${m.id}?nueva=0`)}
                        className="text-slate-600 dark:text-slate-300 hover:text-primary"
                      >
                        <span className="material-symbols-outlined text-sm">monitoring</span> Ver
                      </button>
                      <button
                        onClick={() => navigate(`/medidores/${m.id}?nueva=1`)}
                        className="text-slate-600 dark:text-slate-300 hover:text-primary"
                        title="Agregar medición"
                      >
                        <span className="material-symbols-outlined text-sm">add_circle</span> Medir
                      </button>
                      {roleId === 1 && (
                        <>
                          <button
                            onClick={() => abrirRenombrar(m)}
                            className="text-slate-600 dark:text-slate-300 hover:text-primary"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span> Renombrar
                          </button>
                          <button
                            onClick={() => abrirDetalles(m)}
                            className="text-slate-600 dark:text-slate-300 hover:text-primary"
                          >
                            <span className="material-symbols-outlined text-sm">tune</span> Detalles
                          </button>
                        </>
                      )}
                      {/* El backend no expuso DELETE /sensores/{id}; por ahora deshabilitamos eliminar */}
                      {roleId === 1 && (
                        <button
                          disabled
                          title="Eliminar no disponible"
                          className="text-red-400 cursor-not-allowed rounded px-2 py-1"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span> Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal crear medidor */}
      <dialog id="nuevo-medidor" ref={modalRef} className="modal p-0">
        <form
          onSubmit={crearMedidor}
          className="bg-white dark:bg-[#182431] rounded-xl p-6 w-[90%] max-w-md mx-auto"
        >
          <h2 className="text-xl font-bold mb-4 text-primary">Nuevo Medidor (Sensor)</h2>
          <label className="block mb-4">
            <p className="text-sm font-medium">Nombre</p>
            <input
              value={nuevo.nombre}
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
              className="border w-full rounded-lg p-2"
              placeholder="Ej: Sensor de temperatura principal"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <label className="block">
              <p className="text-sm font-medium">Tipo de Sensor</p>
              <select
                value={nuevo.tipo}
                onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })}
                className="border w-full rounded-lg p-2"
              >
                <option value="temperatura">Temperatura</option>
                <option value="humedad">Humedad</option>
              </select>
            </label>
            <label className="block">
              <p className="text-sm font-medium">Estado</p>
              <select
                value={nuevo.estado}
                onChange={(e) => setNuevo({ ...nuevo, estado: e.target.value })}
                className="border w-full rounded-lg p-2"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="falla">Falla</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <label className="block">
              <p className="text-sm font-medium">Latitud</p>
              <input
                value={nuevo.latitud}
                onChange={(e) => setNuevo({ ...nuevo, latitud: e.target.value })}
                className="border w-full rounded-lg p-2"
                placeholder="Ej: -34.6037"
              />
            </label>
            <label className="block">
              <p className="text-sm font-medium">Longitud</p>
              <input
                value={nuevo.longitud}
                onChange={(e) => setNuevo({ ...nuevo, longitud: e.target.value })}
                className="border w-full rounded-lg p-2"
                placeholder="Ej: -58.3816"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <label className="block">
              <p className="text-sm font-medium">Ciudad</p>
              <input
                value={nuevo.ciudad}
                onChange={(e) => setNuevo({ ...nuevo, ciudad: e.target.value })}
                className="border w-full rounded-lg p-2"
                placeholder="Ej: Buenos Aires"
              />
            </label>
            <label className="block">
              <p className="text-sm font-medium">País</p>
              <input
                value={nuevo.pais}
                onChange={(e) => setNuevo({ ...nuevo, pais: e.target.value })}
                className="border w-full rounded-lg p-2"
                placeholder="Ej: Argentina"
              />
            </label>
          </div>

          <label className="block mb-4">
            <p className="text-sm font-medium">Fecha de inicio de emisión</p>
            <input
              type="date"
              value={nuevo.inicioEmision}
              onChange={(e) => setNuevo({ ...nuevo, inicioEmision: e.target.value })}
              className="border w-full rounded-lg p-2"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setNuevo({ nombre: "" });
                modalRef.current?.close();
              }}
              className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary/90"
            >
              Guardar
            </button>
          </div>
        </form>
      </dialog>

      {/* Modal renombrar medidor */}
      <dialog ref={renameRef} className="modal p-0">
        <form onSubmit={guardarRenombrar} className="bg-white dark:bg-[#182431] rounded-xl p-6 w-[90%] max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-4 text-primary">Renombrar Medidor</h2>
          <p className="text-sm text-slate-500 mb-2">ID: <span className="font-mono">{renombrar.id}</span></p>
          <label className="block mb-4">
            <p className="text-sm font-medium">Nuevo nombre</p>
            <input
              value={renombrar.nombre}
              onChange={(e) => setRenombrar({ ...renombrar, nombre: e.target.value })}
              className="border w-full rounded-lg p-2"
              placeholder="Ej: Sensor Sala A"
              required
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => renameRef.current?.close()} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary/90">Guardar</button>
          </div>
        </form>
      </dialog>

      {/* Modal editar detalles (metadata local) */}
      <dialog ref={detailsRef} className="modal p-0">
        <form onSubmit={guardarDetalles} className="bg-white dark:bg-[#182431] rounded-xl p-6 w-[90%] max-w-lg mx-auto">
          <h2 className="text-xl font-bold mb-4 text-primary">Editar detalles del Medidor</h2>
          <p className="text-sm text-slate-500 mb-4">ID: <span className="font-mono">{detalle.id}</span></p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <label className="block">
              <p className="text-sm font-medium">Tipo</p>
              <select value={detalle.tipo} onChange={(e)=>setDetalle({...detalle, tipo: e.target.value})} className="border w-full rounded-lg p-2">
                <option value="temperatura">Temperatura</option>
                <option value="humedad">Humedad</option>
              </select>
            </label>
            <label className="block">
              <p className="text-sm font-medium">Estado</p>
              <select value={detalle.estado} onChange={(e)=>setDetalle({...detalle, estado: e.target.value})} className="border w-full rounded-lg p-2">
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="falla">Falla</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <label className="block">
              <p className="text-sm font-medium">Ciudad</p>
              <input value={detalle.ciudad} onChange={(e)=>setDetalle({...detalle, ciudad: e.target.value})} className="border w-full rounded-lg p-2" placeholder="Ej: Buenos Aires" />
            </label>
            <label className="block">
              <p className="text-sm font-medium">País</p>
              <input value={detalle.pais} onChange={(e)=>setDetalle({...detalle, pais: e.target.value})} className="border w-full rounded-lg p-2" placeholder="Ej: Argentina" />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <label className="block">
              <p className="text-sm font-medium">Latitud</p>
              <input value={detalle.latitud} onChange={(e)=>setDetalle({...detalle, latitud: e.target.value})} className="border w-full rounded-lg p-2" placeholder="-34.6037" />
            </label>
            <label className="block">
              <p className="text-sm font-medium">Longitud</p>
              <input value={detalle.longitud} onChange={(e)=>setDetalle({...detalle, longitud: e.target.value})} className="border w-full rounded-lg p-2" placeholder="-58.3816" />
            </label>
          </div>
          <label className="block mb-4">
            <p className="text-sm font-medium">Inicio de emisión</p>
            <input type="date" value={detalle.inicioEmision} onChange={(e)=>setDetalle({...detalle, inicioEmision: e.target.value})} className="border w-full rounded-lg p-2" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => detailsRef.current?.close()} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary/90">Guardar</button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
