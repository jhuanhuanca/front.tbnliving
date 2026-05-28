import { REFERRAL_SPONSOR_STORAGE_KEY } from "@/constants/landingDefaults";

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
