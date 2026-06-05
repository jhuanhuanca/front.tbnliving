import { REFERRAL_SPONSOR_STORAGE_KEY, REFERRAL_BINARY_LEG_STORAGE_KEY } from "@/constants/landingDefaults";
import { normalizeBinaryLegParam } from "@/utils/referralLink";

/** Guarda el código de patrocinador (landing pública, /i/, signup). */
export function persistReferralSponsor(code) {
  const normalized = String(code || "").trim();
  if (!normalized) return;
  try {
    localStorage.setItem(REFERRAL_SPONSOR_STORAGE_KEY, normalized);
  } catch {
    /* ignore */
  }
}

export function readReferralSponsor() {
  try {
    return String(localStorage.getItem(REFERRAL_SPONSOR_STORAGE_KEY) || "").trim();
  } catch {
    return "";
  }
}

/** Pierna binaria sugerida desde enlace de referido (left | right | auto). */
export function persistReferralBinaryLeg(leg) {
  const normalized = normalizeBinaryLegParam(leg);
  if (!normalized) return;
  try {
    localStorage.setItem(REFERRAL_BINARY_LEG_STORAGE_KEY, normalized);
  } catch {
    /* ignore */
  }
}

export function readReferralBinaryLeg() {
  try {
    const raw = localStorage.getItem(REFERRAL_BINARY_LEG_STORAGE_KEY);
    return normalizeBinaryLegParam(raw) || "";
  } catch {
    return "";
  }
}
