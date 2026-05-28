<script setup>
import { computed, ref } from "vue";

const emit = defineEmits(["update:modelValue"]);

const props = defineProps({
  size: {
    type: String,
    default: "default",
  },
  success: {
    type: Boolean,
    default: false,
  },
  error: {
    type: Boolean,
    default: false,
  },
  icon: {
    type: String,
    default: "",
  },
  iconDir: {
    type: String,
    default: "",
  },
  name: {
    type: String,
    default: "",
  },
  id: {
    type: String,
    default: "",
  },
  modelValue: {
    type: String,
    default: "",
  },
  placeholder: {
    type: String,
    default: "",
  },
  type: {
    type: String,
    default: "text",
  },
  isRequired: {
    type: Boolean,
    default: false,
  },
  autocomplete: {
    type: String,
    default: undefined,
  },
  autocapitalize: {
    type: String,
    default: undefined,
  },
  spellcheck: {
    type: [Boolean, String],
    default: undefined,
  },
  showPasswordToggle: {
    type: Boolean,
    default: false,
  },
});

const showPassword = ref(false);

const inputType = computed(() => {
  if (props.type !== "password" || !props.showPasswordToggle) {
    return props.type;
  }
  return showPassword.value ? "text" : "password";
});

function togglePasswordVisibility() {
  showPassword.value = !showPassword.value;
}

const getClasses = (size, success, error) => {
  let sizeValue, isValidValue;

  sizeValue = size ? `form-control-${size}` : null;

  if (error) {
    isValidValue = "is-invalid";
  } else if (success) {
    isValidValue = "is-valid";
  } else {
    isValidValue = "";
  }

  return `${sizeValue} ${isValidValue}`;
};
const getIcon = (icon) => (icon ? icon : null);
const hasIcon = (icon) => (icon ? "input-group" : null);
</script>
<template>
  <div class="form-group">
    <div :class="hasIcon(icon) || (showPasswordToggle && type === 'password') ? 'input-group' : null">
      <span v-if="iconDir === 'left'" class="input-group-text">
        <i :class="getIcon(icon)"></i>
      </span>
      <input
        :id="id"
        :type="inputType"
        class="form-control"
        :class="getClasses(size, success, error)"
        :name="name"
        :value="modelValue"
        :placeholder="placeholder"
        :isRequired="isRequired"
        :autocomplete="autocomplete"
        :autocapitalize="autocapitalize"
        :spellcheck="spellcheck"
        @input="emit('update:modelValue', $event.target.value)"
      />
      <button
        v-if="showPasswordToggle && type === 'password'"
        type="button"
        class="input-group-text bg-white border-start-0"
        :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
        tabindex="-1"
        @click="togglePasswordVisibility"
      >
        <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'" />
      </button>
      <span v-else-if="iconDir === 'right'" class="input-group-text">
        <i :class="getIcon(icon)"></i>
      </span>
    </div>
  </div>
</template>
