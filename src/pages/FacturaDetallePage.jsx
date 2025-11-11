import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client"; // lo vamos a crear más abajo
import Navbar from "../components/Navbar";

export default function FacturaDetallePage() {
  const { id } = useParams();
  const [factura, setFactura] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [nuevoPago, setNuevoPago] = useState({ monto: "", metodoPago: "" });

  useEffect(() => {
    const cargarFactura = async () => {
      try {
        const res = await api.get(`/facturas/${id}`);
        setFactura(res.data);
        // si tu endpoint devuelve pagos en la misma respuesta, podés usar res.data.pagos
      } catch (err) {
        console.error(err);
      }
    };
    cargarFactura();
  }, [id]);

  const registrarPago = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/pagos", {
        facturaId: factura.id,
        montoPagado: parseFloat(nuevoPago.monto),
        metodoPago: nuevoPago.metodoPago,
      });
      setPagos([...pagos, res.data]);
      setNuevoPago({ monto: "", metodoPago: "" });
    } catch (err) {
      console.error(err);
    }
  };

  if (!factura) return <p className="p-6">Cargando factura...</p>;

  return (
    <div className="font-display bg-background-light dark:bg-background-dark text-text-primary-light dark:text-text-primary-dark min-h-screen">
      <Navbar />
      <main className="w-full flex-1 p-4 sm:p-6 md:p-10">
        <div className="mx-auto flex max-w-4xl flex-col gap-8">
          {/* Detalle de Factura */}
          <div className="flex flex-col rounded-xl border border-border-light dark:border-border-dark bg-container-light dark:bg-container-dark p-6">
            <h1 className="text-3xl font-black">
              Factura #{factura.id}
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Estado:{" "}
              <span
                className={`font-semibold ${
                  factura.estado === "vencida"
                    ? "text-red-600"
                    : factura.estado === "pagada"
                    ? "text-green-600"
                    : "text-yellow-500"
                }`}
              >
                {factura.estado}
              </span>
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
              <div>
                <p className="text-sm text-gray-500">Cliente</p>
                <p className="font-medium">{factura.usuario?.nombreCompleto}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Monto</p>
                <p className="font-medium">${factura.monto}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fecha</p>
                <p className="font-medium">{factura.fechaEmision?.slice(0, 10)}</p>
              </div>
            </div>
          </div>

          {/* Registrar Pago */}
          <div className="rounded-xl border border-border-light dark:border-border-dark bg-container-light dark:bg-container-dark p-6">
            <h2 className="text-xl font-bold mb-4">Registrar Pago</h2>
            <form onSubmit={registrarPago} className="flex flex-col gap-4">
              <input
                type="number"
                placeholder="Monto"
                value={nuevoPago.monto}
                onChange={(e) =>
                  setNuevoPago({ ...nuevoPago, monto: e.target.value })
                }
                className="p-2 border rounded-lg"
              />
              <select
                value={nuevoPago.metodoPago}
                onChange={(e) =>
                  setNuevoPago({ ...nuevoPago, metodoPago: e.target.value })
                }
                className="p-2 border rounded-lg"
              >
                <option value="">Seleccione método</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Efectivo">Efectivo</option>
              </select>
              <button
                type="submit"
                className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Registrar Pago
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
