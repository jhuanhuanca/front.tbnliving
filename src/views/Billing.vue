<script setup>
import BillingCard from "./components/BillingCard.vue";
</script>

<template>
  <div class="container-fluid py-4">
    <div class="row mb-3">
      <div class="col-12">
        <h4 class="text-dark font-weight-bolder mb-1">Facturación</h4>
        <p class="text-sm text-secondary mb-0">
          Facturas de productos, paquetes de inicio y compras como cliente preferente. Si está activa la integración
          con impuestos, verás el estado electrónico y el CUF.
        </p>
      </div>
    </div>
    <div class="row">
      <div class="col-12">
        <billing-card />
      </div>
    </div>
  </div>
</template>
