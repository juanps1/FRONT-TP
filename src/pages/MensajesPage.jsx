import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import NewConversationModal from '../components/NewConversationModal';

export default function MensajesPage() {
  const navigate = useNavigate();
  const { email, roleId } = useAuth();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [conversaciones, setConversaciones] = useState([]);
  const [conversacionActiva, setConversacionActiva] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [editando, setEditando] = useState(null);
  const [contenidoEditado, setContenidoEditado] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const messagesEndRef = useRef(null);

  // Obtener el ID del usuario actual desde email
  useEffect(() => {
    const fetchUserId = async () => {
      if (!email) return;
      try {
        const res = await api.get('/usuarios');
        const user = (res.data || []).find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (user) {
          setCurrentUserId(user.id);
        }
      } catch (err) {
        console.error('Error al obtener usuario actual:', err);
      }
    };
    fetchUserId();
  }, [email]);

  // Cargar conversaciones del usuario
  useEffect(() => {
    if (currentUserId) {
      cargarConversaciones();
      const interval = setInterval(cargarConversaciones, 5000); // Polling cada 5s
      return () => clearInterval(interval);
    }
  }, [currentUserId]);

  // Cargar mensajes cuando cambia la conversación activa
  useEffect(() => {
    if (conversacionActiva) {
      cargarMensajes();
      const interval = setInterval(cargarMensajes, 3000); // Polling cada 3s
      return () => clearInterval(interval);
    }
  }, [conversacionActiva]);

  // Auto-scroll al final de mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const cargarConversaciones = async () => {
    try {
      const res = await api.get(`/conversaciones/usuario/${currentUserId}`);
      setConversaciones(res.data || []);
    } catch (err) {
      console.error('Error al cargar conversaciones:', err);
    }
  };

  const cargarMensajes = async () => {
    if (!conversacionActiva) return;
    try {
      const res = await api.get(`/mensajes/conversacion/${conversacionActiva.id}`, {
        params: { usuarioId: currentUserId }
      });
      setMensajes(res.data || []);
      // Marcar como leído
      await api.put(`/conversaciones/${conversacionActiva.id}/marcar-leido`, {
        usuarioId: currentUserId
      });
      // Refrescar conversaciones para actualizar badge
      cargarConversaciones();
    } catch (err) {
      console.error('Error al cargar mensajes:', err);
    }
  };

  const enviarMensaje = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim() || !conversacionActiva) return;
    setLoading(true);
    try {
      await api.post('/mensajes', {
        conversacionId: conversacionActiva.id,
        remitenteId: currentUserId,
        contenido: nuevoMensaje
      });
      setNuevoMensaje('');
      cargarMensajes();
    } catch (err) {
      console.error('Error al enviar mensaje:', err);
    } finally {
      setLoading(false);
    }
  };

  const iniciarEdicion = (mensaje) => {
    setEditando(mensaje.id);
    setContenidoEditado(mensaje.contenido);
  };

  const guardarEdicion = async (mensajeId) => {
    if (!contenidoEditado.trim()) return;
    try {
      await api.put(`/mensajes/${mensajeId}`, {
        usuarioId: currentUserId,
        contenido: contenidoEditado
      });
      setEditando(null);
      setContenidoEditado('');
      cargarMensajes();
    } catch (err) {
      console.error('Error al editar mensaje:', err);
    }
  };

  const eliminarMensaje = async (mensajeId) => {
    if (!window.confirm('¿Eliminar este mensaje?')) return;
    try {
      await api.delete(`/mensajes/${mensajeId}`, {
        params: { usuarioId: currentUserId }
      });
      cargarMensajes();
    } catch (err) {
      console.error('Error al eliminar mensaje:', err);
    }
  };

  const handleNuevaConversacion = (conversacion) => {
    setConversaciones(prev => [conversacion, ...prev]);
    setConversacionActiva(conversacion);
    setShowNewConversationModal(false);
  };

  const getNombreConversacion = (conv) => {
    if (conv.tipo === 'grupal') return conv.nombre;
    // Conversación privada: mostrar el nombre del otro participante
    const otroParticipante = conv.participantes?.find(p => p.id !== currentUserId);
    return otroParticipante?.nombreCompleto || 'Conversación';
  };

  const conversacionesFiltradas = conversaciones.filter(conv => {
    const nombre = getNombreConversacion(conv).toLowerCase();
    return nombre.includes(busqueda.toLowerCase());
  });

  return (
    <div className="flex h-screen bg-background-light dark:bg-background-dark">
      {/* Sidebar con conversaciones */}
      <aside className="w-80 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-primary">Mensajes</h2>
            <button
              onClick={() => setShowNewConversationModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-semibold"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Nueva
            </button>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-sm">search</span>
            <input
              type="text"
              placeholder="Buscar conversaciones..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversacionesFiltradas.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <span className="material-symbols-outlined text-4xl mb-2 block">chat_bubble_outline</span>
              <p className="text-sm">No hay conversaciones</p>
            </div>
          ) : (
            conversacionesFiltradas.map(conv => (
              <button
                key={conv.id}
                onClick={() => setConversacionActiva(conv)}
                className={`w-full p-4 text-left border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                  conversacionActiva?.id === conv.id ? 'bg-primary/10 dark:bg-primary/20' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                        {getNombreConversacion(conv)}
                      </h3>
                      {conv.tipo === 'grupal' && (
                        <span className="material-symbols-outlined text-xs text-slate-400">group</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(conv.ultimaActividad).toLocaleString('es', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {conv.mensajesNoLeidos > 0 && (
                    <span className="flex items-center justify-center h-5 min-w-5 px-1.5 bg-primary text-white text-xs font-bold rounded-full">
                      {conv.mensajesNoLeidos}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Área de chat */}
      <main className="flex-1 flex flex-col">
        {!conversacionActiva ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <span className="material-symbols-outlined text-6xl mb-4 block">chat</span>
              <p>Selecciona una conversación para empezar</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header del chat */}
            <header className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-lg text-slate-900 dark:text-white">
                    {getNombreConversacion(conversacionActiva)}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {conversacionActiva.tipo === 'grupal' 
                      ? `${conversacionActiva.participantes?.length || 0} participantes`
                      : 'Conversación privada'}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </header>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
              {mensajes.length === 0 ? (
                <div className="text-center text-slate-400 mt-8">
                  <p className="text-sm">No hay mensajes aún. ¡Envía el primero!</p>
                </div>
              ) : (
                mensajes.map(msg => {
                  const esMio = msg.remitente?.id === currentUserId;
                  return (
                    <div key={msg.id} className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-md ${esMio ? 'bg-primary text-white' : 'bg-white dark:bg-slate-800'} rounded-lg p-3 shadow`}>
                        {!esMio && (
                          <p className="text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">
                            {msg.remitente?.nombreCompleto}
                          </p>
                        )}
                        {editando === msg.id ? (
                          <div>
                            <textarea
                              value={contenidoEditado}
                              onChange={(e) => setContenidoEditado(e.target.value)}
                              className="w-full p-2 border rounded text-slate-900 text-sm"
                              rows={2}
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => guardarEdicion(msg.id)}
                                className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={() => setEditando(null)}
                                className="px-3 py-1 bg-slate-300 text-slate-700 rounded text-xs hover:bg-slate-400"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {msg.eliminado ? <em className="opacity-60">[Mensaje eliminado]</em> : msg.contenido}
                            </p>
                            <div className="flex items-center justify-between mt-2 gap-2">
                              <p className={`text-xs ${esMio ? 'text-white/70' : 'text-slate-400'}`}>
                                {new Date(msg.fechaEnvio).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                                {msg.editado && <span className="ml-1">(editado)</span>}
                              </p>
                              {esMio && !msg.eliminado && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => iniciarEdicion(msg)}
                                    className="text-xs text-white/80 hover:text-white"
                                    title="Editar"
                                  >
                                    <span className="material-symbols-outlined text-sm">edit</span>
                                  </button>
                                  <button
                                    onClick={() => eliminarMensaje(msg.id)}
                                    className="text-xs text-white/80 hover:text-white"
                                    title="Eliminar"
                                  >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de mensaje */}
            <form onSubmit={enviarMensaje} className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !nuevoMensaje.trim()}
                  className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </>
        )}
      </main>

      <NewConversationModal
        isOpen={showNewConversationModal}
        onClose={() => setShowNewConversationModal(false)}
        onCreate={handleNuevaConversacion}
        currentUserId={currentUserId}
      />
    </div>
  );
}
