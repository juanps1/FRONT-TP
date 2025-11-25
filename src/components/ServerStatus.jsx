import { useState, useEffect } from 'react';
import api from '../api/client';

export default function ServerStatus() {
  const [status, setStatus] = useState('checking');
  const [isHovered, setIsHovered] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  useEffect(() => {
    const checkServer = async () => {
      try {
        const startTime = performance.now();
        const response = await api.get('/roles');
        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);
        setStatus('online');
        setLastChecked({ time: new Date(), latency });
        // console.log('Conexión exitosa:', response); // Comentado para reducir logs
      } catch (error) {
        console.error('Error de conexión:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          config: {
            baseURL: error.config?.baseURL,
            url: error.config?.url,
            method: error.config?.method
          }
        });
        setStatus('offline');
        setLastChecked({ 
          time: new Date(), 
          error: `${error.message} - URL: ${error.config?.baseURL}${error.config?.url}`
        });
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 15000); // Verificar cada 15 segundos

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return {
          dot: 'bg-green-500',
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-700 dark:text-green-300'
        };
      case 'offline':
        return {
          dot: 'bg-red-500',
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: 'text-red-700 dark:text-red-300'
        };
      default:
        return {
          dot: 'bg-yellow-500 animate-pulse',
          bg: 'bg-yellow-100 dark:bg-yellow-900/30',
          text: 'text-yellow-700 dark:text-yellow-300'
        };
    }
  };

  const getStatusText = () => {
    if (!isHovered) {
      return status === 'online' 
        ? 'Conectado' 
        : status === 'offline' 
          ? 'Desconectado' 
          : 'Verificando...';
    }

    if (!lastChecked) return 'Verificando estado...';

    const timeString = lastChecked.time.toLocaleTimeString();
    if (status === 'online') {
      return `Conectado (${lastChecked.latency}ms) - Última verificación: ${timeString}`;
    }
    return `Desconectado - Último intento: ${timeString}`;
  };

  const colors = getStatusColor();

  return (
    <div
      className="fixed top-4 right-4 z-50 transition-all duration-200 ease-in-out"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex items-center gap-2 ${colors.bg} px-3 py-2 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 transition-all duration-200 cursor-pointer hover:shadow-xl`}>
        <div className={`h-2.5 w-2.5 rounded-full ${colors.dot}`} />
        <span className={`text-sm font-medium whitespace-nowrap ${colors.text}`}>
          {getStatusText()}
        </span>
      </div>
    </div>
  );
}