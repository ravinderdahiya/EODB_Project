import { Navigate } from "react-router-dom";
import { decrypt } from "../utils/crypto";

function ProtectedRoute({ children, requireAdmin = false }) {
  // Developer mode bypass for development only
  // Check environment variable first, then localStorage for runtime toggle
  const isDeveloperMode = import.meta.env.VITE_DEVELOPER_MODE === 'true' ||
                         localStorage.getItem("developerMode") === 'true';

  if (isDeveloperMode) {
    return children;
  }

  const encryptedToken = localStorage.getItem("token");
  const token = encryptedToken ? decrypt(encryptedToken) : null;
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  if (!token) return <Navigate to="/login" />;
  if (requireAdmin && !isAdmin) return <Navigate to="/login" />;

  return children;
}

export default ProtectedRoute;