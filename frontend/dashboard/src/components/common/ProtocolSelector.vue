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
    <div class="protocol-selector" :class="[`skin-${currentSkin}`]">
        <div :class="['options', `theme-${theme}`]">
            <button v-for="option in options" :key="option" :class="['option-btn', { active: modelValue === option }]"
                @click="selectProtocol(option)">
                {{ option.toUpperCase() }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useViewSettingsStore } from '../../stores/viewSettings';

const props = defineProps({
    modelValue: {
        type: String,
        default: "http",
    },
    options: {
        type: Array as () => string[],
        default: () => ["http", "ssh", "https"],
    },
    theme: {
        type: String,
        default: "dark", // Default to dark for better general compatibility
        validator: (value: string) => ["light", "dark", "magma", "amber", "phosphorus"].includes(value),
    },
});

const emit = defineEmits(["update:modelValue"]);

const viewStore = useViewSettingsStore();
const currentSkin = computed(() => viewStore.dashboardSkin);

function selectProtocol(proto: string) {
    if (props.modelValue !== proto) {
        emit("update:modelValue", proto);
    }
}
</script>

<style scoped>
.protocol-selector {
    display: flex;
    align-items: center;
}

.options {
    display: flex;
    background-color: var(--proto-bg, #f0f0f0);
    border-radius: 8px;
    padding: 4px;
    gap: 4px;
    border: 1px solid var(--proto-border, transparent);
    transition: all 0.3s ease;
}

.option-btn {
    border: none;
    background: transparent;
    padding: 4px 10px;
    cursor: pointer;
    border-radius: 6px;
    color: var(--proto-text, #666);
    transition: all 0.2s ease;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    font-family: inherit;
}

.option-btn:hover {
    background-color: var(--proto-hover-bg, rgba(0, 0, 0, 0.05));
    color: var(--proto-hover-text, inherit);
}

.option-btn.active {
    background-color: var(--proto-active-bg, #fff);
    color: var(--proto-active-text, #e63946);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* === AGNOSTIC THEME ENGINE === */
.skin-cyber .options,
.skin-classic .options {
    --proto-bg: var(--theme-surface, rgba(15, 23, 42, 0.3));
    --proto-border: var(--theme-border, rgba(95, 165, 255, 0.12));
    --proto-text: var(--theme-text-muted, #94a3b8);
    --proto-hover-bg: rgba(var(--theme-primary-rgb, 95, 165, 255), 0.1);
    --proto-hover-text: var(--theme-primary, #5FA5FF);
    --proto-active-bg: var(--theme-primary, #5FA5FF);
    --proto-active-text: var(--theme-bg, #0B111B);
    
    border-radius: var(--theme-radius, 4px);
    backdrop-filter: var(--theme-blur, blur(8px));
}

.skin-cyber .option-btn,
.skin-classic .option-btn {
    font-family: var(--font-cyber-mono, 'JetBrains Mono', monospace);
    border-radius: 2px;
    letter-spacing: 0.5px;
}

.skin-cyber .option-btn.active,
.skin-classic .option-btn.active {
    box-shadow: 0 0 12px rgba(var(--theme-primary-rgb, 0, 255, 255), 0.4);
}

/* === THEME OVERRIDES (Backward Compatibility) === */

/* Dark Theme */
.options.theme-dark:not(.skin-cyber .options) {
    --proto-bg: rgba(0, 30, 60, 0.5);
    --proto-border: rgba(255, 255, 255, 0.1);
    --proto-text: #b0c4de;
    --proto-active-bg: #0056b3;
    --proto-active-text: #ffffff;
}

/* Magma Theme */
.options.theme-magma {
    --proto-bg: #2b1b17;
    --proto-border: #4f3b33;
    --proto-text: #e0bbbb;
    --proto-active-bg: #d93025;
    --proto-active-text: #ffffff;
}

/* Amber Theme */
.options.theme-amber {
    --proto-bg: rgba(26, 20, 10, 0.6);
    --proto-border: rgba(255, 179, 0, 0.3);
    --proto-text: #cbb8a5;
    --proto-active-bg: #FF8F00;
    --proto-active-text: #0A0605;
}

/* Phosphorus Theme (Green/Cyber) */
.options.theme-phosphorus {
    --proto-bg: rgba(10, 25, 12, 0.6);
    --proto-border: rgba(0, 255, 65, 0.3);
    --proto-text: #b8cbb5;
    --proto-active-bg: #00FF41;
    --proto-active-text: #050a06;
}
</style>
