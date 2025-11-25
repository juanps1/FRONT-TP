// src/api/client.js
import axios from "axios";

// Nota: en desarrollo usamos proxy de Vite (/api -> http://localhost:8080)
// En producción, servir el frontend detrás del mismo dominio o configurar CORS en el backend.
const api = axios.create({
  baseURL: "/api",
  timeout: 15000, // Aumentar timeout para procesos más largos
  headers: {
    'Content-Type': 'application/json'
  },
  // Configuración de validación de status HTTP
  validateStatus: function (status) {
    // Solo considerar 2xx como respuestas válidas (comportamiento estándar de axios)
    return status >= 200 && status < 300;
  }
});

// Health check mejorado y más confiable
api.checkHealth = async () => {
  try {
    // Intentar endpoint de health primero (más rápido)
    try {
      await api.get('/auth/health', { timeout: 5000 });
      return { status: 'online', message: 'Servidor operacional' };
    } catch (healthErr) {
      // Fallback: intentar endpoint protegido (debería dar 401/403)
      try {
        await api.get('/usuarios', { 
          headers: { Authorization: '' }, 
          timeout: 5000 
        });
        return { status: 'online', message: 'Servidor operacional' };
      } catch (usersErr) {
        // 401/403 significa que el servidor está online pero requiere auth
        if (usersErr.response && (usersErr.response.status === 401 || usersErr.response.status === 403)) {
          return { status: 'online', message: 'Servidor operacional' };
        }
        // Otros errores HTTP
        if (usersErr.response && usersErr.response.status >= 500) {
          return { status: 'error', message: 'Error interno del servidor' };
        }
        throw usersErr; // Re-lanzar para manejar como error de red
      }
    }
  } catch (error) {
    // Error de red o timeout
    if (!error.response || error.code === 'ECONNREFUSED' || error.code === 'TIMEOUT') {
      return { status: 'offline', message: 'Servidor no disponible' };
    }
    return { status: 'error', message: 'Error de conectividad' };
  }
};

// Interceptor: adjunta JWT si existe y loguea requests
api.interceptors.request.use((request) => {
  const token = localStorage.getItem('token');
  if (token) {
    request.headers = request.headers || {};
    request.headers.Authorization = `Bearer ${token}`;
    console.log('🔐 JWT Token added to request:', token.substring(0, 50) + '...');
  } else {
    console.log('⚠️  No JWT token found in localStorage');
  }
  // logs mínimos para debug
  console.log('Request:', { 
    url: request.url, 
    method: request.method, 
    headers: request.headers,
    data: request.data 
  });
  return request;
});

api.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', { 
      url: response.config.url, 
      status: response.status, 
      dataLength: response.data ? JSON.stringify(response.data).length : 0 
    });
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    console.error('❌ HTTP Error:', { 
      url: error.config?.url,
      status, 
      data, 
      message: error.message,
      headers: error.response?.headers 
    });
    // opcional: redirigir en 401
    if (status === 401) {
      console.log('🚪 401 detected, removing token and redirecting to login');
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
