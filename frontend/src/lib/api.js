import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

/**
 * Request interceptor — attaches JWT to every outgoing request.
 * No token means the header is simply omitted; public endpoints still work.
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Response interceptor — handles global 401 errors.
 * If any API call returns 401 (token expired, revoked, etc.)
 * we clear the token so the user is effectively logged out
 * on the next page interaction/navigation.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      // Don't force a redirect here — let the React tree handle it
      // via AuthProvider's state and ProtectedRoute.
    }
    return Promise.reject(error);
  }
);

export default api;
