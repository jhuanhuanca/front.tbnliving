<script setup>
import { computed, ref, onMounted } from "vue";
import ArgonButton from "@/components/ArgonButton.vue";
import MlmPaymentMethodPanel from "@/components/MlmPaymentMethodPanel.vue";
import { fetchEvents, fetchNews, createEventRegistration } from "@/services/events";
import {
  hasValidPaymentReceipt,
  paymentMethodAcceptsReceipt,
  RECEIPT_REQUIRED_MESSAGE,
} from "@/utils/orderPaymentProof";

const loading = ref(true);
const err = ref("");
const msg = ref("");
const events = ref([]);
const news = ref([]);
const cart = ref([]);
const checkoutLoading = ref(false);
const paymentMethod = ref("transferencia");
const paymentReceiptFile = ref(null);

const cartRequiresPayment = computed(() =>
  cart.value.some((it) => it.event?.requires_payment)
);

const cartTotal = computed(() =>
  cart.value.reduce((s, it) => s + Number(it.event?.entry_cost || 0) * Number(it.cantidad || 1), 0)
);

const canCheckout = computed(() => {
  if (!cart.value.length) return false;
  if (!cartRequiresPayment.value) return true;
  return hasValidPaymentReceipt(paymentMethod.value, paymentReceiptFile.value);
});

function formatBs(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format(n);
}

function formatSchedule(ev) {
  if (!ev?.starts_at) return "—";
  try {
    const s = new Date(ev.starts_at);
    const e = ev.ends_at ? new Date(ev.ends_at) : null;
    const opts = { dateStyle: "medium", timeStyle: "short" };
    return e
      ? `${s.toLocaleString("es-BO", opts)} – ${e.toLocaleTimeString("es-BO", { timeStyle: "short" })}`
      : s.toLocaleString("es-BO", opts);
  } catch {
    return ev.starts_at;
  }
}

function kindLabel(ev) {
  if (ev.kind === "virtual") {
    return ev.platform === "zoom" ? "Virtual · Zoom" : "Virtual · YouTube";
  }
  return "Presencial";
}

function addToCart(ev) {
  const ex = cart.value.find((c) => c.event.id === ev.id);
  if (ex) {
    ex.cantidad += 1;
  } else {
    cart.value.push({ event: ev, cantidad: 1 });
  }
}

function removeFromCart(id) {
  cart.value = cart.value.filter((c) => c.event.id !== id);
}

async function load() {
  loading.value = true;
  err.value = "";
  try {
    const [ev, nw] = await Promise.all([fetchEvents(), fetchNews()]);
    events.value = ev;
    news.value = nw;
  } catch {
    err.value = "No se pudieron cargar eventos y noticias.";
  } finally {
    loading.value = false;
  }
}

async function checkout() {
  msg.value = "";
  err.value = "";
  if (!cart.value.length) return;
  if (cartRequiresPayment.value && !hasValidPaymentReceipt(paymentMethod.value, paymentReceiptFile.value)) {
    err.value = RECEIPT_REQUIRED_MESSAGE;
    return;
  }

  checkoutLoading.value = true;
  const hadPaidEntries = cartRequiresPayment.value;
  try {
    for (const item of cart.value) {
      const needsPay = item.event.requires_payment;
      const proof =
        needsPay && paymentMethodAcceptsReceipt(paymentMethod.value) ? paymentReceiptFile.value : null;
      await createEventRegistration(
        {
          event_id: item.event.id,
          cantidad: item.cantidad,
          payment_settlement: needsPay ? "manual" : "immediate",
          payment_method: needsPay ? paymentMethod.value : "gratis",
        },
        proof
      );
    }
    cart.value = [];
    paymentReceiptFile.value = null;
    msg.value = hadPaidEntries
      ? "Inscripciones registradas. Pendiente de confirmación de pago donde aplique."
      : "Te inscribiste correctamente a los eventos seleccionados.";
    await load();
  } catch (e) {
    const proofErr = e.response?.data?.errors?.payment_proof?.[0];
    err.value = proofErr || e.response?.data?.message || "No se pudo completar la inscripción.";
  } finally {
    checkoutLoading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="container-fluid py-4 eventos-page">
    <div class="row mb-4">
      <div class="col-12">
        <h4 class="text-dark font-weight-bolder">Noticias y eventos</h4>
        <p class="text-sm text-secondary mb-0">
          Capacitaciones virtuales (YouTube / Zoom) y eventos presenciales. Inscríbete y paga entrada cuando corresponda.
        </p>
      </div>
    </div>

    <div v-if="err" class="alert alert-warning text-white">{{ err }}</div>
    <div v-if="msg" class="alert alert-success text-white">{{ msg }}</div>
    <div v-if="loading" class="text-muted text-sm">Cargando…</div>

    <template v-else>
      <div class="row g-4">
        <div class="col-lg-8">
          <div class="card shadow-sm mb-4">
            <div class="card-header pb-0">
              <h6 class="mb-0">Noticias</h6>
            </div>
            <div class="card-body">
              <div v-if="!news.length" class="text-sm text-muted">No hay noticias publicadas.</div>
              <div v-for="n in news" :key="n.id" class="mb-4 pb-3 border-bottom">
                <div class="d-flex gap-3 flex-wrap">
                  <img
                    v-if="n.image_url"
                    :src="n.image_url"
                    :alt="n.title"
                    class="rounded"
                    style="width: 120px; height: 80px; object-fit: cover"
                  />
                  <div class="flex-grow-1">
                    <h6 class="text-dark mb-1">{{ n.title }}</h6>
                    <p class="text-xs text-muted mb-1">{{ n.summary }}</p>
                    <p v-if="n.body" class="text-sm mb-0">{{ n.body }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="card shadow-sm">
            <div class="card-header pb-0">
              <h6 class="mb-0">Eventos disponibles</h6>
            </div>
            <div class="card-body">
              <div v-if="!events.length" class="text-sm text-muted">No hay eventos activos.</div>
              <div v-for="ev in events" :key="ev.id" class="card border mb-3">
                <div class="card-body">
                  <div class="row g-3">
                    <div v-if="ev.flyer_url" class="col-md-4">
                      <img :src="ev.flyer_url" :alt="ev.name" class="img-fluid rounded w-100" />
                    </div>
                    <div :class="ev.flyer_url ? 'col-md-8' : 'col-12'">
                      <span class="badge bg-gradient-success text-xs">{{ kindLabel(ev) }}</span>
                      <h6 class="mt-2 text-dark">{{ ev.name }}</h6>
                      <p class="text-xs text-muted mb-1">
                        <strong>Presentador:</strong> {{ ev.speaker || "—" }}
                      </p>
                      <p class="text-xs text-muted mb-1">
                        <strong>Horario:</strong> {{ formatSchedule(ev) }}
                      </p>
                      <p v-if="ev.kind === 'virtual' && ev.virtual_url" class="text-xs mb-1">
                        <a :href="ev.virtual_url" target="_blank" rel="noopener" class="text-success">Enlace {{ ev.platform }}</a>
                      </p>
                      <p v-if="ev.address" class="text-xs mb-1"><strong>Lugar:</strong> {{ ev.address }}</p>
                      <p v-if="ev.description" class="text-sm">{{ ev.description }}</p>
                      <p v-if="ev.details" class="text-xs text-secondary">{{ ev.details }}</p>
                      <p v-if="ev.requires_payment" class="text-sm font-weight-bold text-dark mb-2">
                        Entrada: {{ formatBs(ev.entry_cost) }}
                      </p>
                      <argon-button color="success" size="sm" @click="addToCart(ev)">
                        {{ ev.requires_payment ? "Añadir al carrito" : "Inscribirme (gratis)" }}
                      </argon-button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card shadow-sm sticky-top" style="top: 1rem">
            <div class="card-header pb-0">
              <h6 class="mb-0">Carrito de inscripciones</h6>
            </div>
            <div class="card-body">
              <ul v-if="cart.length" class="list-unstyled mb-3">
                <li v-for="item in cart" :key="item.event.id" class="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <span class="text-sm text-dark d-block">{{ item.event.name }}</span>
                    <span class="text-xs text-muted">× {{ item.cantidad }}</span>
                  </div>
                  <div class="text-end">
                    <span class="text-sm font-weight-bold">{{ formatBs(Number(item.event.entry_cost || 0) * item.cantidad) }}</span>
                    <button type="button" class="btn btn-link text-danger btn-sm p-0 d-block" @click="removeFromCart(item.event.id)">Quitar</button>
                  </div>
                </li>
              </ul>
              <p v-else class="text-sm text-muted">Añade eventos para inscribirte.</p>

              <p v-if="cart.length" class="text-sm font-weight-bold mb-3">Total: {{ formatBs(cartTotal) }}</p>

              <div v-if="cartRequiresPayment" class="mb-3">
                <MlmPaymentMethodPanel
                  v-model="paymentMethod"
                  :show-method-select="true"
                  title="Pago de entradas presenciales"
                  @update:receiptFile="paymentReceiptFile = $event"
                />
              </div>

              <argon-button
                color="dark"
                class="w-100"
                :disabled="!canCheckout || checkoutLoading"
                @click="checkout"
              >
                {{ checkoutLoading ? "Procesando…" : "Confirmar inscripción" }}
              </argon-button>
              <p v-if="cartRequiresPayment && !canCheckout && cart.length" class="text-danger text-xs mt-2 mb-0">
                {{ RECEIPT_REQUIRED_MESSAGE }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.eventos-page .badge {
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>
