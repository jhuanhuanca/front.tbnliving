<script setup>
import { ref, onBeforeUnmount, onBeforeMount, watch, onMounted, computed } from "vue";
import { useStore } from "vuex";
import { useRouter, useRoute } from "vue-router";
import Navbar from "@/examples/PageLayout/Navbar.vue";
import AppFooter from "@/examples/PageLayout/Footer.vue";
import ArgonInput from "@/components/ArgonInput.vue";
import ArgonButton from "@/components/ArgonButton.vue";
import { registerMember } from "@/services/auth";
import { allApiErrorMessages } from "@/utils/apiErrors";
import { buildMemberRegisterPayload } from "@/utils/registerPayload";
import { persistReferralSponsor, readReferralSponsor, persistReferralBinaryLeg, readReferralBinaryLeg } from "@/utils/referralStorage";
import { normalizeBinaryLegParam } from "@/utils/referralLink";
import { fetchSponsorByCode } from "@/services/sponsor";
import { fetchPackages } from "@/services/me";
import { LATAM_COUNTRIES } from "@/constants/latamCountries";
import { fetchCountriesCatalog } from "@/services/countries";
import termsPdfUrl from "@/assets/doc/pdfejemplo.pdf";
import { DISTRIBUTOR_TERMS } from "@/constants/distributorTerms";
import {
  SPONSOR_REQUIRED_MESSAGE,
  SPONSOR_INVALID_MESSAGE,
  validateBirthDateAge,
  computeBirthDateMax,
} from "@/utils/registerValidation";

const distributorTerms = DISTRIBUTOR_TERMS;
const body = document.getElementsByTagName("body")[0];
const store = useStore();
const router = useRouter();
const route = useRoute();

const name = ref("");
const email = ref("");
const password = ref("");
const passwordConfirmation = ref("");
/** CI / NIT — se envía al API como `document_id` (campo obligatorio ci_nit en negocio). */
const ciNit = ref("");
const phone = ref("");
const birthDate = ref("");
const sponsorReferralCode = ref("");
const preferredBinaryLeg = ref("auto");
const sponsorValidated = ref(null);
const sponsorCheckLoading = ref(false);
const sponsorError = ref("");
const birthDateError = ref("");
const countriesCatalog = ref([]);
const catalogError = ref("");
const showPassword = ref(false);
const showPasswordConfirm = ref(false);
const terms = ref(false);
const termsModalOpen = ref(false);
const error = ref("");
const fieldErrors = ref([]);
const loading = ref(false);
const packagesList = ref([]);
const selectedPackageId = ref("");
const countryId = ref("");
const countryCode = ref("BO"); // código ISO seleccionado (sincronizado con catálogo)

const DIAL_BY_COUNTRY = {
  AR: "+54",
  BO: "+591",
  BR: "+55",
  CL: "+56",
  CO: "+57",
  CR: "+506",
  CU: "+53",
  DO: "+1",
  EC: "+593",
  SV: "+503",
  GT: "+502",
  HN: "+504",
  MX: "+52",
  NI: "+505",
  PA: "+507",
  PY: "+595",
  PE: "+51",
  PR: "+1",
  UY: "+598",
  VE: "+58",
  ES: "+34",
};

/** Si el API no devolvió países, usamos la lista LATAM local (comportamiento anterior). */
const useLatamFallback = computed(() => countriesCatalog.value.length === 0);

const selectedCountryMeta = computed(() => {
  if (countriesCatalog.value.length && countryId.value) {
    return countriesCatalog.value.find((c) => String(c.id) === String(countryId.value)) ?? null;
  }
  if (useLatamFallback.value && countryCode.value) {
    const c = LATAM_COUNTRIES.find((x) => x.code === countryCode.value);
    return c ? { code: c.code, name: c.name, flag: c.flag } : null;
  }
  return null;
});

const phoneDial = computed(() => {
  const code = selectedCountryMeta.value?.code || countryCode.value;
  return DIAL_BY_COUNTRY[code] || "+";
});

const birthDateMax = computed(() => computeBirthDateMax());

function normalizePhoneWithDial(raw, dial) {
  const v = String(raw || "").trim();
  if (!v) return "";
  if (v.startsWith("+")) return v;
  // Si el usuario escribió solo números, anteponemos el prefijo del país.
  return `${dial}${v.replace(/\s+/g, "")}`;
}

function applyPackageFromQuery() {
  const pkg = route.query.package;
  if (pkg) {
    selectedPackageId.value = String(pkg);
    return;
  }
  const slug = route.query.slug;
  if (slug && packagesList.value.length) {
    const found = packagesList.value.find((p) => p.slug === String(slug));
    if (found) {
      selectedPackageId.value = String(found.id);
    }
  }
}

onBeforeMount(() => {
  store.state.hideConfigButton = true;
  store.state.showNavbar = false;
  store.state.showSidenav = false;
  store.state.showFooter = false;
  body.classList.remove("bg-gray-100");
});

onBeforeUnmount(() => {
  store.state.hideConfigButton = false;
  store.state.showNavbar = true;
  store.state.showSidenav = true;
  store.state.showFooter = true;
  body.classList.add("bg-gray-100");
});

function applySponsorFromRoute() {
  const q = route.query.sponsor || route.query.ref || route.query.codigo;
  if (q) {
    sponsorReferralCode.value = String(q).trim();
    persistReferralSponsor(sponsorReferralCode.value);
    return;
  }
  const stored = readReferralSponsor();
  if (stored) {
    sponsorReferralCode.value = stored;
  }
}

function applyBinaryLegFromRoute() {
  const raw =
    route.query.leg || route.query.pierna || route.query.binary_leg || route.query.preferred_binary_leg;
  if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
    const leg = normalizeBinaryLegParam(raw);
    if (leg) {
      preferredBinaryLeg.value = leg;
      persistReferralBinaryLeg(leg);
      return;
    }
  }
  const storedLeg = readReferralBinaryLeg();
  if (storedLeg) {
    preferredBinaryLeg.value = storedLeg;
  }
}

onMounted(async () => {
  let savedId = "";
  let savedCode = "";
  // Persistencia de país (si el usuario vuelve a abrir registro).
  try {
    savedId = localStorage.getItem("signup_country_id") || "";
    savedCode = localStorage.getItem("signup_country_code") || "";
    if (savedCode && LATAM_COUNTRIES.some((c) => c.code === savedCode)) {
      countryCode.value = savedCode;
    }
  } catch {
    /* ignore */
  }

  applySponsorFromRoute();
  applyBinaryLegFromRoute();
  if (sponsorReferralCode.value) {
    validateSponsor();
  }
  try {
    const res = await fetchPackages();
    packagesList.value = res.data || [];
  } catch {
    packagesList.value = [];
  }
  try {
    const list = await fetchCountriesCatalog();
    if (list.length) {
      countriesCatalog.value = list;
      catalogError.value = "";
      let chosenId = "";
      if (savedId && list.some((c) => String(c.id) === String(savedId))) {
        chosenId = String(savedId);
      } else if (savedCode || countryCode.value) {
        const codeToMatch = (savedCode || countryCode.value || "BO").toUpperCase();
        const found = list.find((c) => String(c.code).toUpperCase() === codeToMatch);
        chosenId = found ? String(found.id) : "";
      }
      countryId.value = chosenId || (list[0] ? String(list[0].id) : "");
      const meta = selectedCountryMeta.value;
      if (meta?.code) countryCode.value = String(meta.code).toUpperCase();
    } else {
      countriesCatalog.value = [];
      catalogError.value =
        "El servidor no tiene países cargados aún. Usando lista local (LATAM). Ejecuta migraciones y seed en el API para vincular country_id.";
    }
  } catch {
    countriesCatalog.value = [];
    catalogError.value =
      "No se pudo contactar /countries. Se usa la lista local de países (LATAM); el registro envía country_code.";
  }
  applyPackageFromQuery();
});

watch(
  () => countryCode.value,
  (next) => {
    try {
      localStorage.setItem("signup_country_code", String(next || ""));
    } catch {
      /* ignore */
    }
  }
);

watch(
  () => countryId.value,
  (next) => {
    try {
      localStorage.setItem("signup_country_id", String(next || ""));
    } catch {
      /* ignore */
    }
    const meta =
      countriesCatalog.value.find((c) => String(c.id) === String(next));
    if (meta?.code) {
      countryCode.value = String(meta.code).toUpperCase();
    }
  }
);

function syncCountryFromSelect() {
  const meta =
    countriesCatalog.value.find((c) => String(c.id) === String(countryId.value));
  if (meta?.code) countryCode.value = String(meta.code).toUpperCase();
}

watch(
  () => sponsorReferralCode.value,
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
    if (sponsorReferralCode.value) {
      validateSponsor();
    }
  }
);

watch(
  () => [
    route.query.leg,
    route.query.pierna,
    route.query.binary_leg,
    route.query.preferred_binary_leg,
  ],
  () => {
    applyBinaryLegFromRoute();
  }
);

watch(
  () => route.query.package,
  () => {
    applyPackageFromQuery();
  }
);

watch(
  () => route.query.slug,
  () => {
    applyPackageFromQuery();
  }
);

async function validateSponsor() {
  const code = sponsorReferralCode.value.trim();
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

function acceptTermsModal() {
  terms.value = true;
  termsModalOpen.value = false;
}

async function signup() {
  error.value = "";
  fieldErrors.value = [];
  sponsorError.value = "";
  birthDateError.value = "";

  const okApi = countriesCatalog.value.length > 0 && String(countryId.value || "").trim() !== "";
  const codeUpper = String(countryCode.value || "").trim().toUpperCase();
  const okLatam =
    useLatamFallback.value &&
    codeUpper &&
    LATAM_COUNTRIES.some((c) => c.code === codeUpper);
  if (!okApi && !okLatam) {
    error.value = "Selecciona tu país en la lista.";
    return;
  }
  if (!terms.value) {
    error.value = "Debe aceptar los términos y condiciones.";
    return;
  }
  if (!sponsorReferralCode.value.trim()) {
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
  const ciErr = validateCiNit(ciNit.value);
  if (ciErr) {
    error.value = ciErr;
    return;
  }
  const emErr = validateEmailFormat(email.value);
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
  if (!["left", "right", "auto"].includes(preferredBinaryLeg.value)) {
    error.value = "Debes seleccionar una opción de colocación binaria (izquierda, derecha o automático).";
    return;
  }
  loading.value = true;
  try {
    const sponsorOk = await validateSponsor();
    if (!sponsorOk || !sponsorValidated.value) {
      error.value = sponsorError.value || "Código de patrocinador inválido.";
      loading.value = false;
      return;
    }
    const payload = buildMemberRegisterPayload({
      name: name.value,
      email: email.value,
      password: password.value,
      passwordConfirmation: passwordConfirmation.value,
      documentId: ciNit.value,
      phone: normalizePhoneWithDial(phone.value, phoneDial.value),
      birthDate: birthDate.value,
      countryCode: countryCode.value,
      countryId: countriesCatalog.value.length ? countryId.value : null,
      sponsorReferralCode: sponsorReferralCode.value,
      preferredBinaryLeg: preferredBinaryLeg.value,
      registrationPackageId: selectedPackageId.value,
    });

    const response = await registerMember(payload);
    if (response.data.requires_email_verification) {
      router.push({
        path: "/verificar-correo",
        query: { email: response.data.email || email.value.trim() },
      });
      return;
    }
    if (response.data.token) {
      await store.dispatch("auth/setAuth", {
        user: response.data.user,
        token: response.data.token,
      });
      router.push("/dashboard-default");
    }
  } catch (err) {
    fieldErrors.value = allApiErrorMessages(err.response?.data);
    error.value =
      fieldErrors.value[0] ||
      err.response?.data?.message ||
      "No se pudo completar el registro.";
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

  <main class="main-content mt-0 pb-5">
    <div
      class="page-header align-items-start min-vh-50 pt-10 pb-11 m-3 border-radius-lg"
      style="position: relative; overflow: hidden"
    >
      <video
        autoplay
        muted
        loop
        style="
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: -1;
        "
      >
        <source src="@/assets/videos/video1.mp4" type="video/mp4" />
      </video>
      <span class="mask bg-gradient-dark opacity-6"></span>
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-6 text-center mx-auto">
            <h1 class="text-white mb-2 mt-5">Crear cuenta</h1>
            <p class="text-lead text-white mb-0">
              Registro de socio. Necesitas el código de un patrocinador activo para inscribirte.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="container px-3">
      <div class="row mt-lg-n10 mt-md-n11 mt-n10 justify-content-center">
        <div class="col-xl-6 col-lg-7 col-md-10 mx-auto">
          <div class="card border-0 shadow-lg signup-card z-index-0">
            <div class="card-header text-center bg-white border-0 pt-4 pb-0">
              <img
                src="@/assets/img/synkailogo2.png"
                alt="Logo"
                class="mb-2 mt-2 signup-card__logo"
                width="176"
                height="auto"
              />
              <h5 class="text-dark font-weight-bolder mb-1">Inscripción socio</h5>
              
            </div>
            <div class="card-body px-4 pb-2">
              <h6 class="text-sm text-dark font-weight-bolder mb-3">Paquete y país</h6>
              <div v-if="catalogError" class="alert alert-info text-dark text-sm mb-3" role="alert">
                {{ catalogError }}
              </div>
              <div class="mb-4">
                <label class="form-label text-sm mb-1">País</label>
                <select
                  v-if="!useLatamFallback"
                  v-model="countryId"
                  class="form-select"
                  @change="syncCountryFromSelect"
                >
                  <option disabled value="">Selecciona tu país…</option>
                  <option v-for="c in countriesCatalog" :key="c.id" :value="String(c.id)">
                    {{ c.flag || "🏳️" }} {{ c.name }}
                  </option>
                </select>
                <select v-else v-model="countryCode" class="form-select">
                  <option v-for="c in LATAM_COUNTRIES" :key="c.code" :value="c.code">
                    {{ c.flag }} {{ c.name }}
                  </option>
                </select>
                <p v-if="useLatamFallback" class="text-xxs text-muted mb-0 mt-1">
                  Lista LATAM local (si el backend tiene <code>/countries</code>, se sustituye por el catálogo del
                  servidor).
                </p>
              </div>

              <div
                v-if="!sponsorReferralCode.trim()"
                class="alert alert-warning text-dark text-sm mb-3"
                role="alert"
              >
                {{ SPONSOR_REQUIRED_MESSAGE }}
              </div>

              <div
                v-else
                class="alert text-sm mb-3"
                :class="sponsorValidated ? 'alert-success text-white' : sponsorError ? 'alert-danger text-white' : 'alert-info text-white'"
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

              <form @submit.prevent="signup" class="mt-4">
                <h6 class="text-sm text-dark font-weight-bolder mb-3">Datos personales</h6>
                <div class="mb-3">
                  <label class="form-label text-sm mb-1"
                    >Código de patrocinador <span class="text-danger">*</span></label
                  >
                  <argon-input
                    v-model="sponsorReferralCode"
                    id="sponsor"
                    type="text"
                    placeholder="Ej. 10, 11, 100…"
                    :error="!!sponsorError"
                  />
                  <p v-if="sponsorError" class="text-danger text-xxs mb-0 mt-1">{{ sponsorError }}</p>
                  <p v-else class="text-xxs text-muted mb-0 mt-1">
                    Solicita tu código a un socio activo. Sin patrocinador no es posible completar la inscripción.
                  </p>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-primary mt-2"
                    :disabled="sponsorCheckLoading || !sponsorReferralCode.trim()"
                    @click="validateSponsor"
                  >
                    Validar código
                  </button>
                </div>
                <div class="mb-3">
                  <label class="form-label text-sm mb-1">Nombre completo <span class="text-danger">*</span></label>
                  <argon-input v-model="name" id="name" type="text" placeholder="Nombre y apellidos" />
                </div>
                <div class="mb-3">
                  <label class="form-label text-sm mb-1">Correo electrónico <span class="text-danger">*</span></label>
                  <argon-input v-model="email" id="email" type="email" placeholder="correo@empresa.com" />
                </div>
                <div class="mb-3">
                  <label class="form-label text-sm mb-1">CI / NIT (ci_nit) <span class="text-danger">*</span></label>
                  <argon-input v-model="ciNit" id="ciNit" type="text" placeholder="Ej. 1234567 LP o NIT" />
                  <p class="text-xxs text-muted mb-0 mt-1">Obligatorio. Se guarda como documento de identidad en el sistema.</p>
                </div>
                <div class="mb-3">
                  <label class="form-label text-sm mb-1">Teléfono</label>
                  <div class="input-group">
                    <span class="input-group-text">{{ phoneDial }}</span>
                    <input
                      v-model.trim="phone"
                      id="phone"
                      type="tel"
                      class="form-control"
                      placeholder="Número (sin prefijo)"
                      inputmode="tel"
                      autocomplete="tel"
                    />
                  </div>
                  <p class="text-xxs text-muted mb-0 mt-1">
                    Se guardará como: <strong>{{ normalizePhoneWithDial(phone, phoneDial) || "—" }}</strong>
                  </p>
                </div>
                <div class="mb-3">
                  <label class="form-label text-sm mb-1"
                    >Fecha de nacimiento <span class="text-danger">*</span></label
                  >
                  <input
                    v-model="birthDate"
                    id="bd"
                    type="date"
                    class="form-control"
                    :class="{ 'is-invalid': birthDateError }"
                    :max="birthDateMax"
                    required
                    @blur="birthDateError = validateBirthDateAge(birthDate)"
                  />
                  <p v-if="birthDateError" class="text-danger text-xxs mb-0 mt-1">{{ birthDateError }}</p>
                  <p v-else class="text-xxs text-muted mb-0 mt-1">Debes ser mayor o igual de 18 años.</p>
                </div>

                <div class="mb-3">
                  <label class="form-label text-sm mb-1"
                    >Colocación binaria (tras activar) <span class="text-danger">*</span></label
                  >
                  <select v-model="preferredBinaryLeg" class="form-select">
                    <option value="left">Izquierda (cadena MLM izquierda)</option>
                    <option value="right">Derecha (cadena MLM derecha)</option>
                    <option value="auto">Automático (prioriza pierna vacía del patrocinador)</option>
                  </select>
                  <p class="text-xxs text-muted mb-0 mt-1">
                    Izquierda y derecha colocan en profundidad bajo ese lado sin límite de socios por pierna.
                  </p>
                </div>

                <div class="mb-3">
                  <label class="form-label text-sm mb-1">Contraseña (mín. 8) <span class="text-danger">*</span></label>
                  <div class="input-group">
                  <argon-input 
                    v-model="password" 
                    id="password" 
                    :type="showPassword ? 'text' : 'password'" 
                    placeholder="Contraseña" 
                  />
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label text-sm mb-1">Confirmar contraseña <span class="text-danger">*</span></label>
                  <div class="input-group">
                  <argon-input
                    v-model="passwordConfirmation"
                    id="password2"
                    :type="showPasswordConfirm ? 'text' : 'password'"
                    placeholder="Repite la contraseña"
                  />
                 
                  </div>
                </div>

                <div class="form-check mb-2">
                  <input
                    id="termsMlm"
                    v-model="terms"
                    class="form-check-input"
                    type="checkbox"
                  />
                  <label class="form-check-label text-sm" for="termsMlm">
                    Acepto los términos y condiciones del programa.
                  </label>
                  <button
                    type="button"
                    class="btn btn-link btn-sm p-0 ms-2 align-baseline"
                    @click="termsModalOpen = true"
                  >
                    Ver términos
                  </button>
                </div>

                <div v-if="fieldErrors.length" class="alert alert-danger text-sm mt-2 mb-0" role="alert">
                  <ul class="mb-0 ps-3">
                    <li v-for="(msg, idx) in fieldErrors" :key="idx">{{ msg }}</li>
                  </ul>
                </div>
                <p v-else-if="error" class="text-danger mt-2 text-sm">{{ error }}</p>

                <div class="d-grid pt-2">
                  <argon-button
                    fullWidth
                    color="dark"
                    variant="gradient"
                    class="mb-2"
                    type="submit"
                    :disabled="loading"
                  >
                    {{ loading ? "Registrando…" : "Registrarme" }}
                  </argon-button>
                </div>

                <p class="text-sm mt-3 mb-0 text-center">
                  ¿Ya tienes cuenta?
                  <router-link to="/signin" class="text-dark font-weight-bolder">Iniciar sesión</router-link>
                </p>
                <p class="text-sm mt-2 mb-0 text-center text-muted">
                  ¿Solo quieres comprar como cliente?
                  <router-link to="/registro-cliente-preferente" class="text-success font-weight-bold"
                    >Registro cliente preferente</router-link
                  >
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
  <app-footer />

  <div v-if="termsModalOpen" class="modal-backdrop fade show"></div>
  <div
    v-if="termsModalOpen"
    class="modal fade show d-block terms-modal"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-labelledby="termsModalTitle"
    @click.self="termsModalOpen = false"
  >
    <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
      <div class="modal-content terms-modal__content border-0 shadow-lg overflow-hidden">
        <div class="terms-modal__hero px-4 pt-4 pb-3">
          <div class="d-flex align-items-start justify-content-between gap-3">
            <div>
              <span class="terms-modal__badge">{{ distributorTerms.badge }}</span>
              <h5 id="termsModalTitle" class="terms-modal__title mb-1">{{ distributorTerms.title }}</h5>
              <p class="terms-modal__subtitle mb-0">{{ distributorTerms.subtitle }}</p>
            </div>
            <button
              type="button"
              class="btn-close btn-close-white flex-shrink-0 mt-1"
              aria-label="Cerrar"
              @click="termsModalOpen = false"
            />
          </div>
          <p class="terms-modal__intro mt-3 mb-0">{{ distributorTerms.intro }}</p>
        </div>

        <div class="modal-body terms-modal__body px-4 py-3">
          <article
            v-for="section in distributorTerms.sections"
            :key="section.n"
            class="terms-section"
            :class="{ 'terms-section--highlight': section.highlight }"
          >
            <header class="terms-section__head">
              <span class="terms-section__num">{{ section.n }}</span>
              <h6 class="terms-section__title">{{ section.title }}</h6>
            </header>
            <p v-for="(para, i) in section.text || []" :key="'t-' + section.n + '-' + i" class="terms-section__text">
              {{ para }}
            </p>
            <ul v-if="section.bullets?.length" class="terms-section__list">
              <li v-for="(item, j) in section.bullets" :key="'b-' + section.n + '-' + j">{{ item }}</li>
            </ul>
          </article>
        </div>

        <div class="modal-footer terms-modal__footer border-0 px-4 py-3">
          <a
            class="btn btn-outline-success btn-sm"
            :href="termsPdfUrl"
            download="terminos_y_condiciones.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i class="fas fa-file-pdf me-1" aria-hidden="true"></i>
            Descargar PDF
          </a>
          <button type="button" class="btn btn-light btn-sm" @click="termsModalOpen = false">Cerrar</button>
          <button type="button" class="btn btn-success btn-sm px-4" @click="acceptTermsModal">
            Acepto los términos
          </button>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<style scoped>
.signup-card {
  border-radius: 1rem;
}
.signup-card__logo {
  max-width: 180px;
  height: auto;
}
.text-xxs {
  font-size: 0.65rem;
}

/* Modal términos */
.terms-modal__content {
  border-radius: 1rem;
  max-height: min(90vh, 720px);
}

.terms-modal__hero {
  background: linear-gradient(135deg, #1a8f5c 0%, #2ebd85 55%, #3dd68c 100%);
  color: #fff;
}

.terms-modal__badge {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  margin-bottom: 0.5rem;
}

.terms-modal__title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #fff;
}

.terms-modal__subtitle {
  font-size: 0.8rem;
  opacity: 0.9;
}

.terms-modal__intro {
  font-size: 0.82rem;
  line-height: 1.5;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 0.5rem;
  padding: 0.65rem 0.85rem;
}

.terms-modal__body {
  max-height: 50vh;
  overflow-y: auto;
  background: #f8faf9;
  scrollbar-width: thin;
  scrollbar-color: #c5d9ce transparent;
}

.terms-modal__body::-webkit-scrollbar {
  width: 6px;
}
.terms-modal__body::-webkit-scrollbar-thumb {
  background: #b8cfc0;
  border-radius: 999px;
}

.terms-section {
  background: #fff;
  border: 1px solid #e8eeea;
  border-radius: 0.75rem;
  padding: 0.85rem 1rem;
  margin-bottom: 0.75rem;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.terms-section--highlight {
  border-color: #2ebd85;
  background: linear-gradient(180deg, #f0fdf4 0%, #fff 100%);
  box-shadow: 0 4px 14px rgba(46, 189, 133, 0.12);
}

.terms-section__head {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 0.5rem;
}

.terms-section__num {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  display: grid;
  place-items: center;
  border-radius: 0.5rem;
  background: linear-gradient(135deg, #2ebd85, #1a8f5c);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 800;
}

.terms-section__title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: #1e293b;
}

.terms-section__text {
  margin: 0 0 0.35rem;
  padding-left: 2.4rem;
  font-size: 0.8rem;
  line-height: 1.55;
  color: #475569;
}

.terms-section__list {
  margin: 0;
  padding-left: 2.65rem;
  font-size: 0.8rem;
  line-height: 1.55;
  color: #475569;
}

.terms-section__list li {
  margin-bottom: 0.35rem;
  position: relative;
}

.terms-section__list li::marker {
  color: #2ebd85;
}

.terms-modal__footer {
  background: #fff;
  border-top: 1px solid #e8eeea !important;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}
</style>
