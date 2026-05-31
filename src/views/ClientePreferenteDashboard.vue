<script setup>
import { ref, computed, onMounted } from "vue";
import { useStore } from "vuex";
import ArgonButton from "@/components/ArgonButton.vue";
import MlmPaymentMethodPanel from "@/components/MlmPaymentMethodPanel.vue";
import OrderDeliveryPanel from "@/components/OrderDeliveryPanel.vue";
import { fetchProductsCatalog, createOrder, fetchOrders, fetchProfile } from "@/services/me";
import {
  DELIVERY_MODE_PICKUP,
  DELIVERY_MODE_SHIPPING,
  emptyShippingAddress,
  isShippingAddressComplete,
} from "@/constants/deliveryOptions";
import {
  preferentePriceFromProduct,
  publicPriceFromProduct,
  sponsorCommissionFromProduct,
} from "@/utils/preferredCustomerPricing";

const store = useStore();
const loading = ref(true);
const err = ref("");
const productos = ref([]);
const orders = ref([]);
const carrito = ref([]);
const checkoutLoading = ref(false);
const checkoutMsg = ref("");
const paymentMethod = ref("transferencia");
const deliveryMode = ref(DELIVERY_MODE_PICKUP);
const shippingAddress = ref(emptyShippingAddress());

function loadFallbackImages() {
  try {
    // eslint-disable-next-line no-undef
    const ctx = require.context("@/assets/img/productos", false, /\.(png|jpe?g|webp)$/i);
    const list = ctx.keys().map((k) => ({ key: k, src: ctx(k) }));
    const num = (k) => {
      const m = String(k).match(/(\d+)\.(png|jpe?g|webp)$/i);
      return m ? parseInt(m[1], 10) : Number.POSITIVE_INFINITY;
    };
    return list
      .sort((a, b) => num(a.key) - num(b.key))
      .map((x) => (typeof x.src === "string" ? x.src : x.src?.default || x.src));
  } catch {
    return [];
  }
}
const FALLBACK_IMAGES = loadFallbackImages();

function imageFor(p, index) {
  if (p.image_url) return p.image_url;
  if (!FALLBACK_IMAGES.length) return "";
  return FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
}

function mapProducto(p, index) {
  const precioPublico = publicPriceFromProduct(p);
  const precioPreferente = preferentePriceFromProduct(p);
  const comisionSocio = sponsorCommissionFromProduct(p);
  return {
    ...p,
    image_ui: imageFor(p, index),
    precio_publico: precioPublico,
    precio_preferente: precioPreferente,
    comision_socio: comisionSocio,
    precio_socio: Number(p.precio_socio ?? p.price ?? 0),
  };
}

const paymentSettlement = computed(() =>
  ["tarjeta", "online"].includes(paymentMethod.value) ? "immediate" : "manual"
);

const totalCarrito = computed(() =>
  carrito.value.reduce((s, it) => s + Number(it.precio) * Number(it.cantidad), 0)
);

const canCheckout = computed(() => {
  if (!carrito.value.length) return false;
  if (deliveryMode.value === DELIVERY_MODE_SHIPPING) {
    return isShippingAddressComplete(shippingAddress.value);
  }
  return true;
});

function addToCart(p) {
  const precio = Number(p.precio_preferente ?? preferentePriceFromProduct(p));
  const ex = carrito.value.find((x) => x.id === p.id);
  if (ex) {
    ex.cantidad += 1;
  } else {
    carrito.value.push({
      id: p.id,
      name: p.name,
      precio,
      precio_publico: Number(p.precio_publico ?? publicPriceFromProduct(p)),
      pv_points: Number(p.pv_points || 0),
      cantidad: 1,
    });
  }
}

function removeOne(id) {
  const ex = carrito.value.find((x) => x.id === id);
  if (!ex) return;
  ex.cantidad -= 1;
  if (ex.cantidad <= 0) {
    carrito.value = carrito.value.filter((x) => x.id !== id);
  }
}

async function load() {
  loading.value = true;
  err.value = "";
  try {
    const [cat, ord, prof] = await Promise.all([
      fetchProductsCatalog(),
      fetchOrders({ per_page: 10 }),
      fetchProfile(),
    ]);
    const rows = (cat.data || []).slice().sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
    productos.value = rows.map((p, i) => mapProducto(p, i));
    orders.value = ord.data || [];
    await store.dispatch("auth/setAuth", {
      user: prof,
      token: localStorage.getItem("token"),
    });
  } catch {
    err.value = "No se pudo cargar el catálogo o tus pedidos.";
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function checkout() {
  if (!canCheckout.value) return;
  checkoutLoading.value = true;
  checkoutMsg.value = "";
  try {
    const payload = {
      tipo: "producto",
      payment_settlement: paymentSettlement.value,
      payment_method: paymentMethod.value,
      delivery_mode: deliveryMode.value,
      items: carrito.value.map((it) => ({
        product_id: it.id,
        cantidad: it.cantidad,
      })),
    };
    if (deliveryMode.value === DELIVERY_MODE_SHIPPING) {
      payload.shipping_departamento = shippingAddress.value.departamento.trim();
      payload.shipping_ciudad = shippingAddress.value.ciudad.trim();
      payload.shipping_direccion = shippingAddress.value.direccion.trim();
    }
    const order = await createOrder(payload);
    carrito.value = [];
    deliveryMode.value = DELIVERY_MODE_PICKUP;
    shippingAddress.value = emptyShippingAddress();
    checkoutMsg.value =
      order?.estado === "pendiente_pago"
        ? "Pedido registrado como pendiente de pago. La empresa confirmará según tu método (transferencia, QR, etc.)."
        : order?.invoice?.numero_factura
          ? `Compra registrada. Factura: ${order.invoice.numero_factura}.`
          : "Compra registrada. Tu factura se generará al confirmar el pago.";
    await load();
  } catch (e) {
    checkoutMsg.value = e.response?.data?.message || "Error al crear el pedido.";
  } finally {
    checkoutLoading.value = false;
  }
}

function formatBs(n) {
  return new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format(Number(n) || 0);
}
</script>

<template>
  <div class="py-4 container-fluid">
    <div class="row mb-4">
      <div class="col-12">
        <h4 class="text-dark font-weight-bolder">Cliente preferente</h4>
        <p class="text-sm text-secondary mb-0">
          Precios con <strong>10% de descuento</strong> sobre el precio público. Tu patrocinador recibe en su billetera
          el <strong>10% del precio público</strong> por cada producto; el resto cubre costos de producto, envío y
          administración.
        </p>
      </div>
    </div>

    <div v-if="err" class="alert alert-warning text-white">{{ err }}</div>
    <div v-if="checkoutMsg" class="alert alert-success text-white">{{ checkoutMsg }}</div>

    <div class="row">
      <div class="col-lg-8">
        <div class="card shadow-sm mb-4">
          <div class="card-header pb-0">
            <h6 class="mb-0">Productos</h6>
          </div>
          <div class="card-body">
            <div v-if="loading" class="text-muted text-sm">Cargando…</div>
            <div v-else class="row g-3">
              <div v-for="p in productos" :key="p.id" class="col-md-6">
                <div class="card h-100 border">
                  <div v-if="p.image_ui" class="position-relative overflow-hidden rounded-top" style="height: 160px">
                    <img :src="p.image_ui" :alt="p.name" class="w-100 h-100" style="object-fit: cover" loading="lazy" />
                  </div>
                  <div class="card-body p-3">
                    <h6 class="mb-1">{{ p.name }}</h6>
                    <p class="text-xs text-muted mb-2 text-truncate-3" style="min-height: 2.5rem">
                      {{ p.description }}
                    </p>
                    <div class="mb-2">
                      <span class="text-xxs text-muted d-block">Precio público</span>
                      <span class="text-sm text-secondary text-decoration-line-through">{{ formatBs(p.precio_publico) }}</span>
                    </div>
                    <p class="text-sm font-weight-bold text-success mb-1">
                      Tu precio (−10%): {{ formatBs(p.precio_preferente) }}
                    </p>
                    <p class="text-xxs text-muted mb-2">Bono patrocinador: {{ formatBs(p.comision_socio) }} / ud.</p>
                    <argon-button color="success" size="sm" @click="addToCart(p)">Agregar</argon-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card shadow-sm">
          <div class="card-header pb-0">
            <h6 class="mb-0">Últimas compras</h6>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table mb-0">
                <thead>
                  <tr>
                    <th class="text-xs">#</th>
                    <th class="text-xs">Estado</th>
                    <th class="text-xs">Total</th>
                    <th class="text-xs">Factura</th>
                    <th class="text-xs">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="o in orders" :key="o.id">
                    <td class="text-sm">{{ o.id }}</td>
                    <td class="text-sm">{{ o.estado }}</td>
                    <td class="text-sm">{{ formatBs(o.total) }}</td>
                    <td class="text-xs">{{ o.invoice?.numero_factura || (o.estado === "completado" ? "—" : "") }}</td>
                    <td class="text-sm">{{ o.completed_at || o.created_at }}</td>
                  </tr>
                  <tr v-if="!orders.length">
                    <td colspan="5" class="text-center text-muted text-sm py-3">Aún no hay compras.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card shadow-sm position-sticky" style="top: 1rem">
          <div class="card-header pb-0">
            <h6 class="mb-0">Carrito</h6>
          </div>
          <div class="card-body">
            <ul v-if="carrito.length" class="list-group list-group-flush mb-3">
              <li
                v-for="it in carrito"
                :key="it.id"
                class="list-group-item d-flex justify-content-between align-items-center px-0"
              >
                <span class="text-sm"
                  >{{ it.name }} × {{ it.cantidad }} · {{ formatBs(it.precio * it.cantidad) }}</span
                >
                <button type="button" class="btn btn-link text-danger btn-sm p-0" @click="removeOne(it.id)">−</button>
              </li>
            </ul>
            <p v-else class="text-sm text-muted">Vacío</p>
            <p v-if="carrito.length" class="text-sm font-weight-bold">Total: {{ formatBs(totalCarrito) }}</p>
            <div v-if="carrito.length" class="mb-3">
              <OrderDeliveryPanel
                v-model="deliveryMode"
                :departamento="shippingAddress.departamento"
                :ciudad="shippingAddress.ciudad"
                :direccion="shippingAddress.direccion"
                @update:departamento="shippingAddress.departamento = $event"
                @update:ciudad="shippingAddress.ciudad = $event"
                @update:direccion="shippingAddress.direccion = $event"
              />
            </div>
            <div v-if="carrito.length" class="mb-3">
              <MlmPaymentMethodPanel
                v-model="paymentMethod"
                :show-method-select="true"
                title="Pago y entrega"
              />
            </div>
            <argon-button
              color="dark"
              class="w-100"
              :disabled="!canCheckout || checkoutLoading"
              @click="checkout"
            >
              {{ checkoutLoading ? "Procesando…" : "Confirmar pedido" }}
            </argon-button>
            <p
              v-if="carrito.length && deliveryMode === DELIVERY_MODE_SHIPPING && !canCheckout"
              class="text-danger text-xs mt-2 mb-0"
            >
              Completa departamento, ciudad y dirección para continuar.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
