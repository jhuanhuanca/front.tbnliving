import axios from "axios";

/**
 * Origen del API (sin /api/v1). Sanctum y rutas legacy: /api/register, /sanctum/csrf-cookie
 */
export function getApiRoot() {
  if (process.env.VUE_APP_API_ROOT) {
    return String(process.env.VUE_APP_API_ROOT).replace(/\/$/, "");
  }
  const v1 = process.env.VUE_APP_API_URL || "";
  if (v1) {
    return String(v1).replace(/\/api\/v1\/?$/i, "").replace(/\/$/, "");
  }
  return "";
}

export const useCredentials =
  process.env.VUE_APP_API_WITH_CREDENTIALS === "true" ||
  (process.env.NODE_ENV === "production" &&
    process.env.VUE_APP_API_WITH_CREDENTIALS !== "false");

/** Cliente HTTP al dominio raíz del API (cookies + CSRF). */
export const httpRoot = axios.create({
  baseURL: getApiRoot(),
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
