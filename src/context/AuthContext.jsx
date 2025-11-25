import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

// AuthContext: mantiene email y roleId (número) del usuario autenticado
const AuthContext = createContext({
  email: null,
  roleId: null,
  nombreCompleto: null,
  setAuth: () => {},
  loading: false,
});

export function AuthProvider({ children }) {
  const [email, setEmail] = useState(null);
  const [roleId, setRoleId] = useState(null);
  const [nombreCompleto, setNombreCompleto] = useState(null);
  const [loading, setLoading] = useState(false);

  const decodeJwt = (token) => {
    try {
      const payload = token.split('.')[1];
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decodeURIComponent(
        Array.prototype.map
          .call(json, (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      ));
    } catch (e) {
      // fallback simple
      try {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload));
      } catch (_) {
        return null;
      }
    }
  };

  const deriveRoleId = (claims) => {
    if (!claims) return null;
    // Variantes habituales
    const fromNumeric = claims.roleId ?? claims.rol?.id ?? claims.role?.id;
    if (fromNumeric != null) {
      const n = Number(fromNumeric);
      return Number.isNaN(n) ? null : n;
    }
    const roleStr = claims.role || claims.rol || claims.authority || claims.authorities;
    const rolesArr = Array.isArray(roleStr) ? roleStr : typeof roleStr === 'string' ? [roleStr] : [];
    const subjectRoles = Array.isArray(claims.roles) ? claims.roles : [];
    const all = [...rolesArr, ...subjectRoles].map((r) => String(r).toUpperCase());
    if (all.includes('ADMIN') || all.includes('ROLE_ADMIN')) return 1;
    if (all.includes('USER') || all.includes('ROLE_USER')) return 2;
    return null;
  };

  // Cargar desde localStorage si existe
  useEffect(() => {
    // Preferir JWT si está disponible
    const token = localStorage.getItem('token');
    if (token) {
      // Validar que el token no esté expirado
      try {
        const claims = decodeJwt(token);
        const now = Math.floor(Date.now() / 1000);
        if (claims?.exp && claims.exp < now) {
          console.warn('🔑 Token expirado, limpiando datos');
          localStorage.removeItem('token');
          localStorage.removeItem('auth_email');
          localStorage.removeItem('auth_roleId');
          localStorage.removeItem('auth_nombreCompleto');
          return;
        }
      } catch (e) {
        console.warn('🔑 Token inválido, limpiando datos');
        localStorage.removeItem('token');
        return;
      }
      const claims = decodeJwt(token);
      const em = claims?.email || claims?.username || claims?.sub || null;
      const rId = deriveRoleId(claims);
      const nombre = claims?.nombreCompleto || claims?.name || null;
      
      if (em) {
        setEmail(em);
        localStorage.setItem('auth_email', em);
      }
      if (nombre) {
        setNombreCompleto(nombre);
        localStorage.setItem('auth_nombreCompleto', nombre);
      }
      if (rId != null) {
        setRoleId(rId);
        localStorage.setItem('auth_roleId', String(rId));
      } else {
        // Fallback: usar roleId persistido si existe
        const storedRole = localStorage.getItem('auth_roleId');
        if (storedRole) {
          setRoleId(Number(storedRole));
        }
      }
    } else {
      const storedEmail = localStorage.getItem('auth_email');
      const storedRole = localStorage.getItem('auth_roleId');
      const storedNombre = localStorage.getItem('auth_nombreCompleto');
      if (storedEmail) setEmail(storedEmail);
      if (storedRole) setRoleId(Number(storedRole));
      if (storedNombre) setNombreCompleto(storedNombre);
    }
  }, []);

  const setAuth = async (newEmail) => {
    // Preferir el token actual para derivar email/role cuando exista
    const token = localStorage.getItem('token');
    if (token) {
      const claims = decodeJwt(token);
      const em = claims?.email || claims?.username || claims?.sub || newEmail || null;
      const rId = deriveRoleId(claims);
      const nombre = claims?.nombreCompleto || claims?.name || null;
      
      if (em) {
        setEmail(em);
        localStorage.setItem('auth_email', em);
      }
      if (nombre) {
        setNombreCompleto(nombre);
        localStorage.setItem('auth_nombreCompleto', nombre);
      }
      if (rId != null) {
        setRoleId(rId);
        localStorage.setItem('auth_roleId', String(rId));
        return; // ya resolvimos rol desde token
      }
      // Si el token no trae rol, continuar al fallback
    } else if (newEmail) {
      setEmail(newEmail);
      localStorage.setItem('auth_email', newEmail);
    }

    // Solo resolver datos adicionales después del login exitoso
    if (!newEmail) return;
  };

  return (
    <AuthContext.Provider value={{ email, roleId, nombreCompleto, setAuth, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
