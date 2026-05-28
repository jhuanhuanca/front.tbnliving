<script setup>
import { computed, onMounted, ref } from "vue";
import { useStore } from "vuex";
import { fetchProfile, fetchMyLanding, updateMyLanding } from "@/services/me";
import { DEFAULT_LANDING_TESTIMONIALS } from "@/constants/landingDefaults";

const store = useStore();

const loading = ref(true);
const saving = ref(false);
const error = ref("");
const ok = ref("");

const memberCode = ref("");

const form = ref({
  tagline: "",
  bio: "",
  phone: "",
  email: "",
  whatsapp: "",
  videos: [
    { titulo: "¿Qué es TBN?", descripcion: "Conoce el modelo y el plan.", duracion: "3:20" },
    { titulo: "Cómo ganar en el sistema", descripcion: "Unilevel + binario explicado.", duracion: "4:10" },
    { titulo: "Preguntas frecuentes", descripcion: "Dudas comunes de nuevos socios.", duracion: "2:45" },
  ],
  testimonials: DEFAULT_LANDING_TESTIMONIALS.map((t) => ({ ...t })),
});

const publicLink = computed(() => (memberCode.value ? `/p/${memberCode.value}` : ""));
const signupDirectLink = computed(() => (memberCode.value ? `/p/${memberCode.value}/registro` : ""));

function openPublic() {
  if (!publicLink.value) return;
  window.open(publicLink.value, "_blank", "noopener,noreferrer");
}

function openSignupDirect() {
  if (!signupDirectLink.value) return;
  window.open(signupDirectLink.value, "_blank", "noopener,noreferrer");
}

async function load() {
  loading.value = true;
  error.value = "";
  ok.value = "";
  try {
    const [u, l] = await Promise.all([fetchProfile(), fetchMyLanding()]);
    memberCode.value = u.member_code ? String(u.member_code) : "";
    const landing = l.landing || {};
    form.value = {
      ...form.value,
      tagline: landing.tagline || "",
      bio: landing.bio || "",
      phone: landing.phone || u.phone || "",
      email: landing.email || u.email || "",
      whatsapp: landing.whatsapp || "",
      videos: Array.isArray(landing.videos) && landing.videos.length ? landing.videos : form.value.videos,
      testimonials:
        Array.isArray(landing.testimonials) && landing.testimonials.length
          ? landing.testimonials.map((t) => ({
              quote: t.quote || "",
              name: t.name || "",
              role: t.role || "",
            }))
          : form.value.testimonials,
    };
  } catch {
    error.value = "No se pudo cargar tu landing.";
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  error.value = "";
  ok.value = "";
  try {
    const payload = {
      ...form.value,
      testimonials: form.value.testimonials
        .map((t) => ({
          quote: String(t.quote || "").trim(),
          name: String(t.name || "").trim(),
          role: String(t.role || "").trim(),
        }))
        .filter((t) => t.quote),
    };
    await updateMyLanding({ landing: payload });
    ok.value = "Landing guardada correctamente.";
  } catch (e) {
    error.value = e?.response?.data?.message || "No se pudo guardar la landing.";
  } finally {
    saving.value = false;
  }
}

function addTestimonial() {
  if (form.value.testimonials.length >= 6) return;
  form.value.testimonials.push({ quote: "", name: "", role: "" });
}

function removeTestimonial(idx) {
  form.value.testimonials.splice(idx, 1);
}

onMounted(async () => {
  store.state.hideConfigButton = true;
  store.state.showNavbar = false;
  store.state.showSidenav = false;
  store.state.showFooter = false;
  store.state.layout = "landing";
  document.body.classList.remove("bg-gray-100");
  await load();
});
</script>

<template>
  <motion-free class="container py-4">
    <div class="card border-0 shadow mb-4">
      <motion-free class="card-body p-4 d-flex flex-wrap justify-content-between align-items-start gap-3">
        <div>
          <h3 class="mb-1 text-dark font-weight-bolder">Editor de landing personal</h3>
          <p class="text-sm text-secondary mb-0">Edita tu página pública y compártela con tu equipo.</p>
          <p class="text-xs text-secondary mb-0 mt-2">
            Landing: <code>{{ publicLink || "—" }}</code>
            · Referido directo: <code>/i/{{ memberCode || "…" }}</code>
            · Registro desde landing: <code>{{ signupDirectLink || "—" }}</code>
          </p>
          <p class="text-xs text-muted mb-0 mt-1">
            Los paquetes se cargan del catálogo. También puedes usar
            <code>/p/{{ memberCode || "CODIGO" }}?registro=1</code> para ir directo al signup con tu patrocinador.
          </p>
        </div>
        <div class="d-flex flex-wrap gap-2">
          <button type="button" class="btn btn-outline-secondary" :disabled="loading" @click="openPublic">
            Ver landing
          </button>
          <button type="button" class="btn btn-outline-primary" :disabled="loading || !signupDirectLink" @click="openSignupDirect">
            Probar registro directo
          </button>
          <button type="button" class="btn btn-success" :disabled="loading || saving" @click="save">
            {{ saving ? "Guardando…" : "Guardar cambios" }}
          </button>
        </div>
      </motion-free>
    </div>

    <div v-if="error" class="alert alert-danger text-white">{{ error }}</div>
    <motion-free v-if="ok" class="alert alert-success text-white">{{ ok }}</motion-free>

    <div class="row g-3">
      <div class="col-lg-6">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-header pb-0">
            <h6 class="text-dark mb-0">Contenido</h6>
            <p class="text-xs text-secondary mb-0">Lo que verá el visitante en tu landing.</p>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <label class="form-label text-sm">Tagline</label>
              <input v-model.trim="form.tagline" class="form-control" type="text" placeholder="Ej: Emprendedor multinivel" />
            </div>
            <div class="mb-3">
              <label class="form-label text-sm">Bio</label>
              <textarea v-model.trim="form.bio" class="form-control" rows="4" placeholder="Cuenta quién eres y tu propuesta de valor." />
            </div>
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label text-sm">Teléfono</label>
                <input v-model.trim="form.phone" class="form-control" type="text" placeholder="+591..." />
              </div>
              <div class="col-md-6">
                <label class="form-label text-sm">WhatsApp</label>
                <input v-model.trim="form.whatsapp" class="form-control" type="text" placeholder="+591..." />
              </div>
              <div class="col-12">
                <label class="form-label text-sm">Email de contacto</label>
                <input v-model.trim="form.email" class="form-control" type="email" placeholder="correo@empresa.com" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-header pb-0">
            <h6 class="text-dark mb-0">Videos</h6>
            <p class="text-xs text-secondary mb-0">Lista de videos (título, descripción, duración).</p>
          </div>
          <div class="card-body">
            <div v-for="(v, idx) in form.videos" :key="idx" class="p-3 border rounded-3 mb-3">
              <div class="row g-2">
                <div class="col-12">
                  <label class="form-label text-xs mb-1">Título</label>
                  <input v-model.trim="v.titulo" class="form-control form-control-sm" type="text" />
                </div>
                <div class="col-12">
                  <label class="form-label text-xs mb-1">Descripción</label>
                  <input v-model.trim="v.descripcion" class="form-control form-control-sm" type="text" />
                </div>
                <div class="col-6">
                  <label class="form-label text-xs mb-1">Duración</label>
                  <input v-model.trim="v.duracion" class="form-control form-control-sm" type="text" placeholder="3:20" />
                </div>
              </div>
            </div>
            <button
              type="button"
              class="btn btn-outline-primary btn-sm"
              @click="form.videos.push({ titulo: 'Nuevo video', descripcion: '', duracion: '0:00' })"
            >
              Añadir video
            </button>
          </div>
        </div>

        <div class="card border-0 shadow-sm">
          <div class="card-header pb-0">
            <h6 class="text-dark mb-0">Testimonios</h6>
            <p class="text-xs text-secondary mb-0">Hasta 6 testimonios en la sección “Confían en este camino”.</p>
          </div>
          <div class="card-body">
            <motion-free v-for="(t, idx) in form.testimonials" :key="idx" class="p-3 border rounded-3 mb-3">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="text-xs text-muted fw-bold">Testimonio {{ idx + 1 }}</span>
                <button
                  v-if="form.testimonials.length > 1"
                  type="button"
                  class="btn btn-link btn-sm text-danger p-0"
                  @click="removeTestimonial(idx)"
                >
                  Quitar
                </button>
              </div>
              <motion-free class="mb-2">
                <label class="form-label text-xs mb-1">Cita</label>
                <textarea v-model.trim="t.quote" class="form-control form-control-sm" rows="3" placeholder="Lo que dice la persona…" />
              </motion-free>
              <div class="row g-2">
                <div class="col-md-6">
                  <label class="form-label text-xs mb-1">Nombre</label>
                  <input v-model.trim="t.name" class="form-control form-control-sm" type="text" placeholder="María L." />
                </div>
                <div class="col-md-6">
                  <label class="form-label text-xs mb-1">Rol / cargo</label>
                  <input v-model.trim="t.role" class="form-control form-control-sm" type="text" placeholder="Socia activa" />
                </div>
              </div>
            </motion-free>
            <button
              type="button"
              class="btn btn-outline-primary btn-sm"
              :disabled="form.testimonials.length >= 6"
              @click="addTestimonial"
            >
              Añadir testimonio
            </button>
          </div>
        </div>
      </div>
    </div>
  </motion-free>
</template>
