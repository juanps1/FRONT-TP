import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import MedidoresPage from "./pages/MedidoresPage";
import FacturasPage from "./pages/FacturasPage";
import AlertasPage from "./pages/AlertasPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ServerStatus from "./components/ServerStatus";
import MedidorDetallePage from "./pages/MedidorDetallePage";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <ServerStatus />
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/medidores" element={<MedidoresPage />} />
          <Route path="/facturas" element={<FacturasPage />} />
          <Route path="/alertas" element={<AlertasPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/medidores/:sensorId" element={<MedidorDetallePage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
