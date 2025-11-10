import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function FacturasPage() {
  const navigate = useNavigate();
  const { roleId } = useAuth();
  const [facturas, setFacturas] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [nuevaFactura, setNuevaFactura] = useState({
    usuarioId: "",
    fechaEmision: "",
    monto: "",
    concepto: "",
  });

  useEffect(() => {
    cargarFacturas();
  }, []);

  const cargarFacturas = async () => {
    try {
      const res = await api.get("/facturas");
      setFacturas(res.data);
    } catch (err) {
      console.error("Error al cargar facturas:", err);
    }
  };

  const crearFactura = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/facturas", {
        usuario: { id: nuevaFactura.usuarioId },
        fechaEmision: nuevaFactura.fechaEmision,
        monto: parseFloat(nuevaFactura.monto),
        concepto: nuevaFactura.concepto,
        estado: "pendiente",
      });
      setFacturas([...facturas, res.data]);
      setNuevaFactura({ usuarioId: "", fechaEmision: "", monto: "", concepto: "" });
    } catch (err) {
      console.error("Error al crear factura:", err);
    }
  };

  const facturasFiltradas = facturas.filter((f) => {
    const coincideBusqueda =
      f.usuario?.nombreCompleto?.toLowerCase().includes(busqueda.toLowerCase()) ||
      f.id?.toString().includes(busqueda);
    const coincideEstado =
      filtroEstado === "Todos" ||
      f.estado?.toLowerCase() === filtroEstado.toLowerCase();
    return coincideBusqueda && coincideEstado;
  });

  return (
    <div className="flex h-screen bg-background-light dark:bg-background-dark text-[#212529] dark:text-gray-200">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#182431] p-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-full bg-primary/10 p-3">
            <span className="material-symbols-outlined text-primary text-3xl">receipt_long</span>
          </div>
          <div>
            <h1 className="font-bold text-lg text-primary">Persistencia Políglota</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Administración</p>
          </div>
        </div>
        <nav className="flex flex-col gap-2">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <span className="material-symbols-outlined">dashboard</span> Dashboard
          </button>
          <button onClick={() => navigate("/medidores")} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <span className="material-symbols-outlined">speed</span> Medidores
          </button>
          <button className="flex items-center gap-3 p-2 rounded-lg bg-primary/20 dark:bg-primary/30 text-primary font-semibold">
            <span className="material-symbols-outlined">receipt_long</span> Facturas
          </button>
          <button onClick={() => navigate("/alertas")} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <span className="material-symbols-outlined">notifications</span> Alertas
          </button>
          <button onClick={() => navigate("/mensajes")} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <span className="material-symbols-outlined">chat</span> Mensajes
          </button>
          <button onClick={() => navigate("/procesos")} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <span className="material-symbols-outlined">analytics</span> Procesos
          </button>
          {roleId === 1 && (
            <button onClick={() => navigate("/usuarios")} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <span className="material-symbols-outlined">group</span> Usuarios
            </button>
          )}
        </nav>
        <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
          <button className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 w-full">
            <span className="material-symbols-outlined">logout</span> Salir
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-between items-center mb-6">
            <h1 className="text-4xl font-black">Gestión de Facturas</h1>
          </div>

          {/* Crear Factura */}
          <details className="mb-8 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#182431]" open>
            <summary className="cursor-pointer flex justify-between items-center p-4 font-semibold text-lg">
              Crear Nueva Factura
              <span className="material-symbols-outlined">expand_more</span>
            </summary>
            <form onSubmit={crearFactura} className="border-t border-gray-200 dark:border-gray-800 p-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col">
                <p className="text-sm pb-2">ID de Usuario</p>
                <input
                  className="border rounded-lg p-3"
                  value={nuevaFactura.usuarioId}
                  onChange={(e) => setNuevaFactura({ ...nuevaFactura, usuarioId: e.target.value })}
                  placeholder="Buscar o ingresar ID"
                />
              </label>
              <label className="flex flex-col">
                <p className="text-sm pb-2">Fecha de Emisión</p>
                <input
                  type="date"
                  className="border rounded-lg p-3"
                  value={nuevaFactura.fechaEmision}
                  onChange={(e) => setNuevaFactura({ ...nuevaFactura, fechaEmision: e.target.value })}
                />
              </label>
              <label className="flex flex-col">
                <p className="text-sm pb-2">Monto</p>
                <input
                  type="number"
                  className="border rounded-lg p-3"
                  value={nuevaFactura.monto}
                  onChange={(e) => setNuevaFactura({ ...nuevaFactura, monto: e.target.value })}
                  placeholder="0.00"
                />
              </label>
              <label className="flex flex-col">
                <p className="text-sm pb-2">Concepto</p>
                <input
                  className="border rounded-lg p-3"
                  value={nuevaFactura.concepto}
                  onChange={(e) => setNuevaFactura({ ...nuevaFactura, concepto: e.target.value })}
                  placeholder="Descripción del servicio"
                />
              </label>
              <button
                type="submit"
                className="col-span-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90"
              >
                Crear Factura
              </button>
            </form>
          </details>

          {/* Barra de herramientas */}
          <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-4 mb-4">
            <div className="relative w-64">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400">search</span>
              <input
                type="text"
                className="pl-10 border rounded-lg p-2 w-full"
                placeholder="Buscar por ID o usuario..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              Filtrar por estado:
              <select
                className="border rounded-lg p-2"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option>Todos</option>
                <option>Pendiente</option>
                <option>Pagada</option>
                <option>Vencida</option>
              </select>
            </label>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-800 text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3">ID Factura</th>
                  <th className="px-6 py-3">Usuario</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3">Fecha de Emisión</th>
                  <th className="px-6 py-3">Monto</th>
                  <th className="px-6 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {facturasFiltradas.map((f) => (
                  <tr key={f.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 font-medium">#{f.id}</td>
                    <td className="px-6 py-4">{f.usuario?.nombreCompleto}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          f.estado === "pagada"
                            ? "bg-green-100 text-green-600"
                            : f.estado === "pendiente"
                            ? "bg-yellow-100 text-yellow-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {f.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4">{f.fechaEmision?.slice(0, 10)}</td>
                    <td className="px-6 py-4">${f.monto}</td>
                    <td className="px-6 py-4 text-center flex justify-center gap-2">
                      <button
                        onClick={() => navigate(`/facturas/${f.id}`)}
                        className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                      >
                        <span className="material-symbols-outlined text-gray-500">visibility</span>
                      </button>
                      <button
                        onClick={() => alert("Registrar pago")}
                        className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                      >
                        <span className="material-symbols-outlined text-gray-500">payment</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
