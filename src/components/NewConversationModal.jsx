import { useState, useEffect } from 'react';
import api from '../api/client';

export default function NewConversationModal({ isOpen, onClose, onCreate, currentUserId }) {
  const [tipo, setTipo] = useState('privada'); // 'privada' o 'grupal'
  const [usuarios, setUsuarios] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [nombreGrupo, setNombreGrupo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      cargarUsuarios();
    }
  }, [isOpen]);

  const cargarUsuarios = async () => {
    try {
      const res = await api.get('/usuarios');
      // Filtrar usuario actual
      const filtered = (res.data || []).filter(u => u.id !== currentUserId);
      setUsuarios(filtered);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      setError('No se pudo cargar la lista de usuarios');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tipo === 'privada') {
        if (!selectedUserId) {
          setError('Selecciona un usuario');
          setLoading(false);
          return;
        }
        const res = await api.post('/conversaciones/privada', {
          usuario1Id: currentUserId,
          usuario2Id: Number(selectedUserId)
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
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                required
              >
                <option value="">-- Selecciona --</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.nombreCompleto} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Conversación grupal */}
          {tipo === 'grupal' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Nombre del grupo</label>
                <input
                  type="text"
                  value={nombreGrupo}
                  onChange={(e) => setNombreGrupo(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                  placeholder="Ej: Equipo de proyecto"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Participantes</label>
                <div className="border border-slate-300 dark:border-slate-700 rounded-lg p-3 max-h-48 overflow-y-auto bg-white dark:bg-slate-800">
                  {usuarios.length === 0 ? (
                    <p className="text-sm text-slate-500">No hay usuarios disponibles</p>
                  ) : (
                    usuarios.map(u => (
                      <label key={u.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 px-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(u.id)}
                          onChange={() => toggleUserSelection(u.id)}
                          className="text-primary"
                        />
                        <span className="text-sm">{u.nombreCompleto}</span>
                      </label>
                    ))
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
              disabled={loading}
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
