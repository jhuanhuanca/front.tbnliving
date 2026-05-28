<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import ArgonButton from "@/components/ArgonButton.vue";
import { postBinaryPlacement } from "@/services/me";
import { fetchProfile } from "@/services/me";

const store = useStore();
const router = useRouter();
const loading = ref(false);
const err = ref("");
const sponsor = computed(() => store.state.auth.user?.sponsor);

function normalizeLegPref(raw) {
  const v = String(raw || "")
    .trim()
    .toLowerCase();
  if (v === "left" || v === "right") {
    return v;
  }
  return "auto";
}

const placement = ref(normalizeLegPref(store.state.auth.user?.preferred_binary_leg));

async function applyProfileAndRedirectIfDone(u) {
  if (!u) {
    return;
  }
  placement.value = normalizeLegPref(u.preferred_binary_leg);
  await store.dispatch("auth/setAuth", {
    user: u,
    token: localStorage.getItem("token"),
  });
  if (u.needs_binary_placement === false) {
    router.replace("/dashboard-default");
  }
}

onMounted(async () => {
  try {
    const u = await fetchProfile();
    await applyProfileAndRedirectIfDone(u);
  } catch {
    /* */
  }
});

async function confirmarColocacion() {
  err.value = "";
  loading.value = true;
  try {
    await postBinaryPlacement({ placement: placement.value });
    const u = await fetchProfile();
    await store.dispatch("auth/setAuth", {
      user: u,
      token: localStorage.getItem("token"),
    });
    router.replace("/dashboard-default");
  } catch (e) {
    const apiMsg = e.response?.data?.message ?? "";
    if (
      e.response?.status === 422 &&
      typeof apiMsg === "string" &&
      apiMsg.includes("Ya tienes colocación binaria")
    ) {
      try {
        const u = await fetchProfile();
        await applyProfileAndRedirectIfDone(u);
      } catch {
        /* */
      }
      if (router.currentRoute.value.path === "/activacion-binaria") {
        err.value = apiMsg;
      }
      return;
    }
    err.value = apiMsg || "No se pudo registrar la pierna.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="py-5 container-fluid">
    <div class="row justify-content-center">
      <div class="col-lg-8">
        <div class="card border-0 shadow">
          <div class="card-body p-4 text-center">
            <h4 class="mb-2">Colocación en el binario</h4>
            <p class="text-sm text-secondary mb-4">
              Tu activación está registrada. Elige cómo quieres colocarte bajo tu patrocinador. En producción, esto
              evita confusiones y ayuda a planificar tu red.
              <span v-if="sponsor">Patrocinador: {{ sponsor.name }}.</span>
            </p>
            <p v-if="err" class="text-danger text-sm">{{ err }}</p>
            <div class="mb-3">
                  <label class="form-label text-sm mb-2">
                    Colocación binaria (obligatorio) <span class="text-danger">*</span>
                  </label>
                  <div class="d-flex gap-2 flex-wrap">
                    <button
                      type="button"
                      class="btn btn-sm"
                      :class="placement === 'left' ? 'bg-gradient-success text-white' : 'btn-outline-success'"
                      @click="placement = 'left'"
                    >
                      Izquierda
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm"
                      :class="placement === 'right' ? 'bg-gradient-success text-white' : 'btn-outline-success'"
                      @click="placement = 'right'"
                    >
                      Derecha
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm"
                      :class="placement === 'auto' ? 'bg-gradient-success text-white' : 'btn-outline-success'"
                      @click="placement = 'auto'"
                    >
                      Automático
                    </button>
                  </div>
                  <p class="text-xxs text-muted mb-0 mt-2">
                    Se aplicará al activar la cuenta: si eliges izquierda/derecha, intentaremos colocarte bajo tu patrocinador en esa
                    pierna. Si no hay cupo, se colocará automáticamente en el primer cupo disponible.
                  </p>
                </div>
            <div class="d-flex flex-wrap justify-content-center gap-3 mt-4">
              <argon-button
                color="success"
                variant="gradient"
                size="lg"
                :disabled="loading"
                class="px-5"
                @click="confirmarColocacion"
              >
                {{ loading ? "Procesando…" : "Confirmar colocación" }}
              </argon-button>
            </div>
            <p class="text-xs text-secondary mt-3 mb-0">
              Si eliges izquierda/derecha y el slot está ocupado, el sistema te avisará para que elijas otra opción.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
