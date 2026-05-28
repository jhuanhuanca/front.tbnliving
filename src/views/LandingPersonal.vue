<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import { fetchMyLanding, fetchProfile, fetchPublicLanding, fetchPackages } from "@/services/me";
import { useScrollReveal } from "@/composables/useScrollReveal";
import { persistReferralSponsor } from "@/utils/referralStorage";
import { DEFAULT_LANDING_TESTIMONIALS } from "@/constants/landingDefaults";
import { enrichLandingPackages, formatPackagePriceBob } from "@/utils/landingPackages";

defineOptions({ name: "LandingPersonal" });

const route = useRoute();
const router = useRouter();
const store = useStore();
const { vReveal } = useScrollReveal();

const loading = ref(true);
const error = ref("");
const isOwnerPreview = ref(false);

const perfil = ref({
  nombre: "Socio TBN",
  email: "",
  telefono: "",
  whatsapp: "",
  bio: "",
  tagline: "Emprendedor multinivel · Construyendo redes que transforman",
  foto: "",
});

const sponsorCode = ref("");
const packages = ref([]);
const packagesLoading = ref(true);

const videos = ref([
  { titulo: "Cómo funciona el negocio", descripcion: "Explicación del modelo y oportunidades.", duracion: "5 min" },
  { titulo: "Mi historia y resultados", descripcion: "De dónde vengo y qué he logrado.", duracion: "8 min" },
  { titulo: "Plan de compensación", descripcion: "Cómo se generan los ingresos.", duracion: "12 min" },
]);

const valueProps = [
  {
    icon: "ni ni-favourite-28",
    title: "Ingresos recurrentes",
    text: "Plan de compensación unilevel y binario diseñado para escalar contigo.",
  },
  {
    icon: "ni ni-bulb-61",
    title: "Formación continua",
    text: "Capacitación, herramientas y acompañamiento para tu equipo.",
  },
  {
    icon: "ni ni-lock-circle-open",
    title: "Infraestructura sólida",
    text: "Plataforma segura con soporte y seguimiento de tu red.",
  },
];

const testimonials = ref([...DEFAULT_LANDING_TESTIMONIALS]);

const ctaName = ref("");
const ctaEmail = ref("");

const displayPackages = computed(() => {
  const list = packages.value;
  if (list.length <= 3) return list;
  const idx = list.findIndex((p) => p.recommended);
  if (idx <= 0) return list.slice(0, 3);
  return list.slice(Math.max(0, idx - 1), Math.max(0, idx - 1) + 3);
});

const referralSignupPath = computed(() => {
  const query = {};
  if (sponsorCode.value) query.sponsor = sponsorCode.value;
  return { path: "/signup", query };
});

function signupQueryForPackage(pkg) {
  const query = {};
  if (sponsorCode.value) query.sponsor = sponsorCode.value;
  if (pkg?.id) query.package = String(pkg.id);
  else if (pkg?.slug) query.slug = String(pkg.slug);
  return query;
}

function goSignup(extraQuery = {}) {
  router.push({
    path: "/signup",
    query: {
      ...(sponsorCode.value ? { sponsor: sponsorCode.value } : {}),
      ...extraQuery,
    },
  });
}

function submitCtaForm() {
  const query = {};
  if (sponsorCode.value) query.sponsor = sponsorCode.value;
  if (ctaEmail.value.trim()) query.email = ctaEmail.value.trim();
  router.push({ path: "/signup", query });
}

function initials(nombre) {
  const parts = String(nombre || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return `${parts[0]?.[0] || "T"}${parts[1]?.[0] || "B"}`.toUpperCase();
}

function formatPrice(p) {
  return formatPackagePriceBob(p.price);
}

async function loadPackages() {
  packagesLoading.value = true;
  try {
    const res = await fetchPackages();
    packages.value = enrichLandingPackages(res.data || []);
  } catch {
    packages.value = enrichLandingPackages([]);
  } finally {
    packagesLoading.value = false;
  }
}

function applyLandingPayload(user = {}, landing = {}) {
  perfil.value = {
    ...perfil.value,
    nombre: user.name || perfil.value.nombre,
    email: landing.email || user.email || perfil.value.email,
    telefono: landing.phone || user.phone || perfil.value.telefono,
    whatsapp: landing.whatsapp || "",
    bio: landing.bio || perfil.value.bio,
    tagline: landing.tagline || perfil.value.tagline,
    foto: landing.foto || "",
  };
  if (Array.isArray(landing.videos) && landing.videos.length) {
    videos.value = landing.videos;
  }
  if (Array.isArray(landing.testimonials) && landing.testimonials.length) {
    testimonials.value = landing.testimonials
      .map((t) => ({
        quote: String(t.quote || "").trim(),
        name: String(t.name || "").trim(),
        role: String(t.role || "").trim(),
      }))
      .filter((t) => t.quote);
  }
  const code = user.member_code || user.referral_code || "";
  if (code) {
    sponsorCode.value = String(code);
    persistReferralSponsor(sponsorCode.value);
  }
}

async function loadLanding() {
  loading.value = true;
  error.value = "";
  try {
    const memberCode = route.params?.memberCode;
    if (memberCode) {
      persistReferralSponsor(String(memberCode));
      const data = await fetchPublicLanding(String(memberCode));
      applyLandingPayload(data.user || {}, data.landing || {});
      return;
    }

    isOwnerPreview.value = true;
    const [u, l] = await Promise.all([fetchProfile(), fetchMyLanding()]);
    applyLandingPayload(u || {}, l.landing || {});
  } catch {
    error.value = "No se pudo cargar la landing.";
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  store.state.hideConfigButton = true;
  store.state.showNavbar = false;
  store.state.showSidenav = false;
  store.state.showFooter = false;
  store.state.layout = "landing";
  document.body.classList.remove("bg-gray-100");

  const memberCode = route.params?.memberCode;
  const wantsSignup =
    route.query.registro === "1" ||
    route.query.signup === "1" ||
    route.query.inscribirse === "1";
  if (memberCode && wantsSignup) {
    persistReferralSponsor(String(memberCode));
    router.replace({
      path: "/signup",
      query: {
        sponsor: String(memberCode),
        ...(route.query.package ? { package: String(route.query.package) } : {}),
        ...(route.query.slug ? { slug: String(route.query.slug) } : {}),
      },
    });
    return;
  }

  await Promise.all([loadLanding(), loadPackages()]);
});
</script>

<template>
  <div class="lp-page">
    <!-- Topbar -->
    <header class="lp-topbar">
      <div class="container lp-topbar__inner">
        <router-link to="/welcom" class="lp-brand text-decoration-none">
          <span class="lp-brand__dot" aria-hidden="true" />
          TBN
        </router-link>
        <div class="d-flex align-items-center gap-2">
          <span v-if="sponsorCode" class="lp-badge-code d-none d-sm-inline">
            Patrocinador · {{ sponsorCode }}
          </span>
          <router-link v-if="isOwnerPreview" to="/mi-landing" class="btn btn-sm lp-btn-ghost me-1">Editar</router-link>
          <router-link v-if="isOwnerPreview" to="/cuenta" class="btn btn-sm lp-btn-ghost">
            Mi cuenta
          </router-link>
          <router-link v-else to="/signin" class="btn btn-sm lp-btn-ghost">Iniciar sesión</router-link>
        </div>
      </div>
    </header>

    <div v-if="error" class="container pt-5">
      <div class="alert alert-danger text-white">{{ error }}</div>
    </div>

    <!-- Hero -->
    <section class="lp-hero">
      <div class="lp-deco lp-deco--pill lp-deco--1" aria-hidden="true" />
      <div class="lp-deco lp-deco--circle lp-deco--2" aria-hidden="true" />
      <div class="lp-deco lp-deco--pill lp-deco--3" aria-hidden="true" />

      <div class="container lp-hero__grid">
        <div v-reveal class="lp-hero__copy">
          <p class="lp-kicker">{{ perfil.tagline }}</p>
          <h1 class="lp-hero__title">{{ perfil.nombre }}</h1>
          <p class="lp-hero__lead">
            {{ perfil.bio || "Únete a mi equipo y descubre una forma diferente de generar ingresos con TBN." }}
          </p>
          <div class="d-flex flex-wrap gap-3">
            <button type="button" class="btn lp-btn-primary btn-lg" @click="goSignup()">
              Únete ahora
            </button>
            <a href="#paquetes" class="btn lp-btn-outline btn-lg">Ver paquetes</a>
          </div>
        </div>

        <div v-reveal:scale class="lp-hero__visual">
          <div class="lp-hero__ring lp-hero__ring--gold" aria-hidden="true" />
          <div class="lp-hero__ring lp-hero__ring--white" aria-hidden="true" />
          <div class="lp-hero__avatar">
            <img v-if="perfil.foto" :src="perfil.foto" :alt="perfil.nombre" />
            <span v-else>{{ initials(perfil.nombre) }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Presentación -->
    <section class="lp-section lp-section--dark">
      <div class="container lp-split">
        <div v-reveal:left class="lp-split__media">
          <div class="lp-mock-card">
            <div class="lp-mock-card__bar" />
            <div class="lp-mock-card__body">
              <span class="lp-mock-dot" />
              <span class="lp-mock-dot" />
              <span class="lp-mock-dot lp-mock-dot--accent" />
            </div>
          </div>
        </div>
        <div v-reveal class="lp-split__text text-white">
          <h2 class="lp-section-title lp-section-title--gold">Tu oportunidad con TBN</h2>
          <p class="lp-text-muted-light">
            {{ perfil.bio || "Construye tu red con un sistema claro de bonos, productos de calidad y acompañamiento personalizado." }}
          </p>
          <p class="lp-text-muted-light mb-4">
            Regístrate con mi enlace de referido y elige el paquete de activación que mejor se adapte a tus metas.
          </p>
          <button type="button" class="btn lp-btn-gold" @click="goSignup()">Comenzar inscripción</button>
        </div>
      </div>
    </section>

    <!-- Value props -->
    <section class="lp-section lp-section--dark lp-section--compact">
      <div class="container">
        <div v-reveal class="text-center mb-5">
          <h2 class="lp-section-title text-white">¿Por qué unirte?</h2>
        </div>
        <div class="row g-4">
          <div
            v-for="(item, i) in valueProps"
            :key="item.title"
            v-reveal="{ delay: i * 80 }"
            class="col-md-4"
          >
            <div class="lp-value-card">
              <div class="lp-value-icon" aria-hidden="true">
                <i :class="item.icon" />
              </div>
              <h3 class="h6 text-white fw-bold">{{ item.title }}</h3>
              <p class="text-white-50 text-sm mb-0">{{ item.text }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Destacado + videos -->
    <section class="lp-section lp-section--cream">
      <div class="container lp-split lp-split--reverse">
        <div v-reveal:left class="lp-split__media">
          <div class="lp-profile-card">
            <div class="lp-profile-card__avatar">
              <img v-if="perfil.foto" :src="perfil.foto" :alt="perfil.nombre" />
              <span v-else>{{ initials(perfil.nombre) }}</span>
            </div>
            <div>
              <div class="fw-bold text-dark">{{ perfil.nombre }}</div>
              <div class="text-sm text-muted">{{ perfil.tagline }}</div>
            </div>
          </div>
        </div>
        <div v-reveal class="lp-split__text">
          <h2 class="lp-section-title text-dark">Conóceme</h2>
          <p class="text-muted">
            Estoy construyendo un equipo sólido con TBN. Si buscas una oportunidad seria, formación y un patrocinador
            activo, este es tu lugar.
          </p>
          <ul class="list-unstyled lp-contact-list mb-4">
            <li v-if="perfil.email">
              <i class="ni ni-email-83 me-2 text-success" />
              <a :href="`mailto:${perfil.email}`">{{ perfil.email }}</a>
            </li>
            <li v-if="perfil.telefono">
              <i class="ni ni-mobile-button me-2 text-success" />
              <a :href="`tel:${perfil.telefono}`">{{ perfil.telefono }}</a>
            </li>
            <li v-if="perfil.whatsapp">
              <i class="ni ni-chat-round me-2 text-success" />
              <a
                :href="`https://wa.me/${String(perfil.whatsapp).replace(/\D/g, '')}`"
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
            </li>
          </ul>
          <button type="button" class="btn lp-btn-dark" @click="goSignup()">Quiero unirme</button>
        </div>
      </div>

      <div id="videos" class="container mt-5 pt-4">
        <div v-reveal class="text-center mb-4">
          <h2 class="h4 fw-bold text-dark">Videos de explicación</h2>
        </div>
        <div class="row g-4">
          <div
            v-for="(video, i) in videos.slice(0, 3)"
            :key="video.titulo + i"
            v-reveal="{ delay: i * 70 }"
            class="col-md-4"
          >
            <div class="lp-video-card">
              <div class="lp-video-card__thumb">
                <i class="ni ni-button-play" aria-hidden="true" />
                <span class="lp-video-card__badge">{{ video.duracion }}</span>
              </div>
              <h3 class="h6 fw-bold mt-3 mb-1">{{ video.titulo }}</h3>
              <p class="text-sm text-muted mb-0">{{ video.descripcion }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonios -->
    <section class="lp-section lp-section--dark">
      <div class="container">
        <div v-reveal class="text-center mb-5">
          <h2 class="lp-section-title text-white">
            Confían en este camino
            <span class="lp-dot-accent" aria-hidden="true" />
          </h2>
        </div>
        <div class="row g-4">
          <div
            v-for="(t, i) in testimonials"
            :key="t.name"
            v-reveal="{ delay: i * 90 }"
            class="col-md-4"
          >
            <div class="lp-testimonial">
              <p class="lp-testimonial__quote">“{{ t.quote }}”</p>
              <p class="lp-testimonial__author mb-0">
                <strong>{{ t.name }}</strong>
                <span class="text-white-50"> · {{ t.role }}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Paquetes (API) -->
    <section id="paquetes" class="lp-section lp-section--cream">
      <div class="container">
        <div v-reveal class="text-center mb-5">
          <h2 class="lp-section-title text-dark">Paquetes de activación</h2>
          <p class="text-muted mb-0">Elige tu paquete y regístrate con mi enlace de referido.</p>
        </div>

        <div v-if="packagesLoading" class="text-center text-muted py-5">Cargando paquetes…</div>
        <div v-else-if="!displayPackages.length" class="text-center text-muted py-5">
          Paquetes no disponibles por el momento.
        </div>
        <div v-else class="row g-4 justify-content-center align-items-stretch">
          <div
            v-for="(pkg, i) in displayPackages"
            :key="pkg.id || pkg.slug"
            v-reveal="{ delay: i * 100 }"
            class="col-lg-4 col-md-6"
          >
            <div class="lp-pricing-card" :class="{ 'lp-pricing-card--featured': pkg.recommended }">
              <span v-if="pkg.recommended" class="lp-pricing-card__tag">Recomendado</span>
              <p class="lp-pricing-card__tier text-uppercase">{{ pkg.displayName }}</p>
              <p class="lp-pricing-card__price">{{ formatPrice(pkg) }}</p>
              <p class="lp-pricing-card__pv">{{ pkg.pv_points }} PV</p>
              <p class="text-sm text-muted">{{ pkg.description }}</p>
              <ul class="lp-pricing-card__features">
                <li v-for="(f, fi) in pkg.features" :key="fi">{{ f }}</li>
              </ul>
              <button
                type="button"
                class="btn w-100"
                :class="pkg.recommended ? 'lp-btn-gold' : 'lp-btn-dark'"
                @click="goSignup(signupQueryForPackage(pkg))"
              >
                Inscribirme
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA registro -->
    <section class="lp-section lp-section--dark lp-cta">
      <div class="container lp-split">
        <div v-reveal class="lp-split__text text-white">
          <h2 class="lp-section-title">Crea tu cuenta gratis</h2>
          <p class="lp-text-muted-light mb-4">
            Completa tu registro y quedarás vinculado a
            <strong>{{ perfil.nombre }}</strong>
            <span v-if="sponsorCode"> (código {{ sponsorCode }})</span>.
          </p>
          <form class="lp-form" @submit.prevent="submitCtaForm">
            <div class="mb-3">
              <label class="form-label text-white-50 text-sm">Tu nombre</label>
              <input v-model.trim="ctaName" type="text" class="form-control lp-input" placeholder="Nombre completo" />
            </div>
            <div class="mb-3">
              <label class="form-label text-white-50 text-sm">Correo electrónico</label>
              <input v-model.trim="ctaEmail" type="email" class="form-control lp-input" placeholder="correo@ejemplo.com" />
            </div>
            <button type="submit" class="btn lp-btn-gold btn-lg w-100">Registrarme ahora</button>
          </form>
        </div>
        <div v-reveal:scale class="lp-split__media d-none d-lg-flex justify-content-center">
          <div class="lp-cta-visual">
            <div class="lp-hero__avatar lp-hero__avatar--lg">
              <img v-if="perfil.foto" :src="perfil.foto" :alt="perfil.nombre" />
              <span v-else>{{ initials(perfil.nombre) }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <footer class="lp-footer">
      <div class="container d-flex flex-wrap justify-content-between align-items-center gap-3">
        <span>{{ perfil.nombre }} · Landing personal TBN</span>
        <div class="d-flex gap-3">
          <router-link :to="referralSignupPath">Registro</router-link>
          <router-link to="/welcom">Inicio</router-link>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped lang="scss">
@import "./LandingPersonal.scss";
</style>
