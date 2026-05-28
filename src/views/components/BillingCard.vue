<template>
  <div class="card border-0 shadow-sm">
    <div class="card-header pb-0 d-flex flex-wrap justify-content-between align-items-center gap-2">
      <div>
        <h6 class="mb-0 text-dark">Mis facturas</h6>
        <p class="text-xs text-muted mb-0">Productos, paquetes de inicio y compras como cliente preferente.</p>
      </div>
      <button type="button" class="btn btn-sm btn-outline-primary" :disabled="loading" @click="load">
        {{ loading ? "Cargando…" : "Actualizar" }}
      </button>
    </div>
    <div class="card-body">
      <div v-if="error" class="alert alert-warning text-white text-sm py-2">{{ error }}</div>

      <div v-if="!loading && invoices.length === 0" class="text-sm text-muted py-3">
        Aún no tienes facturas. Se generan automáticamente al completar un pedido.
      </div>

      <div v-else class="table-responsive">
        <table class="table align-items-center mb-0">
          <thead>
            <tr>
              <th class="text-xs text-uppercase text-muted">Nº factura</th>
              <th class="text-xs text-uppercase text-muted">Pedido</th>
              <th class="text-xs text-uppercase text-muted">Total</th>
              <th class="text-xs text-uppercase text-muted">Electrónica</th>
              <th class="text-xs text-uppercase text-muted">Fecha</th>
              <th class="text-xs text-uppercase text-muted text-end">Detalle</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="inv in invoices" :key="inv.id">
              <td class="text-sm fw-semibold">{{ inv.numero_factura }}</td>
              <td class="text-sm">#{{ inv.order_id }}</td>
              <td class="text-sm">{{ formatBs(inv.total) }}</td>
              <td class="text-xs">
                <span class="badge" :class="electronicBadgeClass(inv.electronic_invoice_status)">
                  {{ electronicLabel(inv.electronic_invoice_status) }}
                </span>
                <span v-if="inv.cuf" class="d-block text-muted mt-1" :title="inv.cuf">CUF: {{ shortCuf(inv.cuf) }}</span>
              </td>
              <td class="text-xs text-muted">{{ inv.fecha_emision || formatDate(inv.created_at) }}</td>
              <td class="text-end">
                <button type="button" class="btn btn-link btn-sm p-0" @click="openDetail(inv.id)">Ver</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="detail" class="mt-4 p-3 border rounded-3 bg-light">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <h6 class="mb-0 text-dark">{{ detail.numero_factura }}</h6>
          <button type="button" class="btn-close btn-sm" aria-label="Cerrar" @click="detail = null" />
        </div>
        <p class="text-xs text-muted mb-2">
          Cliente: {{ detail.customer_business_name }}
          <span v-if="detail.customer_document"> · CI/NIT {{ detail.customer_document }}</span>
        </p>
        <ul class="list-unstyled text-sm mb-2">
          <li v-for="line in detail.items || []" :key="line.id" class="d-flex justify-content-between py-1 border-bottom">
            <span>{{ line.descripcion }} × {{ line.cantidad }}</span>
            <span>{{ formatBs(line.total_precio) }}</span>
          </li>
        </ul>
        <p class="text-sm mb-0 fw-bold text-end">
          Total: {{ formatBs(detail.total) }}
          <span v-if="Number(detail.tax_amount) > 0" class="text-muted fw-normal">
            (IVA {{ formatBs(detail.tax_amount) }})
          </span>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { fetchMyInvoice, fetchMyInvoices } from "@/services/invoices";

const loading = ref(false);
const error = ref("");
const invoices = ref([]);
const detail = ref(null);

function formatBs(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB", minimumFractionDigits: 2 }).format(n);
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-BO");
  } catch {
    return iso;
  }
}

function shortCuf(cuf) {
  const s = String(cuf || "");
  return s.length > 18 ? `${s.slice(0, 10)}…${s.slice(-6)}` : s;
}

function electronicLabel(status) {
  const map = {
    issued: "Emitida",
    sent: "Enviada",
    accepted: "Aceptada",
    local_only: "Local",
    pending_integration: "Pendiente SIN",
    failed: "Error SIN",
  };
  return map[status] || status || "—";
}

function electronicBadgeClass(status) {
  if (["issued", "sent", "accepted", "local_only"].includes(status)) return "bg-gradient-success";
  if (status === "failed") return "bg-gradient-danger";
  return "bg-gradient-secondary";
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const res = await fetchMyInvoices({ per_page: 50 });
    invoices.value = res.data || [];
  } catch {
    error.value = "No se pudieron cargar las facturas.";
    invoices.value = [];
  } finally {
    loading.value = false;
  }
}

async function openDetail(id) {
  try {
    detail.value = await fetchMyInvoice(id);
  } catch {
    error.value = "No se pudo cargar el detalle de la factura.";
  }
}

onMounted(load);
</script>
