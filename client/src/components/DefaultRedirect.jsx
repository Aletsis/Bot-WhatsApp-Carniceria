import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function DefaultRedirect() {
  const { getDefaultPage } = useAuth();
  return <Navigate to={getDefaultPage()} replace />;
}