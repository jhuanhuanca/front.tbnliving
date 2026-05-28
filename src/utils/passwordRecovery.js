const KEY_EMAIL = "tbn_pwd_reset_email";
const KEY_CODE = "tbn_pwd_reset_code";
const KEY_VERIFIED = "tbn_pwd_reset_verified";

export function setRecoveryEmail(email) {
  sessionStorage.setItem(KEY_EMAIL, String(email || "").trim().toLowerCase());
}

export function getRecoveryEmail() {
  return sessionStorage.getItem(KEY_EMAIL) || "";
}

export function setRecoveryCode(code) {
  sessionStorage.setItem(KEY_CODE, String(code || "").trim());
}

export function getRecoveryCode() {
  return sessionStorage.getItem(KEY_CODE) || "";
}

export function setRecoveryVerified(value = true) {
  sessionStorage.setItem(KEY_VERIFIED, value ? "1" : "0");
}

export function isRecoveryVerified() {
  return sessionStorage.getItem(KEY_VERIFIED) === "1";
}

export function clearPasswordRecovery() {
  sessionStorage.removeItem(KEY_EMAIL);
  sessionStorage.removeItem(KEY_CODE);
  sessionStorage.removeItem(KEY_VERIFIED);
}

export function getPasswordStrength(password) {
  const p = String(password || "");
  let score = 0;
  if (p.length >= 8) score += 1;
  if (p.length >= 12) score += 1;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score += 1;
  if (/\d/.test(p)) score += 1;
  if (/[^A-Za-z0-9]/.test(p)) score += 1;

  if (score <= 1) return { label: "Débil", percent: 25, class: "bg-danger" };
  if (score <= 3) return { label: "Media", percent: 55, class: "bg-warning" };
  return { label: "Fuerte", percent: 100, class: "bg-success" };
}
