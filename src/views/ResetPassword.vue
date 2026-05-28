<script setup>
import { computed, onBeforeMount, onBeforeUnmount, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import Navbar from "@/examples/PageLayout/Navbar.vue";
import ArgonInput from "@/components/ArgonInput.vue";
import ArgonButton from "@/components/ArgonButton.vue";
import { forgotPasswordReset } from "@/services/auth";
import {
  clearPasswordRecovery,
  getRecoveryCode,
  getRecoveryEmail,
  getPasswordStrength,
  isRecoveryVerified,
} from "@/utils/passwordRecovery";

const body = document.getElementsByTagName("body")[0];
const store = useStore();
const route = useRoute();
const router = useRouter();

const email = ref("");
const code = ref("");
const password = ref("");
const passwordConfirmation = ref("");
const loading = ref(false);
const error = ref("");
const success = ref("");

const strength = computed(() => getPasswordStrength(password.value));

onBeforeMount(() => {
  store.state.hideConfigButton = true;
  store.state.showNavbar = false;
  store.state.showSidenav = false;
  store.state.showFooter = false;
  body.classList.remove("bg-gray-100");

  email.value = String(route.query.email || getRecoveryEmail() || "").trim().toLowerCase();
  code.value = getRecoveryCode();

  if (!email.value || !code.value || !isRecoveryVerified()) {
    router.replace("/recuperar");
  }
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

  if (password.value.length < 8) {
    error.value = "La contraseña debe tener al menos 8 caracteres.";
    return;
  }
  if (password.value !== passwordConfirmation.value) {
    error.value = "Las contraseñas no coinciden.";
    return;
  }

  loading.value = true;
  try {
    const data = await forgotPasswordReset({
      email: email.value,
      code: code.value,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    });
    success.value = data?.message || "Contraseña actualizada.";
    clearPasswordRecovery();
    setTimeout(() => router.push("/signin"), 1500);
  } catch (e) {
    if (e.response?.status === 422) {
      error.value = e.response?.data?.message || "Datos inválidos.";
    } else {
      error.value = e.response?.data?.message || "No se pudo actualizar la contraseña.";
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
                <h4 class="font-weight-bolder text-dark mb-1">Nueva contraseña</h4>
                <p class="text-xs text-muted mb-0">Elige una contraseña segura para tu cuenta.</p>
              </div>
              <div class="card-body px-4 pb-4 pt-3">
                <form @submit.prevent="submit">
                  <div class="mb-3">
                    <label class="form-label text-sm text-muted mb-1">Nueva contraseña</label>
                    <argon-input
                      v-model="password"
                      id="new-password"
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      size="lg"
                      show-password-toggle
                      autocomplete="new-password"
                    />
                    <div v-if="password" class="mt-2">
                      <div class="progress" style="height: 6px">
                        <div
                          class="progress-bar"
                          :class="strength.class"
                          role="progressbar"
                          :style="{ width: `${strength.percent}%` }"
                        />
                      </div>
                      <p class="text-xxs text-muted mt-1 mb-0">Fortaleza: {{ strength.label }}</p>
                    </div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label text-sm text-muted mb-1">Confirmar contraseña</label>
                    <argon-input
                      v-model="passwordConfirmation"
                      id="confirm-password"
                      type="password"
                      placeholder="Repite la contraseña"
                      size="lg"
                      show-password-toggle
                      autocomplete="new-password"
                    />
                  </div>

                  <div v-if="error" class="alert alert-danger text-white text-sm py-2 mt-2 mb-0">{{ error }}</div>
                  <div v-if="success" class="alert alert-success text-white text-sm py-2 mt-2 mb-0">{{ success }}</div>

                  <div class="d-grid gap-2 mt-4">
                    <argon-button variant="gradient" color="success" fullWidth size="lg" type="submit" :disabled="loading">
                      {{ loading ? "Guardando…" : "Guardar contraseña" }}
                    </argon-button>
                  </div>
                </form>
              </div>
              <div class="card-footer text-center bg-transparent border-0 px-4 pb-4 pt-0">
                <router-link to="/signin" class="text-sm text-success font-weight-bold">Ir a iniciar sesión</router-link>
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
