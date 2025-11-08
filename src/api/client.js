// src/api/client.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080/api", // URL base del backend
  timeout: 10000
});

// Health check estable según backend
api.checkHealth = async () => {
  try {
    await api.get('/roles');
    return true;
  } catch (error) {
    return false;
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
      // localStorage.removeItem('token'); // si queremos limpiar sesión
      // window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

export default api;
