import { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function NewConversationModal({ isOpen, onClose, onCreate, currentUserId }) {
  const { roleId } = useAuth();
  const [tipo, setTipo] = useState('privada'); // 'privada' o 'grupal'
  const [usuarios, setUsuarios] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [nombreGrupo, setNombreGrupo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [resolviendo, setResolviendo] = useState(false);

  useEffect(() => {
    if (isOpen) {
      cargarUsuarios();
    }
  }, [isOpen]);

  const cargarUsuarios = async () => {
    setLoadingUsuarios(true);
    setError('');
    try {
      // Usar el endpoint específico para chat que está disponible para todos los usuarios autenticados
      const res = await api.get('/usuarios/para-chat');
      // Filtrar usuario actual
      const filtered = (res.data || []).filter(u => u.id !== currentUserId);
      setUsuarios(filtered);
    } catch (err) {
      const status = err.response?.status;
      // Evitamos ruido en consola; mantenemos solo UI amigable.
      if (status === 401 || status === 403) {
        setError('No tenés permiso para listar usuarios. Podés crear conversación buscando por email.');
      } else {
        setError('No se pudo cargar la lista de usuarios');
      }
      setUsuarios([]);
    } finally {
      setLoadingUsuarios(false);
    }
  };

  // Resolver id de usuario por email probando endpoints comunes
  const resolveUserIdByEmail = async (email) => {
    const e = String(email || '').trim();
    if (!e) return null;
    // 1) /usuarios/search?query=
    try {
      const r = await api.get('/usuarios/search', { params: { query: e } });
      const list = r.data || [];
      const found = list.find(u => u.email?.toLowerCase() === e.toLowerCase());
      if (found?.id) return found.id;
    } catch (_) {}
    // 2) /usuarios/by-email?email=
    try {
      const r = await api.get('/usuarios/by-email', { params: { email: e } });
      const u = r.data;
      if (u?.id) return u.id;
    } catch (_) {}
    // 3) /usuarios?email=
    try {
      const r = await api.get('/usuarios', { params: { email: e } });
      const list = Array.isArray(r.data) ? r.data : (r.data?.content || []);
      const found = list.find(u => u.email?.toLowerCase() === e.toLowerCase());
      if (found?.id) return found.id;
    } catch (_) {}
    return null;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tipo === 'privada') {
        let targetId = selectedUserId ? Number(selectedUserId) : null;
        if (!targetId && searchEmail) {
          setResolviendo(true);
          targetId = await resolveUserIdByEmail(searchEmail);
          setResolviendo(false);
          if (!targetId) {
            setError('No se encontró un usuario con ese email');
            setLoading(false);
            return;
          }
        }
        if (!targetId) {
          setError('Selecciona un usuario o ingresá un email');
          setLoading(false);
          return;
        }
        if (targetId === currentUserId) {
          setError('No podés iniciar una conversación con vos mismo');
          setLoading(false);
          return;
        }
        const res = await api.post('/conversaciones/privada', {
          usuario1Id: currentUserId,
          usuario2Id: Number(targetId)
        });
        onCreate(res.data);
      } else {
        if (!nombreGrupo.trim()) {
          setError('Ingresa un nombre para el grupo');
          setLoading(false);
          return;
        }
        if (selectedUserIds.length === 0) {
          setError('Selecciona al menos un participante');
          setLoading(false);
          return;
        }
        const res = await api.post('/conversaciones/grupal', {
          nombre: nombreGrupo,
          creadorId: currentUserId,
          participantesIds: selectedUserIds.map(Number)
        });
        onCreate(res.data);
      }
      handleClose();
    } catch (err) {
      console.error('Error al crear conversación:', err);
      setError(err.response?.data?.message || 'No se pudo crear la conversación');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTipo('privada');
    setSelectedUserId('');
    setSelectedUserIds([]);
    setNombreGrupo('');
    setError('');
    onClose();
  };

  const toggleUserSelection = (userId) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Nueva Conversación</h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleCreate}>
          {/* Selector de tipo */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Tipo de conversación</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipo"
                  value="privada"
                  checked={tipo === 'privada'}
                  onChange={(e) => setTipo(e.target.value)}
                  className="text-primary"
                />
                <span>Privada</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipo"
                  value="grupal"
                  checked={tipo === 'grupal'}
                  onChange={(e) => setTipo(e.target.value)}
                  className="text-primary"
                />
                <span>Grupal</span>
              </label>
            </div>
          </div>

          {/* Conversación privada */}
          {tipo === 'privada' && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Selecciona un usuario</label>
              {loadingUsuarios && (
                <div className="text-xs mb-2 text-slate-500">Cargando usuarios...</div>
              )}
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 disabled:opacity-50"
                required
                disabled={!!error || loadingUsuarios || usuarios.length === 0}
              >
                <option value="">-- Selecciona --</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.nombreCompleto || 'Sin nombre'} ({u.email})
                  </option>
                ))}
              </select>
              {error && (
                <div className="mt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={cargarUsuarios}
                    className="text-xs self-start px-2 py-1 rounded bg-primary text-white hover:bg-primary/90"
                  >Reintentar</button>
                </div>
              )}
              {/* Búsqueda por email como alternativa cuando no se puede listar */}
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">O ingresá el email del usuario</label>
                <input
                  type="email"
                  value={searchEmail}
                  onChange={(e)=>setSearchEmail(e.target.value)}
                  placeholder="usuario@correo.com"
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                />
                {resolviendo && <p className="text-xs text-slate-500 mt-1">Buscando usuario…</p>}
              </div>
            </div>
          )}

          {/* Conversación grupal (solo si hay usuarios y no hay error). Si el list endpoint está restringido se deshabilita. */}
          {tipo === 'grupal' && (
            <>
              {error && (
                <p className="text-xs mb-2 text-amber-600">No se puede crear conversación grupal sin listado de usuarios.</p>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Nombre del grupo</label>
                <input
                  type="text"
                  value={nombreGrupo}
                  onChange={(e) => setNombreGrupo(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 disabled:opacity-50"
                  placeholder="Ej: Equipo de proyecto"
                  required
                  disabled={!!error}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Participantes</label>
                <div className="border border-slate-300 dark:border-slate-700 rounded-lg p-3 max-h-48 overflow-y-auto bg-white dark:bg-slate-800">
                  {loadingUsuarios && <p className="text-xs text-slate-500">Cargando usuarios…</p>}
                  {!loadingUsuarios && usuarios.length === 0 && !error && (
                    <p className="text-sm text-slate-500">No hay usuarios disponibles</p>
                  )}
                  {!error && usuarios.map(u => (
                    <label key={u.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 px-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(u.id)}
                        onChange={() => toggleUserSelection(u.id)}
                        className="text-primary"
                      />
                      <span className="text-sm">{u.nombreCompleto || u.email}</span>
                    </label>
                  ))}
                  {error && (
                    <p className="text-xs text-red-600">{error}</p>
                  )}
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || (tipo === 'privada' && (!selectedUserId || !!error)) || (tipo === 'grupal' && (!!error || selectedUserIds.length === 0))}
              className="px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
