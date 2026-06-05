import router from "@/router";

/** Normaliza query de pierna binaria (izq/der/auto). */
export function normalizeBinaryLegParam(raw) {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!v) return "auto";
  if (["left", "izquierda", "izq", "i", "l"].includes(v)) return "left";
  if (["right", "derecha", "der", "d", "r"].includes(v)) return "right";
  if (["auto", "automatico", "automático"].includes(v)) return "auto";
  return null;
}

export const BINARY_LEG_OPTIONS = [
  { value: "auto", label: "Automático (pierna vacía del patrocinador)" },
  { value: "left", label: "Izquierda" },
  { value: "right", label: "Derecha" },
];

export function binaryLegLabel(leg) {
  const opt = BINARY_LEG_OPTIONS.find((o) => o.value === leg);
  return opt?.label || leg;
}

/**
 * Enlace corto /i/CODIGO con pierna opcional en query (?leg=left|right).
 */
export function buildReferralInviteUrl(code, leg = "auto") {
  const normalized = normalizeBinaryLegParam(leg) || "auto";
  const sponsor = String(code || "").trim();
  if (!sponsor) return "";

  const query = normalized !== "auto" ? { leg: normalized } : {};
  const href = router.resolve({ path: `/i/${encodeURIComponent(sponsor)}`, query }).href;
  if (typeof window !== "undefined" && !href.startsWith("http")) {
    return `${window.location.origin}${href}`;
  }
  return href;
}
