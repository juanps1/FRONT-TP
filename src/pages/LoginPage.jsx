import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", contrasena: "" });
  const [error, setError] = useState("");
  const [serverStatus, setServerStatus] = useState('checking'); // 'checking', 'online', 'offline'
  const { setAuth, loading } = useAuth();

  useEffect(() => {
    const checkServer = async () => {
      try {
        // Usar endpoint público para verificar conectividad
        await api.get('/auth/health').catch(() => {
          // Si /auth/health no existe, intentar con /usuarios sin token
          return api.get('/usuarios', { headers: { Authorization: '' } });
        });
        setServerStatus('online');
        setError('');
      } catch (err) {
        // Si falla, marcar como offline solo si es un error de red
        if (!err.response || err.response.status >= 500) {
          setServerStatus('offline');
          setError('El servidor no está disponible. Por favor, inténtelo más tarde.');
        } else {
          // Si hay respuesta pero es 401/403, el servidor está online
          setServerStatus('online');
          setError('');
        }
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 10000); // Verificar cada 10 segundos

    return () => clearInterval(interval);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (serverStatus === 'offline') {
      setError("El servidor no está disponible. Por favor, inténtelo más tarde.");
      return;
    }

    try {
      const res = await api.post("/auth/login", {
        email: formData.email,
        contrasena: formData.contrasena,
      });
      localStorage.setItem("token", res.data.token);
      // Cargar rol y setear contexto
      await setAuth(formData.email);
      navigate("/dashboard");
    } catch (err) {
      console.error('Login error:', err);
      if (!err.response) {
        setError("No se puede conectar con el servidor. Verifica que el backend esté corriendo en puerto 8080.");
        setServerStatus('offline');
      } else if (err.response.status === 403 && err.response.data === "Invalid CORS request") {
        setError("Error de configuración CORS en el servidor. Contacta al administrador del sistema.");
        console.error("CORS ERROR: El backend necesita configuración CORS. Ver BACKEND_CORS_FIX.md");
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || "Credenciales inválidas.");
      }
    }
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark p-4 sm:p-6 lg:p-8 font-display">
      <div className="flex flex-col w-full max-w-md items-center justify-center gap-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 dark:bg-primary/20">
              <span className="material-symbols-outlined text-primary text-3xl">
                translate
              </span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
              serverStatus === 'online' 
                ? 'bg-green-100 dark:bg-green-900/30' 
                : serverStatus === 'offline' 
                  ? 'bg-red-100 dark:bg-red-900/30' 
                  : 'bg-yellow-100 dark:bg-yellow-900/30'
            }`}>
              <div className={`h-2.5 w-2.5 rounded-full ${
                serverStatus === 'online'
                  ? 'bg-green-500'
                  : serverStatus === 'offline'
                  ? 'bg-red-500'
                  : 'bg-yellow-500 animate-pulse'
              }`} />
              <span className={`text-sm font-medium ${
                serverStatus === 'online'
                  ? 'text-green-700 dark:text-green-300'
                  : serverStatus === 'offline'
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-yellow-700 dark:text-yellow-300'
              }`}>
                {serverStatus === 'online'
                  ? 'Servidor conectado'
                  : serverStatus === 'offline'
                  ? 'Servidor desconectado'
                  : 'Verificando conexión...'}
              </span>
            </div>
          </div>
          <h1 className="text-[#0d141b] dark:text-white text-3xl sm:text-4xl font-black text-center">
            Sensora
          </h1>
        </div>

        <form className="flex w-full flex-col gap-4" onSubmit={handleSubmit}>
          <p className="text-[#0d141b] dark:text-white text-2xl font-black text-center">
            Accede a tu cuenta
          </p>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <label className="flex flex-col w-full">
            <p className="text-[#0d141b] dark:text-slate-300 pb-2">Correo Electrónico</p>
            <div className="relative flex w-full items-stretch">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                mail
              </span>
              <input
                name="email"
                type="email"
                placeholder="ejemplo@correo.com"
                value={formData.email}
                onChange={handleChange}
                className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-background-light dark:bg-background-dark focus:ring-2 focus:ring-primary/50 h-14 pl-12 pr-4 text-base text-[#0d141b] dark:text-white"
              />
            </div>
          </label>

          <label className="flex flex-col w-full">
            <p className="text-[#0d141b] dark:text-slate-300 pb-2">Contraseña</p>
            <div className="relative flex w-full items-stretch">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                lock
              </span>
              <input
                name="contrasena"
                type="password"
                placeholder="Introduce tu contraseña"
                value={formData.contrasena}
                onChange={handleChange}
                className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-background-light dark:bg-background-dark focus:ring-2 focus:ring-primary/50 h-14 pl-12 pr-12 text-base text-[#0d141b] dark:text-white"
              />
            </div>
          </label>

          <div className="flex justify-end">
            <a className="text-primary text-sm font-medium underline" href="#">
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-14 w-full rounded-lg bg-primary text-white font-bold hover:bg-primary/90 active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Cargando rol...' : 'Iniciar Sesión'}
          </button>

          <p className="text-center text-[#0d141b] dark:text-slate-300">
            ¿No tienes una cuenta?{" "}
            <a
              href="/register"
              className="text-primary hover:underline font-semibold"
            >
              Regístrate aquí
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
