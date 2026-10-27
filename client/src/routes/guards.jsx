import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/common/States';

/** Redirects to /login (remembering where the user was going) when there is no session. */
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Checking your session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/**
 * Hides admin pages from non-admins. This is only a convenience: every admin API endpoint
 * is independently protected on the server.
 */
export function AdminRoute() {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Checking your session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Keeps logged-in users away from the login / register pages. */
export function GuestRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  const from = location.state?.from;
  if (user) return <Navigate to={from ? `${from.pathname}${from.search || ''}` : '/'} replace />;
  return <Outlet />;
}
