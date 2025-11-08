import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    nombre: "",
    apellido: ""
  });
  const [error, setError] = useState("");
  const [roles, setRoles] = useState([]);
  const [rolSeleccionado, setRolSeleccionado] = useState("");

  useEffect(() => {
    const cargarRoles = async () => {
      try {
        const res = await api.get('/roles');
        setRoles(res.data || []);
        if (res.data?.length) setRolSeleccionado(String(res.data[0].id));
      } catch (e) {
        console.error('Error cargando roles', e);
      }
    };
    cargarRoles();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    try {
      // Primero obtenemos los roles disponibles
      // Preparamos los datos en el formato que espera el backend
      const dataToSend = {
        email: formData.email,
        contrasena: formData.password,
        nombreCompleto: `${formData.nombre} ${formData.apellido}`,
        estado: "activo",
        rol: { id: Number(rolSeleccionado) }
      };
      console.log('Datos a enviar:', dataToSend); // Para debug
      const res = await api.post("/usuarios", dataToSend);
      if (res.data) {
        // Redirigir al login después de un registro exitoso
        navigate("/login");
      }
    } catch (err) {
      console.error('Error completo:', err);
      
      // Verificar si es un error de email duplicado
      if (err.response?.data?.message?.includes('Ya existe la llave (email)') ||
          err.response?.data?.message?.includes('ukkfsp0s1tflm1cwlj8idhqsad0')) {
        setError('Este correo electrónico ya está registrado. Por favor, utiliza otro email o inicia sesión.');
      } else {
        setError(
          err.response?.data?.message || 
          err.response?.data?.error || 
          err.message || 
          "Error al crear el usuario. Por favor, intenta nuevamente."
        );
      }
    }
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark p-4 sm:p-6 lg:p-8 font-display">
      <div className="flex flex-col w-full max-w-md items-center justify-center gap-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 dark:bg-primary/20">
            <span className="material-symbols-outlined text-primary text-3xl">
              person_add
            </span>
          </div>
          <h1 className="text-[#0d141b] dark:text-white text-3xl sm:text-4xl font-black text-center">
            Crear cuenta
          </h1>
        </div>

        <form className="flex w-full flex-col gap-4" onSubmit={handleSubmit}>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col w-full">
              <p className="text-[#0d141b] dark:text-slate-300 pb-2">Nombre</p>
              <input
                name="nombre"
                type="text"
                placeholder="Tu nombre"
                value={formData.nombre}
                onChange={handleChange}
                className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-background-light dark:bg-background-dark focus:ring-2 focus:ring-primary/50 h-14 px-4 text-base text-[#0d141b] dark:text-white"
                required
              />
            </label>

            <label className="flex flex-col w-full">
              <p className="text-[#0d141b] dark:text-slate-300 pb-2">Apellido</p>
              <input
                name="apellido"
                type="text"
                placeholder="Tu apellido"
                value={formData.apellido}
                onChange={handleChange}
                className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-background-light dark:bg-background-dark focus:ring-2 focus:ring-primary/50 h-14 px-4 text-base text-[#0d141b] dark:text-white"
                required
              />
            </label>
          </div>

          <label className="flex flex-col w-full">
            <p className="text-[#0d141b] dark:text-slate-300 pb-2">Rol</p>
            <select
              value={rolSeleccionado}
              onChange={(e) => setRolSeleccionado(e.target.value)}
              className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-background-light dark:bg-background-dark focus:ring-2 focus:ring-primary/50 h-14 px-4 text-base text-[#0d141b] dark:text-white"
              required
            >
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.descripcion || r.nombre || `Rol ${r.id}`}</option>
              ))}
            </select>
          </label>

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
                required
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
                name="password"
                type="password"
                placeholder="Crea tu contraseña"
                value={formData.password}
                onChange={handleChange}
                className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-background-light dark:bg-background-dark focus:ring-2 focus:ring-primary/50 h-14 pl-12 pr-4 text-base text-[#0d141b] dark:text-white"
                required
              />
            </div>
          </label>

          <label className="flex flex-col w-full">
            <p className="text-[#0d141b] dark:text-slate-300 pb-2">Confirmar Contraseña</p>
            <div className="relative flex w-full items-stretch">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                lock
              </span>
              <input
                name="confirmPassword"
                type="password"
                placeholder="Confirma tu contraseña"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-background-light dark:bg-background-dark focus:ring-2 focus:ring-primary/50 h-14 pl-12 pr-4 text-base text-[#0d141b] dark:text-white"
                required
              />
            </div>
          </label>

          <button
            type="submit"
            className="h-14 w-full rounded-lg bg-primary text-white font-bold hover:bg-primary/90 active:scale-95 transition"
          >
            Crear cuenta
          </button>

          <p className="text-center text-[#0d141b] dark:text-slate-300">
            ¿Ya tienes una cuenta?{" "}
            <a
              href="/login"
              className="text-primary hover:underline font-semibold"
            >
              Inicia sesión
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}