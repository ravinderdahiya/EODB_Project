import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  // Developer mode bypass for development only
  // Check environment variable first, then localStorage for runtime toggle
  const isDeveloperMode = import.meta.env.VITE_DEVELOPER_MODE === 'true' ||
                         localStorage.getItem("developerMode") === 'true';

  if (isDeveloperMode) {
    return children;
  }

  const token = localStorage.getItem("token");

  if (!token) return <Navigate to="/login" />;

  return children;
}

export default ProtectedRoute;