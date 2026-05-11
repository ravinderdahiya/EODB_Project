import axios from "axios";
import { decrypt } from "./crypto";

const axiosInstance = axios.create({
  baseURL: "",
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
    } catch (err) {
      console.error("Token decrypt error:", err);
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
