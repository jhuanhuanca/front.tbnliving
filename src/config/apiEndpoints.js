/**
 * URLs canónicas del API TBN Living (producción).
 * Si el build no carga .env.production, estos valores evitan enviar peticiones
 * al mismo origen del front (proxy legacy) o a dominios antiguos.
 */
export const TBN_API_ROOT = "https://api.tbnliving.com";
export const TBN_API_V1 = `${TBN_API_ROOT}/api/v1`;

/** Dominios de despliegues anteriores — no deben usarse en build de producción. */
export const LEGACY_API_HOSTS = [
  "imparablesjhn.shop",
  "app.imparablesjhn.shop",
  "imparables.shop",
];

export function containsLegacyApiHost(url) {
  const value = String(url || "").toLowerCase();
  return LEGACY_API_HOSTS.some((host) => value.includes(host));
}

/** Origen del API sin /api/v1 (Sanctum, /api/register legacy). */
export function resolveApiRoot() {
  if (process.env.VUE_APP_API_ROOT) {
    const root = String(process.env.VUE_APP_API_ROOT).replace(/\/$/, "");
    if (process.env.NODE_ENV === "production" && containsLegacyApiHost(root)) {
      console.warn(
        "[api] VUE_APP_API_ROOT apunta a un dominio legacy; usando",
        TBN_API_ROOT
      );
      return TBN_API_ROOT;
    }
    return root;
  }

  const v1 = process.env.VUE_APP_API_URL || "";
  if (v1) {
    const root = String(v1).replace(/\/api\/v1\/?$/i, "").replace(/\/$/, "");
    if (process.env.NODE_ENV === "production" && containsLegacyApiHost(root)) {
      return TBN_API_ROOT;
    }
    return root;
  }

  if (process.env.NODE_ENV === "production") {
    return TBN_API_ROOT;
  }

  return "";
}

/** Base URL para rutas /api/v1/* */
export function resolveApiV1BaseUrl() {
  if (process.env.VUE_APP_API_URL) {
    const url = String(process.env.VUE_APP_API_URL).replace(/\/$/, "");
    if (process.env.NODE_ENV === "production" && containsLegacyApiHost(url)) {
      return TBN_API_V1;
    }
    return url;
  }

  if (process.env.NODE_ENV === "production") {
    return TBN_API_V1;
  }

  return "/api/v1";
}

export function memberRegisterUrl() {
  const root = resolveApiRoot();
  return root ? `${root}/api/register` : "/api/register";
}

export function preferredCustomerRegisterUrl() {
  const root = resolveApiRoot();
  return root ? `${root}/api/register/preferred-customer` : "/api/register/preferred-customer";
}
