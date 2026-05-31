<script setup>
import { computed } from "vue";
import {
  DELIVERY_MODE_PICKUP,
  DELIVERY_MODE_SHIPPING,
  MEMBER_SHIPPING_COST_BOB,
  deliveryNoticeFor,
} from "@/constants/deliveryOptions";

const props = defineProps({
  modelValue: {
    type: String,
    default: DELIVERY_MODE_PICKUP,
  },
  departamento: {
    type: String,
    default: "",
  },
  ciudad: {
    type: String,
    default: "",
  },
  direccion: {
    type: String,
    default: "",
  },
  /** Si true, muestra el cargo de envío (socios). */
  showShippingCost: {
    type: Boolean,
    default: false,
  },
  shippingCostBob: {
    type: Number,
    default: MEMBER_SHIPPING_COST_BOB,
  },
});

const emit = defineEmits([
  "update:modelValue",
  "update:departamento",
  "update:ciudad",
  "update:direccion",
]);

const mode = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const dep = computed({
  get: () => props.departamento,
  set: (v) => emit("update:departamento", v),
});

const city = computed({
  get: () => props.ciudad,
  set: (v) => emit("update:ciudad", v),
});

const addr = computed({
  get: () => props.direccion,
  set: (v) => emit("update:direccion", v),
});

const isShipping = computed(() => mode.value === DELIVERY_MODE_SHIPPING);

const deliveryNotice = computed(() => {
  if (!isShipping.value) {
    return "Recojo personal: coordina la entrega con tu patrocinador o en el punto acordado.";
  }
  return deliveryNoticeFor(dep.value, city.value);
});

function formatBs(n) {
  return new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format(Number(n) || 0);
}
</script>

<template>
  <div class="order-delivery-panel">
    <label class="form-label text-sm mb-1">Forma de entrega</label>
    <div class="d-flex flex-wrap gap-3 mb-3">
      <label class="form-check mb-0">
        <input v-model="mode" class="form-check-input" type="radio" :value="DELIVERY_MODE_PICKUP" />
        <span class="form-check-label text-sm">Recojo personal</span>
      </label>
      <label class="form-check mb-0">
        <input v-model="mode" class="form-check-input" type="radio" :value="DELIVERY_MODE_SHIPPING" />
        <span class="form-check-label text-sm">Envío a domicilio</span>
      </label>
    </div>

    <div v-if="isShipping" class="border rounded-3 p-3 bg-light mb-3">
      <div class="row g-2">
        <div class="col-md-4">
          <label class="form-label text-xs mb-1">Departamento</label>
          <input v-model.trim="dep" type="text" class="form-control form-control-sm" placeholder="Ej. Santa Cruz" />
        </div>
        <div class="col-md-4">
          <label class="form-label text-xs mb-1">Ciudad</label>
          <input v-model.trim="city" type="text" class="form-control form-control-sm" placeholder="Ej. Santa Cruz de la Sierra" />
        </div>
        <div class="col-md-12">
          <label class="form-label text-xs mb-1">Dirección</label>
          <input
            v-model.trim="addr"
            type="text"
            class="form-control form-control-sm"
            placeholder="Calle, zona, referencia"
          />
        </div>
      </div>
      <p v-if="showShippingCost" class="text-xs text-muted mb-0 mt-2">
        Costo de envío: <strong>{{ formatBs(shippingCostBob) }}</strong> (se suma al total del pedido).
      </p>
    </div>

    <div class="alert alert-secondary border-0 text-dark text-xs mb-0 py-2">
      <i class="ni ni-delivery-fast me-1 text-success" aria-hidden="true"></i>
      <strong>Plazo de entrega:</strong> {{ deliveryNotice }}
    </div>
  </div>
</template>

<style scoped>
.order-delivery-panel .alert {
  line-height: 1.45;
}
</style>
