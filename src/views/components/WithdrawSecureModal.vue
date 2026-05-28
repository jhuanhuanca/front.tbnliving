<template>
  <div
    v-if="show"
    class="modal fade show d-block"
    tabindex="-1"
    role="dialog"
    style="background: rgba(15, 23, 42, 0.45)"
    @click.self="emit('close')"
  >
    <div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content border-0 shadow-lg" style="border-radius: 1rem">
        <div class="modal-header border-0 pb-0">
          <h5 class="modal-title text-dark font-weight-bolder">
            {{ step === "otp" ? "Confirmar con código" : step === "done" ? "Retiro registrado" : "Solicitar retiro" }}
          </h5>
          <button type="button" class="btn-close" aria-label="Cerrar" @click="emit('close')" />
        </div>

        <div class="modal-body pt-2">
          <div v-if="error" class="alert alert-warning text-white text-sm py-2 mb-3">{{ error }}</div>

          <template v-if="step === 'form'">
            <p class="text-sm text-muted">
              Saldo disponible: <strong>{{ formatCurrency(availableBalance) }}</strong>
            </p>
            <div class="mb-3">
              <label class="form-label text-sm">Monto (BOB)</label>
              <input
                v-model="amount"
                type="text"
                inputmode="decimal"
                class="form-control"
                placeholder="0.00"
                :disabled="loading"
              />
              <p v-if="config" class="text-xs text-muted mb-0 mt-1">
                Mín. {{ config.min_amount }} · Máx. {{ config.max_amount }}
              </p>
            </div>
            <div class="mb-3">
              <label class="form-label text-sm">Contraseña actual</label>
              <input
                v-model="password"
                type="password"
                class="form-control"
                autocomplete="current-password"
                :disabled="loading"
              />
            </div>
            <div class="mb-3">
              <label class="form-label text-sm">Notas (opcional)</label>
              <textarea v-model="notes" class="form-control" rows="2" :disabled="loading" />
            </div>
            <p class="text-xs text-muted mb-0">
              Enviaremos un código de 6 dígitos a tu correo (válido {{ config?.otp_ttl_minutes || 5 }} min).
            </p>
          </template>

          <template v-else-if="step === 'otp'">
            <p class="text-sm text-muted">
              Código enviado a <strong>{{ maskedEmail || "tu correo" }}</strong>
              · Monto: <strong>{{ formatCurrency(amount) }}</strong>
              <span v-if="Number(feePreview) > 0"> · Neto: {{ formatCurrency(netPreview) }} </span>
            </p>
            <div class="mb-3">
              <label class="form-label text-sm">Código OTP (6 dígitos)</label>
              <input
                v-model="otp"
                type="text"
                maxlength="6"
                inputmode="numeric"
                class="form-control text-center fw-bold"
                style="letter-spacing: 0.35em; font-size: 1.25rem"
                :disabled="loading"
                @keyup.enter="emit('verify')"
              />
            </div>
            <p class="text-xs text-muted mb-2">
              Expira en <strong>{{ otpMmSs }}</strong> · Máx. {{ maxAttempts }} intentos
            </p>
            <button
              type="button"
              class="btn btn-link btn-sm p-0 text-primary"
              :disabled="resendDisabled"
              @click="emit('resend')"
            >
              {{ resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : "Reenviar código" }}
            </button>
          </template>

          <template v-else>
            <p class="text-sm text-success mb-0">
              Tu solicitud quedó <strong>pendiente</strong>. Recibirás un correo cuando sea aprobada o rechazada.
            </p>
          </template>
        </div>

        <div class="modal-footer border-0 pt-0">
          <button type="button" class="btn btn-outline-secondary btn-sm" @click="emit('close')">
            {{ step === "done" ? "Cerrar" : "Cancelar" }}
          </button>
          <button
            v-if="step === 'form'"
            type="button"
            class="btn btn-primary btn-sm"
            :disabled="loading || !amount || !password"
            @click="emit('request')"
          >
            {{ loading ? "Enviando…" : "Enviar código" }}
          </button>
          <button
            v-else-if="step === 'otp'"
            type="button"
            class="btn btn-success btn-sm"
            :disabled="loading || otp.length !== 6"
            @click="emit('verify')"
          >
            {{ loading ? "Confirmando…" : "Confirmar retiro" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show: { type: Boolean, default: false },
  step: { type: String, default: "form" },
  loading: { type: Boolean, default: false },
  error: { type: String, default: "" },
  config: { type: Object, default: null },
  availableBalance: { type: [Number, String], default: null },
  maskedEmail: { type: String, default: "" },
  otpMmSs: { type: String, default: "05:00" },
  resendCooldown: { type: Number, default: 0 },
  resendDisabled: { type: Boolean, default: false },
  maxAttempts: { type: Number, default: 3 },
  feePreview: { type: String, default: "0.00" },
  netPreview: { type: String, default: "0.00" },
});

const amount = defineModel("amount", { type: String, default: "" });
const password = defineModel("password", { type: String, default: "" });
const notes = defineModel("notes", { type: String, default: "" });
const otp = defineModel("otp", { type: String, default: "" });

const emit = defineEmits(["close", "request", "verify", "resend"]);

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2,
  }).format(Number(value));
}
</script>
