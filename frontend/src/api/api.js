import axios from "axios";

// URL do backend (Vercel / Render / localhost)
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL + "/api",
});

// Interceptor para adicionar token automaticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    /*
      IMPORTANTE:
      Não definir Content-Type manualmente para upload.
      O Axios define automaticamente quando é FormData.
    */
    if (!(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
