import api from "./api";

export function fetchWithdrawConfig() {
  return api.get("/wallet/withdraw/config").then((r) => r.data);
}

export function requestWithdrawOtp(payload) {
  return api.post("/wallet/withdraw/request", payload).then((r) => r.data);
}

export function verifyWithdrawOtp(otp) {
  return api.post("/wallet/withdraw/verify-otp", { otp }).then((r) => r.data);
}

export function resendWithdrawOtp() {
  return api.post("/wallet/withdraw/resend-otp").then((r) => r.data);
}

export function fetchWithdrawHistory(params = {}) {
  return api.get("/wallet/withdraw/history", { params }).then((r) => r.data);
}
