import { computed, onUnmounted, ref } from "vue";
import {
  fetchWithdrawConfig,
  requestWithdrawOtp,
  resendWithdrawOtp,
  verifyWithdrawOtp,
} from "@/services/withdraw";

export function useSecureWithdrawal() {
  const step = ref("form"); // form | otp | done
  const loading = ref(false);
  const error = ref("");
  const config = ref(null);

  const amount = ref("");
  const password = ref("");
  const notes = ref("");
  const otp = ref("");
  const maskedEmail = ref("");
  const expiresAt = ref(null);
  const expiresInSeconds = ref(0);
  const resendCooldown = ref(0);
  const maxAttempts = ref(3);
  const feePreview = ref("0.00");
  const netPreview = ref("0.00");

  let tickTimer = null;
  let resendTimer = null;

  const otpMmSs = computed(() => {
    const s = Math.max(0, expiresInSeconds.value);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  });

  const resendDisabled = computed(() => resendCooldown.value > 0 || loading.value);

  function clearTimers() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
    if (resendTimer) {
      clearInterval(resendTimer);
      resendTimer = null;
    }
  }

  function startExpiryCountdown(seconds) {
    expiresInSeconds.value = Math.max(0, Number(seconds) || 0);
    clearTimers();
    tickTimer = setInterval(() => {
      if (expiresInSeconds.value <= 0) {
        clearTimers();
        error.value = "El código expiró. Solicita uno nuevo.";
        return;
      }
      expiresInSeconds.value -= 1;
    }, 1000);
  }

  function startResendCooldown(seconds) {
    resendCooldown.value = Math.max(0, Number(seconds) || 60);
    if (resendTimer) clearInterval(resendTimer);
    resendTimer = setInterval(() => {
      if (resendCooldown.value <= 0) {
        clearInterval(resendTimer);
        resendTimer = null;
        return;
      }
      resendCooldown.value -= 1;
    }, 1000);
  }

  async function loadConfig() {
    try {
      config.value = await fetchWithdrawConfig();
    } catch (e) {
      const status = e.response?.status;
      config.value = {
        min_amount: "1.00",
        max_amount: "50000.00",
        currency: "BOB",
        otp_ttl_minutes: 5,
        otp_max_attempts: 3,
        resend_cooldown_seconds: 60,
      };
      if (status === 404) {
        error.value =
          "El servidor aún no tiene el módulo de retiros desplegado. Contacta soporte o espera a que actualicen el API.";
      }
    }
  }

  function reset() {
    step.value = "form";
    error.value = "";
    otp.value = "";
    maskedEmail.value = "";
    expiresAt.value = null;
    expiresInSeconds.value = 0;
    clearTimers();
  }

  async function submitRequest() {
    error.value = "";
    loading.value = true;
    try {
      const res = await requestWithdrawOtp({
        amount: String(amount.value).replace(",", ".").trim(),
        password: password.value,
        notes: notes.value || undefined,
      });
      maskedEmail.value = res.masked_email || "";
      feePreview.value = res.fee || "0.00";
      netPreview.value = res.net_amount || amount.value;
      maxAttempts.value = res.max_attempts || 3;
      expiresAt.value = res.expires_at;
      startExpiryCountdown(res.expires_in_seconds || (res.otp_ttl_minutes || 5) * 60);
      startResendCooldown(res.resend_cooldown_seconds || 60);
      step.value = "otp";
      password.value = "";
    } catch (e) {
      const data = e.response?.data;
      const status = e.response?.status;
      error.value =
        status === 404
          ? "El API de retiros no está disponible en el servidor (falta desplegar el backend)."
          : data?.message ||
            (data?.errors && Object.values(data.errors).flat().join(" ")) ||
            "No se pudo enviar el código.";
    } finally {
      loading.value = false;
    }
  }

  async function submitVerify() {
    error.value = "";
    loading.value = true;
    try {
      const res = await verifyWithdrawOtp(String(otp.value).trim());
      step.value = "done";
      clearTimers();
      return res;
    } catch (e) {
      const data = e.response?.data;
      error.value =
        data?.message ||
        (data?.errors?.otp && data.errors.otp[0]) ||
        "Código inválido.";
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function submitResend() {
    if (resendDisabled.value) return;
    error.value = "";
    loading.value = true;
    try {
      const res = await resendWithdrawOtp();
      maskedEmail.value = res.masked_email || maskedEmail.value;
      startResendCooldown(res.resend_cooldown_seconds || 60);
      if (res.expires_at) {
        const end = new Date(res.expires_at).getTime();
        startExpiryCountdown(Math.max(0, Math.floor((end - Date.now()) / 1000)));
      }
    } catch (e) {
      const data = e.response?.data;
      error.value = data?.message || "No se pudo reenviar el código.";
      if (e.response?.status === 429 && data?.errors?.cooldown) {
        const m = String(data.errors.cooldown[0]).match(/(\d+)/);
        if (m) startResendCooldown(Number(m[1]));
      }
    } finally {
      loading.value = false;
    }
  }

  onUnmounted(clearTimers);

  return {
    step,
    loading,
    error,
    config,
    amount,
    password,
    notes,
    otp,
    maskedEmail,
    expiresInSeconds,
    otpMmSs,
    resendCooldown,
    resendDisabled,
    maxAttempts,
    feePreview,
    netPreview,
    loadConfig,
    reset,
    submitRequest,
    submitVerify,
    submitResend,
  };
}
