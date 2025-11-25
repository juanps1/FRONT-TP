import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Uso: <RoleGuard allow={[1]}><UsersPage/></RoleGuard>
export default function RoleGuard({ allow = [], children }) {
  const { roleId } = useAuth();
  // Si aún no resolvimos rol, permitimos renderizar para no bloquear
  if (roleId == null) return children;
  if (allow.includes(roleId)) return children;
  return <Navigate to="/dashboard" replace />;
}
