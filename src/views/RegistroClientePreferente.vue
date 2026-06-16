<script setup>
import { ref, computed, watch, onBeforeMount, onBeforeUnmount, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useStore } from "vuex";
import Navbar from "@/examples/PageLayout/Navbar.vue";
import ArgonInput from "@/components/ArgonInput.vue";
import ArgonButton from "@/components/ArgonButton.vue";
import { registerPreferredCustomer } from "@/services/auth";
import { fetchSponsorByCode } from "@/services/sponsor";
import { persistReferralSponsor, readReferralSponsor } from "@/utils/referralStorage";
import { parseHttpError } from "@/utils/apiErrors";
import {
  SPONSOR_REQUIRED_MESSAGE,
  SPONSOR_INVALID_MESSAGE,
  validateBirthDateAge,
  computeBirthDateMax,
} from "@/utils/registerValidation";

const router = useRouter();
const route = useRoute();
const store = useStore();

const name = ref("");
const documentId = ref("");
const sponsorCode = ref("");
const birthDate = ref("");
const email = ref("");
const password = ref("");
const passwordConfirmation = ref("");
const loading = ref(false);
const error = ref("");
const sponsorValidated = ref(null);
const sponsorCheckLoading = ref(false);
const sponsorError = ref("");
const birthDateError = ref("");

const birthDateMax = computed(() => computeBirthDateMax());

const body = document.getElementsByTagName("body")[0];

function validateCiNit(v) {
  const s = String(v || "").trim();
  if (!s) return "El CI / NIT es obligatorio.";
  if (s.length < 5 || s.length > 32) return "CI / NIT: entre 5 y 32 caracteres.";
  if (!/^[A-Za-z0-9.-]+$/.test(s)) return "CI / NIT: solo letras, números, punto y guion.";
  return "";
}

function validateEmailFormat(v) {
  const s = String(v || "").trim();
  if (!s) return "El correo es obligatorio.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "Introduce un correo electrónico válido.";
  return "";
}

function applySponsorFromRoute() {
  const q = route.query.sponsor || route.query.ref || route.query.codigo;
  if (q) {
    sponsorCode.value = String(q).trim();
    persistReferralSponsor(sponsorCode.value);
    return;
  }
  const stored = readReferralSponsor();
  if (stored) {
    sponsorCode.value = stored;
  }
}

async function validateSponsor() {
  const code = sponsorCode.value.trim();
  if (!code) {
    sponsorValidated.value = null;
    sponsorError.value = SPONSOR_REQUIRED_MESSAGE;
    return false;
  }
  sponsorCheckLoading.value = true;
  sponsorError.value = "";
  try {
    const data = await fetchSponsorByCode(code);
    sponsorValidated.value = data.sponsor;
    return true;
  } catch {
    sponsorValidated.value = null;
    sponsorError.value = SPONSOR_INVALID_MESSAGE;
    return false;
  } finally {
    sponsorCheckLoading.value = false;
  }
}

onBeforeMount(() => {
  store.state.hideConfigButton = true;
  store.state.showNavbar = false;
  store.state.showSidenav = false;
  store.state.showFooter = false;
  body.classList.remove("bg-gray-100");
  applySponsorFromRoute();
});

onMounted(() => {
  if (sponsorCode.value) {
    validateSponsor();
  }
});

onBeforeUnmount(() => {
  store.state.hideConfigButton = false;
  store.state.showNavbar = true;
  store.state.showSidenav = true;
  store.state.showFooter = true;
  body.classList.add("bg-gray-100");
});

watch(
  () => sponsorCode.value,
  (next) => {
    const code = String(next || "").trim();
    if (!code) {
      sponsorValidated.value = null;
      return;
    }
    if (sponsorError.value === SPONSOR_REQUIRED_MESSAGE) {
      sponsorError.value = "";
    }
  }
);

watch(
  () => birthDate.value,
  () => {
    if (birthDateError.value) {
      birthDateError.value = validateBirthDateAge(birthDate.value);
    }
  }
);

watch(
  () => [route.query.sponsor, route.query.ref, route.query.codigo],
  () => {
    applySponsorFromRoute();
    if (sponsorCode.value) {
      validateSponsor();
    }
  }
);

async function submit() {
  error.value = "";
  sponsorError.value = "";
  birthDateError.value = "";

  if (!name.value.trim()) {
    error.value = "El nombre es obligatorio.";
    return;
  }
  if (!sponsorCode.value.trim()) {
    sponsorError.value = SPONSOR_REQUIRED_MESSAGE;
    error.value = SPONSOR_REQUIRED_MESSAGE;
    return;
  }
  const birthErr = validateBirthDateAge(birthDate.value);
  if (birthErr) {
    birthDateError.value = birthErr;
    error.value = birthErr;
    return;
  }
  const docErr = validateCiNit(documentId.value);
  const emErr = validateEmailFormat(email.value);
  if (docErr) {
    error.value = docErr;
    return;
  }
  if (emErr) {
    error.value = emErr;
    return;
  }
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
    const sponsorOk = await validateSponsor();
    if (!sponsorOk || !sponsorValidated.value) {
      error.value = sponsorError.value || "Código de patrocinador inválido.";
      return;
    }

    await registerPreferredCustomer({
      name: name.value.trim(),
      document_id: documentId.value.trim(),
      sponsor_referral_code: sponsorCode.value.trim(),
      birth_date: birthDate.value.trim(),
      email: email.value.trim(),
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    });
    router.push({
      path: "/signin",
      query: { registered: "preferente", email: email.value.trim().toLowerCase() },
    });
  } catch (e) {
    const parsed = parseHttpError(e, "el registro de cliente preferente");
    error.value = parsed.fieldErrors.length
      ? parsed.fieldErrors.join(" ")
      : parsed.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth-shell min-vh-100 d-flex flex-column">
    <div class="container top-0 position-sticky z-index-sticky px-2 px-sm-3">
      <navbar
        isBlur="blur border-radius-lg my-3 py-2 start-0 end-0 mx-3 mx-sm-4 shadow"
        :darkMode="true"
        isBtn="bg-gradient-success"
      />
    </div>

    <main class="auth-shell__main flex-grow-1 d-flex align-items-center py-4 py-lg-5">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-12 col-sm-11 col-md-9 col-lg-6 col-xl-5">
            <div class="card border-0 shadow-lg auth-card">
              <div class="card-header text-center bg-white border-0 pt-4 pb-0 px-4">
                <h4 class="font-weight-bolder text-dark mb-1">Cliente preferente</h4>
                <p class="text-sm text-secondary mb-0">
                  Compras al precio de cliente. Necesitas el código de un patrocinador activo para registrarte.
                </p>
              </div>
              <div class="card-body px-4 pt-3 pb-4">
                <div
                  v-if="!sponsorCode.trim()"
                  class="alert alert-warning text-dark text-sm py-2 mb-3"
                  role="alert"
                >
                  {{ SPONSOR_REQUIRED_MESSAGE }}
                </div>

                <div
                  v-else
                  class="alert text-sm py-2 mb-3"
                  :class="
                    sponsorValidated
                      ? 'alert-success text-white'
                      : sponsorError
                        ? 'alert-danger text-white'
                        : 'alert-info text-white'
                  "
                  role="alert"
                >
                  <template v-if="sponsorCheckLoading">Verificando patrocinador…</template>
                  <template v-else-if="sponsorValidated">
                    Patrocinador:
                    <strong>{{ sponsorValidated.name }}</strong>
                    (código {{ sponsorValidated.referral_code }})
                  </template>
                  <template v-else-if="sponsorError">{{ sponsorError }}</template>
                  <template v-else>Valida el código de tu patrocinador antes de registrarte.</template>
                </div>

                <div v-if="error" class="alert alert-danger text-white text-sm py-2 mb-3">{{ error }}</div>
                <form role="form" class="auth-form" @submit.prevent="submit">
                  <div class="mb-3">
                    <label class="form-label text-sm mb-1">Código de patrocinador <span class="text-danger">*</span></label>
                    <argon-input
                      id="rcp-sponsor"
                      v-model="sponsorCode"
                      type="text"
                      placeholder="Código de tu patrocinador"
                      name="sponsor"
                      size="lg"
                      :error="!!sponsorError"
                    />
                    <p v-if="sponsorError" class="text-danger text-xxs mb-0 mt-1">{{ sponsorError }}</p>
                    <p v-else class="text-xxs text-secondary mb-0 mt-1">
                      Solicita tu código a un socio activo. Sin patrocinador no es posible completar la inscripción.
                    </p>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-success mt-2"
                      :disabled="sponsorCheckLoading || !sponsorCode.trim()"
                      @click="validateSponsor"
                    >
                      Validar código
                    </button>
                  </div>
                  <div class="mb-3">
                    <label class="form-label text-sm mb-1">Nombre completo <span class="text-danger">*</span></label>
                    <argon-input
                      id="rcp-name"
                      v-model="name"
                      type="text"
                      placeholder="Nombre y apellidos"
                      name="name"
                      size="lg"
                    />
                  </div>
                  <div class="mb-3">
                    <label class="form-label text-sm mb-1">CI / NIT <span class="text-danger">*</span></label>
                    <argon-input
                      id="rcp-doc"
                      v-model="documentId"
                      type="text"
                      placeholder="Ej. 1234567 LP o NIT"
                      name="document_id"
                      autocomplete="off"
                      autocapitalize="off"
                      spellcheck="false"
                      size="lg"
                    />
                    <p class="text-xxs text-secondary mb-0 mt-1">5–32 caracteres: letras, números, punto o guion.</p>
                  </div>
                  <div class="mb-3">
                    <label class="form-label text-sm mb-1"
                      >Fecha de nacimiento <span class="text-danger">*</span></label
                    >
                    <input
                      v-model="birthDate"
                      id="rcp-birth"
                      type="date"
                      class="form-control form-control-lg"
                      :class="{ 'is-invalid': birthDateError }"
                      :max="birthDateMax"
                      required
                      @blur="birthDateError = validateBirthDateAge(birthDate)"
                    />
                    <p v-if="birthDateError" class="text-danger text-xxs mb-0 mt-1">{{ birthDateError }}</p>
                    <p v-else class="text-xxs text-secondary mb-0 mt-1">Debes ser mayor o igual de 18 años.</p>
                  </div>
                  <div class="mb-3">
                    <label class="form-label text-sm mb-1">Correo electrónico <span class="text-danger">*</span></label>
                    <argon-input
                      id="rcp-email"
                      v-model="email"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      name="email"
                      autocomplete="email"
                      size="lg"
                    />
                  </div>
                  <div class="mb-3">
                    <label class="form-label text-sm mb-1">Contraseña <span class="text-danger">*</span></label>
                    <argon-input
                      id="rcp-pass"
                      v-model="password"
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      name="password"
                      size="lg"
                    />
                  </div>
                  <div class="mb-4">
                    <label class="form-label text-sm mb-1">Confirmar contraseña <span class="text-danger">*</span></label>
                    <argon-input
                      id="rcp-pass2"
                      v-model="passwordConfirmation"
                      type="password"
                      placeholder="Repite la contraseña"
                      name="password_confirmation"
                      size="lg"
                    />
                  </div>
                  <argon-button
                    class="w-100"
                    variant="gradient"
                    color="success"
                    fullWidth
                    size="lg"
                    :disabled="loading"
                  >
                    {{ loading ? "Enviando…" : "Registrarme" }}
                  </argon-button>
                </form>
                <p class="text-sm mt-4 mb-0 text-center text-secondary">
                  ¿Eres socio MLM?
                  <router-link to="/signup" class="text-success font-weight-bold">Registro socio</router-link>
                  <span class="mx-1">·</span>
                  <router-link to="/signin" class="text-dark font-weight-bold">Iniciar sesión</router-link>
                </p>
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
.auth-shell__main {
  min-height: 0;
}
.auth-card {
  border-radius: 0.75rem;
}
.auth-form :deep(.input-group) {
  margin-bottom: 0;
}
.text-xxs {
  font-size: 0.65rem;
}
</style>
