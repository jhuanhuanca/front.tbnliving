import api from "./api";

/**
 * @returns {Promise<{ available: string }>}
 */
export function fetchWalletBalance() {
  return api.get("/wallet/balance").then((res) => res.data);
}

/**
 * Genera token de pago (10 minutos) para que otro socio pague con tu billetera.
 * @returns {Promise<{ token: string, expires_at: string, ttl_seconds: number }>}
 */
export function createWalletPaymentToken() {
  return api.post("/wallet/payment-token").then((res) => res.data);
}
