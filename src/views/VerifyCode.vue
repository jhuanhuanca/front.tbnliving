<script setup>
import { computed, onBeforeMount, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import Navbar from "@/examples/PageLayout/Navbar.vue";
import ArgonButton from "@/components/ArgonButton.vue";
import OtpInput from "@/components/OtpInput.vue";
import { forgotPasswordSendCode, forgotPasswordVerifyCode } from "@/services/auth";
import {
  getRecoveryEmail,
  setRecoveryCode,
  setRecoveryEmail,
  setRecoveryVerified,
} from "@/utils/passwordRecovery";

const body = document.getElementsByTagName("body")[0];
const store = useStore();
const route = useRoute();
const router = useRouter();

const email = ref("");
const code = ref("");
const loading = ref(false);
const resending = ref(false);
const error = ref("");
const otpInvalid = ref(false);
const resendSeconds = ref(0);
const otpRef = ref(null);

let resendTimer = null;

const canResend = computed(() => resendSeconds.value <= 0 && !resending.value);

onBeforeMount(() => {
  store.state.hideConfigButton = true;
  store.state.showNavbar = false;
  store.state.showSidenav = false;
  store.state.showFooter = false;
  body.classList.remove("bg-gray-100");

  email.value = String(route.query.email || getRecoveryEmail() || "").trim().toLowerCase();
  if (!email.value) {
    router.replace("/recuperar");
  }
});

onMounted(() => {
  startResendCountdown(60);
  otpRef.value?.focusFirst();
});

onBeforeUnmount(() => {
  store.state.hideConfigButton = false;
  store.state.showNavbar = true;
  store.state.showSidenav = true;
  store.state.showFooter = true;
  body.classList.add("bg-gray-100");
  if (resendTimer) clearInterval(resendTimer);
});

function startResendCountdown(seconds) {
  resendSeconds.value = seconds;
  if (resendTimer) clearInterval(resendTimer);
  resendTimer = setInterval(() => {
    resendSeconds.value -= 1;
    if (resendSeconds.value <= 0) {
      clearInterval(resendTimer);
      resendTimer = null;
    }
  }, 1000);
}

async function verify() {
  error.value = "";
  otpInvalid.value = false;
  if (code.value.length !== 6) {
    error.value = "Ingresa los 6 dígitos del código.";
    otpInvalid.value = true;
    return;
  }
  loading.value = true;
  try {
    const data = await forgotPasswordVerifyCode({ email: email.value, code: code.value });
    if (!data?.success) {
      throw new Error(data?.message || "Código inválido");
    }
    setRecoveryEmail(email.value);
    setRecoveryCode(code.value);
    setRecoveryVerified(true);
    router.push({ path: "/recuperar/nueva-contrasena", query: { email: email.value } });
  } catch (e) {
    otpInvalid.value = true;
    error.value = e.response?.data?.message || e.message || "Código inválido o expirado.";
  } finally {
    loading.value = false;
  }
}

async function resend() {
  if (!canResend.value) return;
  resending.value = true;
  error.value = "";
  try {
    await forgotPasswordSendCode(email.value);
    startResendCountdown(60);
  } catch (e) {
    error.value = e.response?.data?.message || "No se pudo reenviar el código.";
  } finally {
    resending.value = false;
  }
}
</script>

<template>
  <div class="auth-shell min-vh-100 d-flex flex-column">
    <div class="container top-0 position-sticky z-index-sticky px-2 px-sm-3">
      <navbar isBlur="blur border-radius-lg my-3 py-2 start-0 end-0 mx-3 mx-sm-4 shadow" :darkMode="true" isBtn="bg-gradient-success" />
    </div>

    <main class="auth-shell__main flex-grow-1 d-flex align-items-center py-4 py-lg-5">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-12 col-sm-11 col-md-9 col-lg-5 col-xl-4">
            <div class="card border-0 shadow-lg auth-card">
              <div class="card-header text-center bg-white border-0 pt-4 pb-0 px-4">
                <h4 class="font-weight-bolder text-dark mb-1">Verifica el código</h4>
                <p class="text-xs text-muted mb-0 px-2">
                  Código enviado a <strong>{{ email }}</strong>
                </p>
              </div>
              <div class="card-body px-4 pb-4 pt-3">
                <form @submit.prevent="verify">
                  <OtpInput ref="otpRef" v-model="code" :invalid="otpInvalid" />
                  <p class="text-center text-xxs text-muted mt-3 mb-0">El código expira en 10 minutos.</p>

                  <div v-if="error" class="alert alert-danger text-white text-sm py-2 mt-3 mb-0">{{ error }}</div>

                  <div class="d-grid gap-2 mt-4">
                    <argon-button variant="gradient" color="success" fullWidth size="lg" type="submit" :disabled="loading">
                      {{ loading ? "Verificando…" : "Continuar" }}
                    </argon-button>
                  </div>

                  <p class="text-center text-sm mt-3 mb-0">
                    <button
                      type="button"
                      class="btn btn-link text-success font-weight-bold p-0"
                      :disabled="!canResend"
                      @click="resend"
                    >
                      {{
                        resending
                          ? "Reenviando…"
                          : canResend
                            ? "Reenviar código"
                            : `Reenviar en ${resendSeconds}s`
                      }}
                    </button>
                  </p>
                </form>
              </div>
              <div class="card-footer text-center bg-transparent border-0 px-4 pb-4 pt-0">
                <router-link to="/recuperar" class="text-sm text-muted me-2">Cambiar correo</router-link>
                ·
                <router-link to="/signin" class="text-sm text-success font-weight-bold ms-2">Iniciar sesión</router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.auth-shell {
  background: linear-gradient(180deg, #f8f9fa 0%, #eef2f0 45%, #e8f5e9 100%);
}
.auth-card {
  border-radius: 1rem;
}
.text-xxs {
  font-size: 0.72rem;
}
</style>
