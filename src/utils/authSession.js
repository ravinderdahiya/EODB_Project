const ADMIN_ROLES = new Set(["admin", "superadmin"]);
const SESSION_TRUST_MS = 60_000;

export function normalizeSessionUser(serverUser) {
  const role = String(serverUser?.role || "user").toLowerCase().trim();
  return {
    id: serverUser?.id,
    email: serverUser?.email || null,
    mobile: serverUser?.mobile || null,
    role,
  };
}

export function persistTrustedSession(serverUser) {
  const normalized = normalizeSessionUser(serverUser);
  if (!normalized.id) {
    throw new Error("Unable to validate authenticated session.");
  }

  const isAdmin = ADMIN_ROLES.has(normalized.role);
  sessionStorage.setItem("user", JSON.stringify(normalized));
  sessionStorage.setItem("isAuthenticated", "true");
  sessionStorage.setItem("isAdmin", isAdmin ? "true" : "false");
  sessionStorage.setItem("sessionVerifiedAt", String(Date.now()));
  return normalized;
}

export function hasFreshTrustedSession() {
  if (sessionStorage.getItem("isAuthenticated") !== "true") return false;
  const verifiedAt = Number.parseInt(sessionStorage.getItem("sessionVerifiedAt") || "", 10);
  if (!Number.isFinite(verifiedAt) || verifiedAt <= 0) return false;
  return Date.now() - verifiedAt < SESSION_TRUST_MS;
}

export function clearTrustedSession() {
  sessionStorage.removeItem("isAuthenticated");
  sessionStorage.removeItem("user");
  sessionStorage.removeItem("isAdmin");
  sessionStorage.removeItem("sessionVerifiedAt");
}
