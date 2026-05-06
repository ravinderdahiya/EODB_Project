import { Navigate } from "react-router-dom";


function ProtectedRoute({ children, requireAdmin = false }) {
  // Developer mode bypass for development only
  // Check environment variable first, then localStorage for runtime toggle
  const isAuthenticated = sessionStorage.getItem("isAuthenticated") === "true";
  if (!isAuthenticated)
     return <Navigate to="/login" replace />;
  const isDeveloperMode = import.meta.env.VITE_DEVELOPER_MODE === 'true' ||
                         localStorage.getItem("developerMode") === 'true';

  if (isDeveloperMode) {
    return children;
  }

  const token = localStorage.getItem("token");
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  if (!token) return <Navigate to="/login" />;
  if (requireAdmin && !isAdmin) return <Navigate to="/login" />;

  return children;
}

export default ProtectedRoute;
