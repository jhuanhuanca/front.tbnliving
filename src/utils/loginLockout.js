const STORAGE_PREFIX = "tbn_login_lockout_";

export const MAX_LOGIN_ATTEMPTS = 3;
export const LOCKOUT_MINUTES = 15;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function storageKey(email) {
  return `${STORAGE_PREFIX}${normalizeEmail(email)}`;
}

function readRecord(email) {
  const key = storageKey(email);
  if (!key || key === STORAGE_PREFIX) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      attempts: Number(parsed.attempts) || 0,
      lockedUntil: Number(parsed.lockedUntil) || 0,
    };
  } catch {
    return null;
  }
}

function writeRecord(email, record) {
  const key = storageKey(email);
  if (!key || key === STORAGE_PREFIX) return;
  try {
    localStorage.setItem(key, JSON.stringify(record));
  } catch {
    /* ignore */
  }
}

function clearRecord(email) {
  const key = storageKey(email);
  if (!key || key === STORAGE_PREFIX) return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function formatRemaining(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0 && sec > 0) return `${min} min ${sec} s`;
  if (min > 0) return `${min} min`;
  return `${sec} s`;
}

function buildLockedMessage(remainingMs) {
  return `Demasiados intentos fallidos. El acceso está bloqueado temporalmente. Inténtalo de nuevo en ${formatRemaining(remainingMs)}.`;
}

/** Estado de bloqueo para el correo indicado. */
export function getLoginLockoutState(email) {
  const now = Date.now();
  const record = readRecord(email);
  if (!record) {
    return {
      attempts: 0,
      isLocked: false,
      attemptsRemaining: MAX_LOGIN_ATTEMPTS,
      remainingMs: 0,
      message: "",
    };
  }

  if (record.lockedUntil > now) {
    const remainingMs = record.lockedUntil - now;
    return {
      attempts: record.attempts,
      isLocked: true,
      attemptsRemaining: 0,
      remainingMs,
      message: buildLockedMessage(remainingMs),
    };
  }

  if (record.attempts >= MAX_LOGIN_ATTEMPTS) {
    clearRecord(email);
  }

  const attempts = record.attempts >= MAX_LOGIN_ATTEMPTS ? 0 : record.attempts;
  return {
    attempts,
    isLocked: false,
    attemptsRemaining: Math.max(0, MAX_LOGIN_ATTEMPTS - attempts),
    remainingMs: 0,
    message: "",
  };
}

/** Registra un intento fallido por credenciales incorrectas. */
export function recordFailedLoginAttempt(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return getLoginLockoutState(email);
  }

  const now = Date.now();
  const current = readRecord(normalized);
  let attempts = (current?.attempts || 0) + 1;
  let lockedUntil = current?.lockedUntil || 0;

  if (current?.lockedUntil && current.lockedUntil <= now) {
    attempts = 1;
    lockedUntil = 0;
  }

  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    lockedUntil = now + LOCKOUT_MINUTES * 60 * 1000;
  }

  writeRecord(normalized, { attempts, lockedUntil });
  return getLoginLockoutState(normalized);
}

export function clearLoginLockout(email) {
  clearRecord(email);
}

/** Solo credenciales inválidas (401 sin código de negocio). */
export function isWrongCredentialsError(error) {
  const status = error?.response?.status;
  const code = error?.response?.data?.code;
  if (status !== 401) return false;
  if (code) return false;
  return true;
}
