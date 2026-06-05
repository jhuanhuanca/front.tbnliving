/** Métodos en los que el socio puede adjuntar comprobante (opcional u obligatorio). */
export const PAYMENT_METHODS_WITH_RECEIPT = [
  "transferencia",
  "qr",
  "otro",
  "crypto_usdt",
  "tarjeta",
];

/** Comprobante obligatorio antes de crear el pedido. */
export const PAYMENT_METHODS_REQUIRING_RECEIPT = ["transferencia", "qr"];

export const RECEIPT_REQUIRED_MESSAGE =
  "Debes adjuntar el comprobante de pago (captura o PDF) para transferencia o QR.";

export function paymentMethodAcceptsReceipt(method) {
  return PAYMENT_METHODS_WITH_RECEIPT.includes(String(method || "").toLowerCase());
}

export function paymentMethodRequiresReceipt(method) {
  return PAYMENT_METHODS_REQUIRING_RECEIPT.includes(String(method || "").toLowerCase());
}

export function hasValidPaymentReceipt(method, file) {
  if (!paymentMethodRequiresReceipt(method)) {
    return true;
  }

  return file instanceof File && file.size > 0;
}
