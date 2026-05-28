import api from "./api";
import { httpRoot } from "./apiRoot";
import { ensureCsrfCookie } from "./sanctum";
import { fetchProfile } from "./me";

/** Extrae token y user de respuestas v1 (envoltorio) o legacy (planos). */
export function parseAuthPayload(data) {
  if (!data || typeof data !== "object") {
    return { token: null, user: null };
  }
  const token = data.data?.token ?? data.token ?? null;
  const user = data.data?.user ?? data.user ?? null;
  return { token, user };
}

export async function login({ email, password, country_code, device_name }) {
  await ensureCsrfCookie();
  const res = await api.post("/auth/login", {
    email,
    password,
    country_code,
    device_name: device_name || "front-member",
  });
  return parseAuthPayload(res.data);
}

export async function logout() {
  try {
    await ensureCsrfCookie();
    if (localStorage.getItem("token")) {
      await api.post("/auth/logout");
    }
  } catch {
    // Token expirado: limpiar local igualmente.
  }
}

export async function fetchSessionUser() {
  const res = await api.get("/auth/me");
  const { user } = parseAuthPayload(res.data);
  if (user) return user;
  return fetchProfile();
}

/**
 * Registro MLM — ruta legacy que usa el panel/documentación: POST /api/register
 * Flujo: GET /sanctum/csrf-cookie → POST /api/register
 */
export async function registerMember(payload) {
  await ensureCsrfCookie();
  const response = await httpRoot.post("/api/register", payload);
  return response;
}

/** Alias v1 (misma lógica, prefijo /api/v1/register). */
export async function registerMemberV1(payload) {
  await ensureCsrfCookie();
  return api.post("/register", payload);
}

export async function registerPreferredCustomer(body) {
  await ensureCsrfCookie();
  return httpRoot.post("/api/register/preferred-customer", body);
}

export async function resendVerificationEmail(email) {
  await ensureCsrfCookie();
  return httpRoot.post("/api/email/resend-verification", { email });
}

/** Recuperación de contraseña (OTP por correo). */
export async function forgotPasswordSendCode(email) {
  await ensureCsrfCookie();
  const res = await httpRoot.post("/api/forgot-password", { email: String(email).trim().toLowerCase() });
  return res.data;
}

export async function forgotPasswordVerifyCode({ email, code }) {
  await ensureCsrfCookie();
  const res = await httpRoot.post("/api/verify-code", {
    email: String(email).trim().toLowerCase(),
    code: String(code).trim(),
  });
  return res.data;
}

export async function forgotPasswordReset({ email, code, password, password_confirmation }) {
  await ensureCsrfCookie();
  const res = await httpRoot.post("/api/reset-password", {
    email: String(email).trim().toLowerCase(),
    code: String(code).trim(),
    password,
    password_confirmation,
  });
  return res.data;
}
