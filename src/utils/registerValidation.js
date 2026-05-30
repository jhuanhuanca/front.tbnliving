export const SPONSOR_REQUIRED_MESSAGE =
  "Para inscribirte debes contactarte con un patrocinador y usar su código de referido.";

export const SPONSOR_INVALID_MESSAGE =
  "No se encontró un patrocinador con ese código. Verifica el código con tu patrocinador.";

export function validateBirthDateAge(v) {
  const s = String(v || "").trim();
  if (!s) return "La fecha de nacimiento es obligatoria.";
  const birth = new Date(`${s}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return "La fecha de nacimiento no es válida.";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (birth >= today) return "La fecha de nacimiento debe ser anterior a hoy.";
  const minAgeCutoff = new Date(today);
  minAgeCutoff.setFullYear(today.getFullYear() - 18);
  if (birth > minAgeCutoff) return "Debes ser mayor o igual de 18 años para inscribirte.";
  return "";
}

export function computeBirthDateMax() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
