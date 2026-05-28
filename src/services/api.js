import axios from "axios";
import { getApiRoot, useCredentials } from "./apiRoot";
import { ensureCsrfCookie, resetCsrfCookie } from "./sanctum";

/**
 * API v1: /api/v1/*
 * CSRF + cookies: dominio raíz (api.tbnliving.com) vía sanctum.js
 */
const baseURL = process.env.VUE_APP_API_URL || "/api/v1";

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  timeout: 60000,
  withCredentials: useCredentials,
  withXSRFToken: useCredentials,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});

api.interceptors.request.use(async (config) => {
  const method = (config.method || "get").toLowerCase();
  const needsCsrf = ["post", "put", "patch", "delete"].includes(method);

  if (needsCsrf && config.withCredentials) {
    await ensureCsrfCookie();
  }

  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const config = error.config;
    const url = String(error.config?.url || "");

    if (status === 419 && config && !config.__csrfRetried) {
      resetCsrfCookie();
      await ensureCsrfCookie();
      config.__csrfRetried = true;
      return api.request(config);
    }

    const isAuthRoute =
      url.includes("/auth/login") ||
      url.includes("/auth/logout") ||
      url.includes("/login") ||
      url.includes("/register");

    if (status === 401 && !isAuthRoute && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      const path = window.location.pathname || "/";
      if (!path.includes("signin") && !path.includes("signup") && !path.includes("recuperar")) {
        const q = new URLSearchParams({
          redirect: path + (window.location.search || ""),
        });
        window.location.replace(`/signin?${q.toString()}`);
      }
    }
    return Promise.reject(error);
  }
);

export { getApiRoot, useCredentials };
export default api;
