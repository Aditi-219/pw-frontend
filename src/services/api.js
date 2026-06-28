import axios from "axios";

const api = axios.create({
  baseURL: "https://pw-backend-2cwh.onrender.com/api/v1",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/**
 * Extracts a human-readable error message from an axios error,
 * matching the backend's `{ success, message }` envelope used
 * across the API (see auth pages for the established pattern).
 */
export function getErrorMessage(err, fallback = "Something went wrong. Please try again.") {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    (err?.code === "ECONNABORTED" ? "Request timed out. Please try again." : null) ||
    err?.message ||
    fallback
  );
}

export default api;