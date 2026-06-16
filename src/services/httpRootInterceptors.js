import { httpRoot } from "./apiRoot";

let configured = false;

/**
 * Interceptor para httpRoot (registro, forgot-password, sanctum).
 * Replica el retry 419 de api.js, que no aplicaba a POST /api/register.
 */
export function setupHttpRootInterceptors() {
  if (configured) return;
  configured = true;

  httpRoot.interceptors.response.use(
    (response) => response,
    async (error) => {
      const status = error.response?.status;
      const config = error.config;

      if (status === 419 && config && !config.__csrfRetried && !localStorage.getItem("token")) {
        const { resetCsrfCookie, ensureCsrfCookie } = await import("./sanctum");
        resetCsrfCookie();
        await ensureCsrfCookie();
        config.__csrfRetried = true;
        return httpRoot.request(config);
      }

      return Promise.reject(error);
    }
  );
}
