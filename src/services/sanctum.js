import { httpRoot, useCredentials } from "./apiRoot";

let csrfPromise = null;

/**
 * Paso 1 del flujo Sanctum SPA cross-subdomain.
 * Debe ejecutarse antes de POST /api/register, /api/v1/auth/login, etc.
 */
export async function ensureCsrfCookie() {
  if (!useCredentials) {
    return;
  }

  if (!csrfPromise) {
    csrfPromise = httpRoot
      .get("/sanctum/csrf-cookie")
      .finally(() => {
        csrfPromise = null;
      });
  }

  return csrfPromise;
}

export function resetCsrfCookie() {
  csrfPromise = null;
}
