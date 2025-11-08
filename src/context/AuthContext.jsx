import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

// AuthContext: mantiene email y roleId (número) del usuario autenticado
const AuthContext = createContext({
  email: null,
  roleId: null,
  setAuth: () => {},
  loading: false,
});

export function AuthProvider({ children }) {
  const [email, setEmail] = useState(null);
  const [roleId, setRoleId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Cargar desde localStorage si existe
  useEffect(() => {
    const storedEmail = localStorage.getItem('auth_email');
    const storedRole = localStorage.getItem('auth_roleId');
    if (storedEmail) setEmail(storedEmail);
    if (storedRole) setRoleId(Number(storedRole));
  }, []);

  const setAuth = async (newEmail) => {
    setEmail(newEmail);
    localStorage.setItem('auth_email', newEmail);
    // Intentar obtener rol desde /usuarios (backend no expone /me, usamos listado y filtramos)
    setLoading(true);
    try {
      const res = await api.get('/usuarios');
      const usuarios = res.data || [];
      const found = usuarios.find(u => u.email?.toLowerCase() === newEmail.toLowerCase());
      if (found?.rol?.id != null) {
        const numericRole = Number(found.rol.id);
        setRoleId(Number.isNaN(numericRole) ? null : numericRole);
        if (!Number.isNaN(numericRole)) {
          localStorage.setItem('auth_roleId', String(numericRole));
        } else {
          localStorage.removeItem('auth_roleId');
        }
      } else {
        setRoleId(null);
        localStorage.removeItem('auth_roleId');
      }
    } catch (e) {
      console.error('No se pudo cargar roles de usuarios', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ email, roleId, setAuth, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
