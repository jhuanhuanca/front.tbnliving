const FIELD_LABELS = {
  name: "Nombre",
  email: "Correo",
  password: "Contraseña",
  password_confirmation: "Confirmar contraseña",
  document_id: "CI / NIT",
  phone: "Teléfono",
  birth_date: "Fecha de nacimiento",
  sponsor_referral_code: "Patrocinador",
  country_id: "País",
  country_code: "País",
  registration_package_id: "Paquete",
  preferred_binary_leg: "Colocación binaria",
};

/**
 * Extrae el primer mensaje de error de respuestas API (Laravel validation).
 */
export function firstApiErrorMessage(data, fallback = "Error en el servidor") {
  const list = allApiErrorMessages(data);
  if (list.length) return list[0];
  if (data?.message) return String(data.message);
  return fallback;
}

/**
 * Lista mensajes con etiqueta de campo para la UI.
 */
export function allApiErrorMessages(data) {
  const bag = data?.errors || data?.data?.errors;
  if (!bag || typeof bag !== "object") {
    return data?.message ? [String(data.message)] : [];
  }

  return Object.entries(bag)
    .flatMap(([field, msgs]) => {
      const label = FIELD_LABELS[field] || field;
      const list = Array.isArray(msgs) ? msgs : [msgs];
      return list.filter(Boolean).map((m) => `${label}: ${m}`);
    });
}
