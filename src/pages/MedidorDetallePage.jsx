import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import api from "../api/client";

export default function MedidorDetallePage() {
  const { sensorId } = useParams();
  const location = useLocation();
  const [mediciones, setMediciones] = useState([]);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [nuevaMedicion, setNuevaMedicion] = useState({ temperatura: "", humedad: "", fechaHora: "" }); // fechaHora LocalDateTime sin zona
  const [errorForm, setErrorForm] = useState("");
  const dialogRef = useRef(null);

  useEffect(() => {
    const cargarMediciones = async () => {
      try {
        const res = await api.get(`/mediciones/${sensorId}`);
        setMediciones(res.data);
      } catch (err) {
        console.error("Error al cargar mediciones:", err);
      }
    };
    cargarMediciones();
    // Abrir modal si viene query ?nueva=1
    const params = new URLSearchParams(location.search);
    if (params.get('nueva') === '1') {
      abrirModal();
    }
  }, [sensorId]);

  const filtrarPorFecha = async () => {
    try {
      const res = await api.get(`/mediciones/${sensorId}`, {
        params: { desde, hasta },
      });
      setMediciones(res.data);
    } catch (err) {
      console.error("Error al filtrar:", err);
    }
  };

  const abrirModal = () => {
    setErrorForm("");
    // Para backend LocalDateTime: usamos datetime-local sin zona y luego formateamos YYYY-MM-DDTHH:mm:ss
    const ahora = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const valorInput = `${ahora.getFullYear()}-${pad(ahora.getMonth()+1)}-${pad(ahora.getDate())}T${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;
    setNuevaMedicion({ temperatura: "", humedad: "", fechaHora: valorInput });
    dialogRef.current?.showModal();
  };

  const cerrarModal = () => {
    dialogRef.current?.close();
  };

  const validarMedicion = () => {
    const t = parseFloat(nuevaMedicion.temperatura);
    const h = parseFloat(nuevaMedicion.humedad);
    if (isNaN(t) || isNaN(h)) return "Temperatura y Humedad deben ser números";
    if (t < -100 || t > 100) return "Temperatura fuera de rango (-100 a 100)";
    if (h < 0 || h > 100) return "Humedad fuera de rango (0 a 100%)";
    if (!nuevaMedicion.fechaHora) return "Fecha/Hora requerida";
    return null;
  };

  const guardarMedicion = async (e) => {
    e.preventDefault();
    setErrorForm("");
    const err = validarMedicion();
    if (err) {
      setErrorForm(err);
      return;
    }
    try {
      // Formatear fechaHora a LocalDateTime sin zona (YYYY-MM-DDTHH:mm:ss)
      const dt = new Date(nuevaMedicion.fechaHora);
      const pad = (n) => String(n).padStart(2, '0');
      const fechaHoraFormateada = `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
      await api.post("/mediciones", {
        sensorId,
        fechaHora: fechaHoraFormateada,
        temperatura: parseFloat(nuevaMedicion.temperatura),
        humedad: parseFloat(nuevaMedicion.humedad)
      });
      // Recargar mediciones
      const res = await api.get(`/mediciones/${sensorId}`);
      setMediciones(res.data);
      cerrarModal();
    } catch (error) {
      console.error("Error al guardar medición:", error);
      setErrorForm(error.response?.data?.message || "Error guardando medición");
    }
  };

  return (
    <div className="font-display bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark min-h-screen">
      <header className="flex h-16 items-center justify-between border-b border-border-light dark:border-border-dark px-6 bg-card-light dark:bg-card-dark/80 backdrop-blur-sm">
        <h2 className="text-lg font-bold text-primary">Persistencia Políglota</h2>
      </header>

      <main className="flex justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-6xl flex flex-col gap-8">
          {/* Encabezado */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-black">
              Sensor de Temperatura: {sensorId}
            </h1>
            <button
              className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg shadow hover:bg-primary/90"
              onClick={abrirModal}
            >
              <span className="material-symbols-outlined">add_circle</span>
              Agregar Medición Manual
            </button>
          </div>

          {/* Filtros */}
          <div className="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-6">
            <h2 className="text-xl font-bold mb-4">Historial de Mediciones</h2>

            <div className="flex flex-wrap items-end gap-4 border-b border-border-light dark:border-border-dark pb-6 mb-6">
              <label className="flex flex-col min-w-40 flex-1">
                <p className="text-sm font-medium pb-2">Desde</p>
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="p-2 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark"
                />
              </label>
              <label className="flex flex-col min-w-40 flex-1">
                <p className="text-sm font-medium pb-2">Hasta</p>
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="p-2 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark"
                />
              </label>
              <button
                onClick={filtrarPorFecha}
                className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg shadow hover:bg-primary/90"
              >
                <span className="material-symbols-outlined">filter_list</span>
                Filtrar
              </button>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-border-light dark:border-border-dark">
                  <tr>
                    <th className="px-6 py-3 text-sm font-semibold text-muted-light dark:text-muted-dark">
                      Fecha y Hora
                    </th>
                    <th className="px-6 py-3 text-sm font-semibold text-muted-light dark:text-muted-dark text-right">
                      Temperatura (°C)
                    </th>
                    <th className="px-6 py-3 text-sm font-semibold text-muted-light dark:text-muted-dark text-right">
                      Humedad (%)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mediciones.length > 0 ? (
                    mediciones.map((m) => (
                      <tr
                        key={m.id}
                        className="border-b border-border-light dark:border-border-dark hover:bg-background-light/50"
                      >
                        <td className="px-6 py-3 whitespace-nowrap">
                          {new Date(m.fechaHora).toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-right">{m.temperatura}</td>
                        <td className="px-6 py-3 text-right">{m.humedad}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="p-4 text-center text-muted-light">
                        No hay mediciones disponibles
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      {/* Modal nueva medición */}
      <dialog ref={dialogRef} className="modal p-0">
        <form onSubmit={guardarMedicion} className="bg-white dark:bg-card-dark rounded-xl p-6 w-[90%] max-w-md mx-auto flex flex-col gap-4">
          <h2 className="text-xl font-bold text-primary">Nueva Medición</h2>
          {errorForm && <p className="text-red-500 text-sm">{errorForm}</p>}
          <label className="flex flex-col">
            <span className="text-sm font-medium mb-1">Fecha y Hora (Local)</span>
            <input
              type="datetime-local"
              value={nuevaMedicion.fechaHora}
              onChange={(e) => setNuevaMedicion({ ...nuevaMedicion, fechaHora: e.target.value })}
              className="border rounded-lg p-2"
              required
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col">
              <span className="text-sm font-medium mb-1">Temperatura (°C)</span>
              <input
                type="number"
                step="0.1"
                value={nuevaMedicion.temperatura}
                onChange={(e) => setNuevaMedicion({ ...nuevaMedicion, temperatura: e.target.value })}
                className="border rounded-lg p-2"
                required
              />
            </label>
            <label className="flex flex-col">
              <span className="text-sm font-medium mb-1">Humedad (%)</span>
              <input
                type="number"
                step="0.1"
                value={nuevaMedicion.humedad}
                onChange={(e) => setNuevaMedicion({ ...nuevaMedicion, humedad: e.target.value })}
                className="border rounded-lg p-2"
                required
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={cerrarModal}
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
    </div>
  );
}
