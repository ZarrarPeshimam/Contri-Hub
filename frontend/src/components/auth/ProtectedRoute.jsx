import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Auth not determined yet — render nothing (no flash).
  if (loading) return null;

  if (!user) {
    // Preserve the intended destination so we can redirect back after login.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
