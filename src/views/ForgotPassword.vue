<script setup>
import { onBeforeMount, onBeforeUnmount, ref } from "vue";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import Navbar from "@/examples/PageLayout/Navbar.vue";
import ArgonInput from "@/components/ArgonInput.vue";
import ArgonButton from "@/components/ArgonButton.vue";
import { forgotPasswordSendCode } from "@/services/auth";
import { clearPasswordRecovery, setRecoveryEmail } from "@/utils/passwordRecovery";

const body = document.getElementsByTagName("body")[0];
const store = useStore();
const router = useRouter();

const email = ref("");
const loading = ref(false);
const error = ref("");
const success = ref("");

onBeforeMount(() => {
  store.state.hideConfigButton = true;
  store.state.showNavbar = false;
  store.state.showSidenav = false;
  store.state.showFooter = false;
  body.classList.remove("bg-gray-100");
  clearPasswordRecovery();
});

onBeforeUnmount(() => {
  store.state.hideConfigButton = false;
  store.state.showNavbar = true;
  store.state.showSidenav = true;
  store.state.showFooter = true;
  body.classList.add("bg-gray-100");
});

async function submit() {
  error.value = "";
  success.value = "";
  const value = email.value.trim().toLowerCase();
  if (!value || !value.includes("@")) {
    error.value = "Ingresa un correo electrónico válido.";
    return;
  }
  loading.value = true;
  try {
    const data = await forgotPasswordSendCode(value);
    setRecoveryEmail(value);
    success.value = data?.message || "Revisa tu correo para obtener el código.";
    setTimeout(() => {
      router.push({ path: "/recuperar/verificar", query: { email: value } });
    }, 1200);
  } catch (e) {
    if (e.response?.status === 429) {
      error.value = "Demasiados intentos. Espera unos minutos.";
    } else {
      error.value = e.response?.data?.message || "No se pudo enviar el código.";
    }
  } finally {
    loading.value = false;
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
                <h4 class="font-weight-bolder text-dark mb-1">¿Olvidaste tu contraseña?</h4>
                <p class="text-xs text-muted mb-0">Te enviaremos un código de 6 dígitos a tu correo.</p>
              </div>
              <div class="card-body px-4 pb-4 pt-3">
                <form @submit.prevent="submit">
                  <label class="form-label text-sm text-muted mb-1">Correo electrónico</label>
                  <argon-input
                    v-model="email"
                    id="recovery-email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    size="lg"
                    autocomplete="email"
                  />
                  <div v-if="error" class="alert alert-danger text-white text-sm py-2 mt-3 mb-0">{{ error }}</div>
                  <div v-if="success" class="alert alert-success text-white text-sm py-2 mt-3 mb-0">{{ success }}</div>
                  <div class="d-grid gap-2 mt-4">
                    <argon-button variant="gradient" color="success" fullWidth size="lg" type="submit" :disabled="loading">
                      {{ loading ? "Enviando…" : "Enviar código" }}
                    </argon-button>
                  </div>
                </form>
              </div>
              <div class="card-footer text-center bg-transparent border-0 px-4 pb-4 pt-0">
                <router-link to="/signin" class="text-sm text-success font-weight-bold">Volver a iniciar sesión</router-link>
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
</style>
