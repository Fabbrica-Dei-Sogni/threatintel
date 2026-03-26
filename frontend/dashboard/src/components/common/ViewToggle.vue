<template>
  <div class="view-toggle-wrapper" :class="[`theme-${theme}`, { 'is-active': modelValue }]" @click="toggle" :title="label">
    <div class="toggle-container">
      <div class="toggle-track">
        <div class="toggle-handle">
          <div class="led"></div>
        </div>
      </div>
      <span class="toggle-label">{{ label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  label: {
    type: String,
    default: ''
  },
  theme: {
    type: String,
    default: 'magma' // magma, amber, jade
  }
});

const emit = defineEmits(['update:modelValue']);

const toggle = () => {
  emit('update:modelValue', !props.modelValue);
};
</script>

<style scoped>
/* Cyber Toggle Component Styles */
.view-toggle-wrapper {
  cursor: pointer;
  user-select: none;
  display: inline-flex;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  transition: all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
  backdrop-filter: blur(4px);
}

.toggle-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toggle-track {
  width: 36px;
  height: 18px;
  background: #0a0a0a;
  border-radius: 9px;
  position: relative;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.8);
  border: 1px solid rgba(255,255,255,0.05);
}

.toggle-handle {
  width: 14px;
  height: 14px;
  background: linear-gradient(135deg, #444, #222);
  border-radius: 50%;
  position: absolute;
  top: 1px;
  left: 2px;
  transition: transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
  box-shadow: 0 2px 4px rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.led {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #333;
  transition: all 0.3s ease;
}

.toggle-label {
  color: #666;
  transition: all 0.3s ease;
}

/* Active State Styles */
.view-toggle-wrapper.is-active {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 10px rgba(0,0,0,0.5);
}

.view-toggle-wrapper.is-active .toggle-handle {
  transform: translateX(16px);
  background: linear-gradient(135deg, #555, #333);
}

.view-toggle-wrapper.is-active .toggle-label {
  color: #f0f0f0;
  text-shadow: 0 0 5px rgba(255,255,255,0.3);
}

/* Theme color variations for LED and Active state */

/* Theme: Magma (Attacks) */
.theme-magma.is-active .led {
  background: #ff4c4c;
  box-shadow: 0 0 8px #ff4c4c, 0 0 15px rgba(255, 76, 76, 0.6);
}
.theme-magma.is-active {
  border-color: rgba(255, 76, 76, 0.5);
  background: rgba(255, 76, 76, 0.05);
}
.theme-magma:hover {
  border-color: rgba(255, 76, 76, 0.3);
}

/* Theme: Amber (Logs) */
.theme-amber.is-active .led {
  background: #ffb300;
  box-shadow: 0 0 8px #ffb300, 0 0 15px rgba(255, 179, 0, 0.6);
}
.theme-amber.is-active {
  border-color: rgba(255, 179, 0, 0.5);
  background: rgba(255, 179, 0, 0.05);
}
.theme-amber:hover {
  border-color: rgba(255, 179, 0, 0.3);
}

/* Theme: Jade (Sessions) */
.theme-jade.is-active .led {
  background: #00ff41;
  box-shadow: 0 0 8px #00ff41, 0 0 15px rgba(0, 255, 65, 0.6);
}
.theme-jade.is-active {
  border-color: rgba(0, 255, 65, 0.5);
  background: rgba(0, 255, 65, 0.05);
}
.theme-jade:hover {
  border-color: rgba(0, 255, 65, 0.3);
}

/* Hover effects */
.view-toggle-wrapper:hover {
  transform: translateY(-1px);
}
</style>
