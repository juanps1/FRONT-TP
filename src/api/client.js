// src/api/client.js
import axios from "axios";

// Nota: en desarrollo usamos proxy de Vite (/api -> http://localhost:8080)
// En producción, servir el frontend detrás del mismo dominio o configurar CORS en el backend.
const api = axios.create({
  baseURL: "/api",
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Health check estable según backend
api.checkHealth = async () => {
  try {
    // Intentar endpoint público primero
    await api.get('/auth/health').catch(() => {
      // Fallback: cualquier respuesta (incluso 401) significa que el servidor está up
      return api.get('/usuarios', { headers: { Authorization: '' } });
    });
    return true;
  } catch (error) {
    // Solo retornar false si es error de red (no hay respuesta)
    return !!error.response;
  }
};

// Interceptor: adjunta JWT si existe y loguea requests
api.interceptors.request.use((request) => {
  const token = localStorage.getItem('token');
  if (token) {
    request.headers = request.headers || {};
    request.headers.Authorization = `Bearer ${token}`;
  }
  // logs mínimos para debug
  console.log('Request:', { url: request.url, method: request.method, data: request.data });
  return request;
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    console.error('HTTP Error:', { status, data, message: error.message });
    // opcional: redirigir en 401
    if (status === 401) {
      try {
        localStorage.removeItem('token');
      } catch (_) {}
      // Evitar bucle si ya estamos en /login
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
