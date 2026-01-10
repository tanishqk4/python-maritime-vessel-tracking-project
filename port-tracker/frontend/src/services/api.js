import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// ==============================
// REQUEST: attach JWT token
// ==============================
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");

  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  return config;
});


// ==============================
// RESPONSE: handle auth expiry
// ==============================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      error.response.status === 401 &&
      !error.config.url.includes("/auth/login") &&
      !error.config.url.includes("/auth/register") &&
      !error.config.url.includes("/auth/refresh")
    ) {
      // Token expired or invalid → logout
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");

      // Redirect to landing page
      window.location.href = "/";
    }

    return Promise.reject(error);
  }
);

export default api;
