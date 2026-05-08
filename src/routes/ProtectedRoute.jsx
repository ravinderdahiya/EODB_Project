import { Navigate } from "react-router-dom";
import { decrypt } from "../utils/crypto";


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

  const encryptedToken = localStorage.getItem("token");
  const token = encryptedToken ? decrypt(encryptedToken) : null;
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const hasValidToken = Boolean(token && token.trim());

  // Support both auth styles:
  // 1) JWT in localStorage
  // 2) HttpOnly cookie with sessionStorage auth marker
  // If session is authenticated, allow navigation even when token is absent.
  if (!hasValidToken && !isAuthenticated) return <Navigate to="/login" />;
  if (requireAdmin && !isAdmin) return <Navigate to="/login" />;

  return children;
}

export default ProtectedRoute;
