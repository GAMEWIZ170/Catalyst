import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="flex min-h-dvh items-center justify-center text-muted-foreground"><span className="mr-2 inline-block size-5 animate-spin rounded-full border-2 border-border border-t-primary motion-reduce:animate-none" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
