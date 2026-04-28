import axios from "axios";
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_SERVER_BASE_URL || "http://localhost:8080",
});
export default axiosInstance;