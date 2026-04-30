<!--
  ThreatIntel - Reference Implementation Dashboard
  
  This frontend application is provided as a reference implementation of the 
  ThreatIntel Distributed Forensics Engine. 
  
  Copyright (C) 2026 Alessandro Modica. All rights reserved.
  
  Use of this frontend for educational, research, and non-commercial purposes 
  is permitted. Production or commercial use of this specific dashboard 
  interface requires a valid commercial license from the author.
  
  See root LICENSE.md for core engine licensing details.
-->
<template>
  <span class="animated-number" :class="{ 'is-animating': isAnimating }">{{ displayValue }}</span>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

const props = defineProps({
  value: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    default: 1000
  },
  decimals: {
    type: Number,
    default: 0
  }
});

const displayValue = ref('');
const isAnimating = ref(false);

const startAnimation = () => {
  isAnimating.value = true;
  
  const startTime = performance.now();
  const targetValue = props.value;
  const targetStr = targetValue.toFixed(props.decimals);
  
  const update = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / props.duration, 1);
    
    if (progress < 1) {
      // Effetto "Slot Machine / Scramble" digitale
      let currentStr = '';
      for (let i = 0; i < targetStr.length; i++) {
        const char = targetStr[i];
        if (char === '.' || char === ',') {
          currentStr += char;
        } else if (Math.random() > progress * 1.5) { // Lo sfarfallio rallenta verso la fine
          currentStr += Math.floor(Math.random() * 10).toString();
        } else {
          currentStr += char;
        }
      }
      displayValue.value = currentStr;
      requestAnimationFrame(update);
    } else {
      displayValue.value = targetStr;
      isAnimating.value = false;
    }
  };
  
  requestAnimationFrame(update);
};

onMounted(startAnimation);

watch(() => props.value, (newVal, oldVal) => {
    if (newVal !== oldVal) {
        startAnimation();
    }
});
</script>

<style scoped>
.animated-number {
  font-variant-numeric: tabular-nums;
  display: inline-block;
  transition: all 0.3s ease;
}

.is-animating {
  color: var(--theme-primary, #00FF41);
  text-shadow: 0 0 8px rgba(var(--theme-primary-rgb, 0, 255, 65), 0.6);
  filter: brightness(1.2);
}
</style>
