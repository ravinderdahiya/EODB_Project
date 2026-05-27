import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

const ADMIN_ROLES = new Set(["admin", "superadmin"]);

function ProtectedRoute({ children, requireAdmin = false }) {
  const [status, setStatus] = useState("loading");

  // Allow bypass only in local/dev builds when explicitly enabled by env.
  const isDeveloperMode = useMemo(() => (
    import.meta.env.DEV && String(import.meta.env.VITE_DEVELOPER_MODE || "").toLowerCase() === "true"
  ), []);

  useEffect(() => {
    if (isDeveloperMode) {
      setStatus("allowed");
      return;
    }

    let active = true;

    const verifySession = async () => {
      try {
        const response = await axiosInstance.get("/user/me");
        if (!active) return;

        const serverUser = response?.data || {};
        const serverRole = String(serverUser?.role || "").toLowerCase().trim();
        const isAdmin = ADMIN_ROLES.has(serverRole);

        sessionStorage.setItem("user", JSON.stringify(serverUser));
        sessionStorage.setItem("isAuthenticated", "true");
        sessionStorage.setItem("isAdmin", isAdmin ? "true" : "false");

        if (requireAdmin && !isAdmin) {
          setStatus("forbidden");
          return;
        }

        setStatus("allowed");
      } catch {
        if (!active) return;
        sessionStorage.removeItem("isAuthenticated");
        sessionStorage.removeItem("user");
        sessionStorage.removeItem("isAdmin");
        setStatus("denied");
      }
    };

    void verifySession();

    return () => {
      active = false;
    };
  }, [isDeveloperMode, requireAdmin]);

  if (status === "loading") return null;
  if (status === "denied") return <Navigate to="/login" replace />;
  if (status === "forbidden") return <Navigate to="/login" replace />;

  return children;
}

export default ProtectedRoute;
