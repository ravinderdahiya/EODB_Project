import axios from "axios";
import { decrypt } from "./crypto";

const configuredApiBaseUrl = (import.meta.env.VITE_SERVER_BASE_URL || "").trim();
const forceAbsoluteApiBase = String(import.meta.env.VITE_FORCE_ABSOLUTE_API_BASE || "").toLowerCase() === "true";
const apiBaseUrl = import.meta.env.DEV && !forceAbsoluteApiBase ? "" : configuredApiBaseUrl;

const axiosInstance = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true, // Send httpOnly auth_token cookie automatically
});

// ✅ Request Interceptor (Attach decrypted token)
axiosInstance.interceptors.request.use((config) => {
  const encryptedToken = localStorage.getItem("token");

  if (encryptedToken) {
    try {
      const token = decrypt(encryptedToken);
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    } catch {
      // Ignore malformed local token and continue with cookie auth fallback.
    }
  }

  return config;
});

// ✅ Response Interceptor (Handle 401 Unauthorized)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.clear();
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
