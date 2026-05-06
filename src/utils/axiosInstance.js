import axios from "axios";
import { decrypt } from "./crypto";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_SERVER_BASE_URL || "http://localhost:8080",
});

axiosInstance.interceptors.request.use((config) => {
  const encryptedToken = localStorage.getItem("token");
  if (encryptedToken) {
    const token = decrypt(encryptedToken);
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;