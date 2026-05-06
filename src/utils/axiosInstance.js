import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_SERVER_BASE_URL || "http://localhost:8080",
  withCredentials: true, // Send httpOnly auth_token cookie automatically with every request
});


// Auto-redirect to login on expired/invalid token
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;

