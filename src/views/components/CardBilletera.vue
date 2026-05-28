<template>
  <div class="container-fluid py-4">
    <div v-if="walletError" class="alert alert-warning text-white mb-3" role="alert">
      {{ walletError }}
    </div>

    <div class="row mb-4">
      <div class="col-12 d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <h4 class="mb-1 text-dark font-weight-bolder">Billetera</h4>
          <p class="mb-0 text-sm text-secondary">
            Saldo calculado desde el libro de movimientos (créditos, débitos, retenciones).
          </p>
        </div>
        <div class="d-flex flex-wrap gap-2">
          <button
            type="button"
            class="btn btn-sm btn-outline-primary shadow-sm"
            :disabled="walletLoading"
            @click="cargarTodo"
          >
            <i class="ni ni-refresh me-2"></i>
            {{ walletLoading ? "Cargando…" : "Actualizar" }}
          </button>
          <button type="button" class="btn btn-sm btn-primary shadow-sm" @click="abrirRetiro">
            <i class="ni ni-money-coins me-2"></i>
            Solicitar retiro
          </button>
        </div>
      </div>
    </div>

    <div class="row mb-4">
      <div class="col-12">
        <div class="card shadow-sm border-0">
          <div class="card-body">
            <div class="d-flex flex-wrap justify-content-between align-items-start gap-3">
              <div>
                <div class="text-uppercase text-muted text-xs font-weight-bold mb-1">Token de pago (10 minutos)</div>
                <p class="text-sm text-muted mb-0">
                  Genera un token para que otro socio pueda pagar con tu billetera (un solo uso).
                </p>
              </div>
              <button
                type="button"
                class="btn btn-sm btn-outline-success shadow-sm"
                :disabled="tokenLoading"
                @click="generarToken"
              >
                <i class="ni ni-key-25 me-2"></i>
                {{ tokenLoading ? "Generando…" : "Generar token" }}
              </button>
            </div>

            <div v-if="tokenError" class="text-danger text-sm mt-3">{{ tokenError }}</div>

            <div v-if="paymentToken" class="mt-3">
              <div class="d-flex flex-wrap align-items-center gap-2">
                <code class="px-3 py-2 rounded bg-light border fw-bold">{{ paymentToken }}</code>
                <button type="button" class="btn btn-sm btn-outline-primary" @click="copiarToken">
                  Copiar
                </button>
              </div>
              <p class="text-xs text-muted mb-0 mt-2">
                Expira en: <strong>{{ tokenExpiresIn }}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row mb-4">
      <div class="col-xl-4 col-sm-6 mb-4">
        <div class="card shadow-sm border-0">
          <div class="card-body">
            <div class="text-uppercase text-muted text-xs font-weight-bold mb-1">Saldo disponible</div>
            <div class="h4 mb-0 font-weight-bold text-dark">
              {{ formatCurrency(saldoDisponible) }}
            </div>
            <p class="mb-0 mt-2 text-xs text-muted">
              Moneda BOB · Retiro seguro con contraseña y código por email.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-12">
        <div class="card shadow-sm border-0">
          <div class="card-header border-0 pb-0">
            <h6 class="text-dark mb-1">Movimientos recientes</h6>
            <p class="text-xs text-muted mb-0">Últimos 100 registros del ledger.</p>
          </div>
          <div class="card-body pt-3">
            <div class="table-responsive">
              <table class="table align-items-center mb-0">
                <thead>
                  <tr>
                    <th class="text-xs text-uppercase text-muted font-weight-bold">Tipo</th>
                    <th class="text-xs text-uppercase text-muted font-weight-bold">Referencia</th>
                    <th class="text-xs text-uppercase text-muted font-weight-bold">Fecha</th>
                    <th class="text-xs text-uppercase text-muted font-weight-bold text-end">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="m in movimientos" :key="m.id">
                    <td class="text-sm">{{ etiquetaTipo(m.type) }}</td>
                    <td class="text-xs text-muted">{{ m.description || m.reference || "—" }}</td>
                    <td class="text-xs text-muted">{{ formatFecha(m.created_at) }}</td>
                    <td class="text-sm text-end fw-semibold" :class="montoClass(m.type)">
                      {{ formatMonto(m.type, m.amount) }}
                    </td>
                  </tr>
                  <tr v-if="!walletLoading && movimientos.length === 0">
                    <td colspan="4" class="text-center text-muted py-4 text-sm">
                      No hay movimientos.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <WithdrawSecureModal
      :show="showWithdrawModal"
      :step="step"
      :loading="loading"
      :error="error"
      :config="config"
      :available-balance="saldoDisponible"
      v-model:amount="amount"
      v-model:password="password"
      v-model:notes="notes"
      v-model:otp="otp"
      :masked-email="maskedEmail"
      :otp-mm-ss="otpMmSs"
      :resend-cooldown="resendCooldown"
      :resend-disabled="resendDisabled"
      :max-attempts="maxAttempts"
      :fee-preview="feePreview"
      :net-preview="netPreview"
      @close="cerrarRetiro"
      @request="onWithdrawRequest"
      @verify="onWithdrawVerify"
      @resend="submitResend"
    />
  </div>
</template>

<script>
import { fetchWalletBalance, createWalletPaymentToken } from "@/services/wallet";
import { fetchWalletTransactions } from "@/services/me";
import { useSecureWithdrawal } from "@/composables/useSecureWithdrawal";
import WithdrawSecureModal from "@/views/components/WithdrawSecureModal.vue";

export default {
  name: "CardBilletera",
  components: { WithdrawSecureModal },
  setup() {
    return useSecureWithdrawal();
  },
  data() {
    return {
      walletLoading: false,
      walletError: null,
      saldoDisponible: null,
      movimientos: [],
      tokenLoading: false,
      tokenError: null,
      paymentToken: "",
      tokenExpiresAt: null,
      tokenTimer: null,
      showWithdrawModal: false,
    };
  },
  mounted() {
    this.cargarTodo();
    this.loadConfig();
  },
  beforeUnmount() {
    if (this.tokenTimer) {
      clearInterval(this.tokenTimer);
      this.tokenTimer = null;
    }
  },
  computed: {
    tokenExpiresIn() {
      if (!this.tokenExpiresAt) return "—";
      const t = new Date(this.tokenExpiresAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((t - now) / 1000));
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    },
  },
  methods: {
    async cargarTodo() {
      if (!localStorage.getItem("token")) {
        this.walletError = "Inicia sesión para ver tu billetera.";
        return;
      }
      this.walletLoading = true;
      this.walletError = null;
      try {
        const [bal, tx] = await Promise.all([fetchWalletBalance(), fetchWalletTransactions()]);
        this.saldoDisponible = Number(bal.available);
        this.movimientos = tx.data || [];
      } catch (e) {
        this.walletError = e.response?.data?.message || "No se pudo cargar la billetera.";
        this.movimientos = [];
      } finally {
        this.walletLoading = false;
      }
    },
    abrirRetiro() {
      this.reset();
      this.showWithdrawModal = true;
    },
    cerrarRetiro() {
      this.showWithdrawModal = false;
      if (this.step === "done") {
        this.cargarTodo();
      }
      this.reset();
    },
    async onWithdrawRequest() {
      await this.submitRequest();
    },
    async onWithdrawVerify() {
      const res = await this.submitVerify();
      if (res?.success) {
        await this.cargarTodo();
      }
    },
    etiquetaTipo(t) {
      const x = {
        credit: "Crédito",
        debit: "Débito",
        retention: "Retención (retiro)",
        retention_release: "Liberación retención",
      };
      return x[t] || t;
    },
    formatFecha(iso) {
      if (!iso) return "—";
      try {
        return new Date(iso).toLocaleString("es-BO");
      } catch {
        return iso;
      }
    },
    formatCurrency(value) {
      if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
      return new Intl.NumberFormat("es-BO", {
        style: "currency",
        currency: "BOB",
        minimumFractionDigits: 2,
      }).format(Number(value));
    },
    formatMonto(type, amount) {
      const n = Math.abs(Number(amount));
      const isOut = type === "debit" || type === "retention";
      return (isOut ? "- " : "+ ") + this.formatCurrency(n);
    },
    montoClass(type) {
      if (type === "credit" || type === "retention_release") return "text-success";
      if (type === "debit" || type === "retention") return "text-danger";
      return "text-dark";
    },
    async generarToken() {
      this.tokenError = null;
      if (!localStorage.getItem("token")) {
        this.tokenError = "Inicia sesión para generar token.";
        return;
      }
      this.tokenLoading = true;
      try {
        const r = await createWalletPaymentToken();
        this.paymentToken = r.token || "";
        this.tokenExpiresAt = r.expires_at || null;
        if (this.tokenTimer) clearInterval(this.tokenTimer);
        this.tokenTimer = setInterval(() => {
          if (this.tokenExpiresIn === "00:00") {
            this.paymentToken = "";
            this.tokenExpiresAt = null;
            clearInterval(this.tokenTimer);
            this.tokenTimer = null;
          }
        }, 1000);
      } catch (e) {
        this.tokenError = e.response?.data?.message || "No se pudo generar el token.";
      } finally {
        this.tokenLoading = false;
      }
    },
    async copiarToken() {
      try {
        await navigator.clipboard.writeText(this.paymentToken);
        window.alert("Token copiado.");
      } catch {
        window.prompt("Copia el token:", this.paymentToken);
      }
    },
  },
};
</script>

<style scoped>
.card {
  border-radius: 1rem;
}
</style>
