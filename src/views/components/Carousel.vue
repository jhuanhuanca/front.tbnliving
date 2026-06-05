<script setup>
import { computed } from "vue";

const props = defineProps({
  events: {
    type: Array,
    default: () => [],
  },
});

const slides = computed(() => {
  if (props.events?.length) {
    return props.events.map((ev) => ({
      id: ev.id,
      title: ev.name,
      text: ev.description || ev.details || "",
      speaker: ev.speaker,
      schedule: ev.starts_at,
      image: ev.flyer_url,
      badge: ev.kind === "virtual"
        ? ev.platform === "zoom"
          ? "Virtual · Zoom"
          : "Virtual · YouTube"
        : "Presencial",
    }));
  }

  return [
    {
      id: "fallback-1",
      title: "Eventos y capacitaciones",
      text: "Consulta el calendario de eventos virtuales y presenciales.",
      image: null,
      badge: "TBN Living",
    },
  ];
});

const carouselId = "carouselEventosTbn";
</script>

<template>
  <div class="card card-carousel overflow-hidden h-100 p-0">
    <div :id="carouselId" class="carousel slide h-100" data-bs-ride="carousel">
      <div class="carousel-inner border-radius-lg h-100">
        <div
          v-for="(slide, idx) in slides"
          :key="slide.id"
          class="carousel-item h-100"
          :class="{ active: idx === 0 }"
          :style="
            slide.image
              ? {
                  backgroundImage: `url(${slide.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : {
                  background: 'linear-gradient(135deg, #16a34a 0%, #14532d 100%)',
                }
          "
        >
          <div class="carousel-caption d-none d-md-block bottom-0 text-start start-0 ms-5">
            <div class="icon icon-shape icon-sm bg-white text-center border-radius-md mb-3">
              <i class="ni ni-calendar-grid-58 text-dark opacity-10"></i>
            </div>
            <span class="badge bg-white text-success text-xs mb-2">{{ slide.badge }}</span>
            <h5 class="text-white mb-1">{{ slide.title }}</h5>
            <p class="text-white text-sm opacity-9 mb-0">
              {{ slide.text }}
            </p>
            <p v-if="slide.speaker" class="text-white text-xs mt-1 mb-0 opacity-8">
              {{ slide.speaker }}
            </p>
          </div>
        </div>
      </div>
      <button
        v-if="slides.length > 1"
        class="carousel-control-prev w-5 me-3"
        type="button"
        :data-bs-target="'#' + carouselId"
        data-bs-slide="prev"
      >
        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Anterior</span>
      </button>
      <button
        v-if="slides.length > 1"
        class="carousel-control-next w-5 me-3"
        type="button"
        :data-bs-target="'#' + carouselId"
        data-bs-slide="next"
      >
        <span class="carousel-control-next-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Siguiente</span>
      </button>
    </div>
  </div>
</template>
