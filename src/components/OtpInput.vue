<template>
  <div class="otp-input d-flex justify-content-center gap-2">
    <input
      v-for="(_, index) in digits"
      :key="index"
      :ref="(el) => setInputRef(el, index)"
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      maxlength="1"
      class="form-control otp-input__cell text-center fw-bold"
      :class="{ 'is-invalid': invalid }"
      :value="digits[index]"
      :aria-label="`Dígito ${index + 1}`"
      @input="onInput($event, index)"
      @keydown="onKeydown($event, index)"
      @paste="onPaste"
    />
  </div>
</template>

<script setup>
import { nextTick, ref, watch } from "vue";

const props = defineProps({
  modelValue: { type: String, default: "" },
  length: { type: Number, default: 6 },
  invalid: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const digits = ref(Array.from({ length: props.length }, () => ""));
const inputRefs = ref([]);

function setInputRef(el, index) {
  if (el) inputRefs.value[index] = el;
}

watch(
  () => props.modelValue,
  (val) => {
    const chars = String(val || "")
      .replace(/\D/g, "")
      .slice(0, props.length)
      .split("");
    digits.value = Array.from({ length: props.length }, (_, i) => chars[i] || "");
  },
  { immediate: true }
);

function emitValue() {
  emit("update:modelValue", digits.value.join(""));
}

function onInput(event, index) {
  const raw = event.target.value.replace(/\D/g, "");
  const char = raw.slice(-1);
  digits.value[index] = char;
  emitValue();
  if (char && index < props.length - 1) {
    nextTick(() => inputRefs.value[index + 1]?.focus());
  }
}

function onKeydown(event, index) {
  if (event.key === "Backspace" && !digits.value[index] && index > 0) {
    inputRefs.value[index - 1]?.focus();
  }
  if (event.key === "ArrowLeft" && index > 0) {
    inputRefs.value[index - 1]?.focus();
  }
  if (event.key === "ArrowRight" && index < props.length - 1) {
    inputRefs.value[index + 1]?.focus();
  }
}

function onPaste(event) {
  event.preventDefault();
  const pasted = (event.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0, props.length);
  if (!pasted) return;
  digits.value = Array.from({ length: props.length }, (_, i) => pasted[i] || "");
  emitValue();
  const focusIndex = Math.min(pasted.length, props.length - 1);
  nextTick(() => inputRefs.value[focusIndex]?.focus());
}

defineExpose({
  focusFirst() {
    nextTick(() => inputRefs.value[0]?.focus());
  },
});
</script>

<style scoped>
.otp-input__cell {
  width: 2.75rem;
  height: 3rem;
  font-size: 1.25rem;
  border-radius: 0.5rem;
}
@media (max-width: 400px) {
  .otp-input__cell {
    width: 2.35rem;
    height: 2.75rem;
    font-size: 1.1rem;
  }
}
</style>
