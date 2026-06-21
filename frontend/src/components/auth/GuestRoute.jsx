import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function GuestRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    return <Navigate to={`/${user.username}`} replace />;
  }

  return children;
}
