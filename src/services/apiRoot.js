import axios from "axios";
import { resolveApiRoot } from "@/config/apiEndpoints";

/**
 * Origen del API (sin /api/v1). Sanctum y rutas legacy: /api/register, /sanctum/csrf-cookie
 */
export function getApiRoot() {
  return resolveApiRoot();
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
