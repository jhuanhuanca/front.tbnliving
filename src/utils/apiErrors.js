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
  general: "Error",
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

/**
 * Normaliza errores Axios para la UI.
 * Solo trata como red/CORS cuando error.response es undefined.
 *
 * @returns {{ message: string, fieldErrors: string[], status: number|null }}
 */
export function parseHttpError(error, contextLabel = "la operación") {
  if (!error?.response) {
    if (error?.code === "ECONNABORTED") {
      return {
        message: "La solicitud tardó demasiado. Intenta de nuevo.",
        fieldErrors: [],
        status: null,
      };
    }
    return {
      message:
        "Error de red o CORS: no se recibió respuesta del servidor. Verifica tu conexión e intenta de nuevo.",
      fieldErrors: [],
      status: null,
    };
  }

  const status = error.response.status;
  const data = error.response.data;

  if (status === 422) {
    const fieldErrors = allApiErrorMessages(data);
    return {
      message:
        fieldErrors[0] ||
        data?.message ||
        "Revisa los datos del formulario e intenta de nuevo.",
      fieldErrors,
      status: 422,
    };
  }

  if (status === 401) {
    return {
      message: data?.message || "No autorizado. Verifica tus credenciales.",
      fieldErrors: [],
      status: 401,
    };
  }

  if (status === 419) {
    return {
      message:
        data?.message ||
        "La sesión de seguridad expiró. Recarga la página e intenta registrarte de nuevo.",
      fieldErrors: [],
      status: 419,
    };
  }

  if (status >= 500) {
    return {
      message:
        data?.message ||
        "Error interno del servidor. Intenta más tarde o contacta a soporte.",
      fieldErrors: allApiErrorMessages(data),
      status,
    };
  }

  const fieldErrors = allApiErrorMessages(data);
  return {
    message:
      fieldErrors[0] ||
      data?.message ||
      `No se pudo completar ${contextLabel}.`,
    fieldErrors,
    status,
  };
}
