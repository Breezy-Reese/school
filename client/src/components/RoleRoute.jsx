import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RoleRoute({ roles }) {
  const { can } = useAuth();
  return can(roles) ? <Outlet /> : <Navigate to="/" replace />;
}