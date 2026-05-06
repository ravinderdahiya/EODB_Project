import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, requireAdmin = false }) {
  // Developer mode bypass for development only
  // Check environment variable first, then localStorage for runtime toggle
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