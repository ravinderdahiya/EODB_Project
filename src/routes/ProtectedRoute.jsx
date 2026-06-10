import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import {
  clearTrustedSession,
  hasFreshTrustedSession,
  persistTrustedSession,
} from "@/utils/authSession";

const ADMIN_ROLES = new Set(["admin", "superadmin"]);

function resolveInitialAccess(requireAdmin, isDeveloperMode) {
  if (isDeveloperMode) return "allowed";
  if (sessionStorage.getItem("isAuthenticated") !== "true") return "loading";
  if (requireAdmin && sessionStorage.getItem("isAdmin") !== "true") return "forbidden";
  return "allowed";
}

function ProtectedRoute({ children, requireAdmin = false, onPrefetch }) {
  const isDeveloperMode = useMemo(() => (
    import.meta.env.DEV && String(import.meta.env.VITE_DEVELOPER_MODE || "").toLowerCase() === "true"
  ), []);

  const [status, setStatus] = useState(() => resolveInitialAccess(requireAdmin, isDeveloperMode));

  useEffect(() => {
    onPrefetch?.();
  }, [onPrefetch]);

  useEffect(() => {
    if (isDeveloperMode) {
      setStatus("allowed");
      return undefined;
    }

    let active = true;

    const applyServerUser = (serverUser) => {
      const normalized = persistTrustedSession(serverUser);
      const isAdmin = ADMIN_ROLES.has(normalized.role);

      if (requireAdmin && !isAdmin) {
        setStatus("forbidden");
        return;
      }

      setStatus("allowed");
    };

    const verifySession = async () => {
      try {
        const response = await axiosInstance.get("/user/me");
        if (!active) return;
        applyServerUser(response?.data || {});
      } catch {
        if (!active) return;
        clearTrustedSession();
        setStatus("denied");
      }
    };

    if (hasFreshTrustedSession()) {
      if (requireAdmin && sessionStorage.getItem("isAdmin") !== "true") {
        setStatus("forbidden");
        return () => {
          active = false;
        };
      }

      setStatus("allowed");
      void verifySession();
      return () => {
        active = false;
      };
    }

    if (sessionStorage.getItem("isAuthenticated") === "true") {
      void verifySession();
      return () => {
        active = false;
      };
    }

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
