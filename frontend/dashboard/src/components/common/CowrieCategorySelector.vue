<template>
  <div class="cowrie-category-selector" :class="size">
    <button 
      class="cyber-chip" 
      :class="{ active: modelValue === '' }" 
      @click="$emit('update:modelValue', '')"
    >
      {{ $t('cowrie.sessions.filters.all') }}
    </button>
    <button 
      class="cyber-chip scanner" 
      :class="{ active: modelValue === 'scanner' }" 
      @click="$emit('update:modelValue', 'scanner')"
      :title="$t('cowrie.sessions.filters.scannerDesc')"
    >
      <span class="dot"></span> {{ $t('cowrie.sessions.filters.scanner') }}
    </button>
    <button 
      class="cyber-chip interaction" 
      :class="{ active: modelValue === 'interaction' }" 
      @click="$emit('update:modelValue', 'interaction')"
      :title="$t('cowrie.sessions.filters.interactionDesc')"
    >
      <span class="dot"></span> {{ $t('cowrie.sessions.filters.interaction') }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    required: true
  },
  size: {
    type: String,
    default: 'normal'
  }
});

defineEmits(['update:modelValue']);
</script>

<style scoped>
.cowrie-category-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.cowrie-category-selector.mini {
  gap: 6px;
}

.cyber-chip {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(0, 255, 65, 0.3);
  color: #F0FAD0;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-family: 'JetBrains Mono', monospace;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.mini .cyber-chip {
  padding: 4px 10px;
  font-size: 0.7rem;
  letter-spacing: 0.2px;
}

.cyber-chip .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 5px currentColor;
}

.mini .cyber-chip .dot {
  width: 4px;
  height: 4px;
}

.cyber-chip:hover {
  background: rgba(0, 255, 65, 0.1);
  box-shadow: 0 0 10px rgba(0, 255, 65, 0.2);
  transform: translateY(-1px);
}

.cyber-chip.active {
  background: rgba(0, 255, 65, 0.2);
  border-color: #00FF41;
  color: #00FF41;
  box-shadow: 0 0 15px rgba(0, 255, 65, 0.3);
}

/* Category specific colors */
.cyber-chip.scanner { 
  border-color: rgba(148, 163, 184, 0.3); 
  color: #94a3b8; 
}
.cyber-chip.scanner.active { 
  border-color: #94a3b8; 
  background: rgba(148, 163, 184, 0.1); 
  box-shadow: 0 0 10px rgba(148, 163, 184, 0.2);
}

.cyber-chip.interaction { 
  border-color: rgba(6, 182, 212, 0.3); 
  color: #06b6d4; 
}
.cyber-chip.interaction.active { 
  border-color: #06b6d4; 
  background: rgba(6, 182, 212, 0.1); 
  box-shadow: 0 0 10px rgba(6, 182, 212, 0.2);
}
</style>
