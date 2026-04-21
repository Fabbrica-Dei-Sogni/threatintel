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
        validator: (value: string) => ["light", "dark", "magma", "amber"].includes(value),
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

/* === SKIN CYBER === */
.skin-cyber .options {
    --proto-bg: rgba(0, 20, 40, 0.4);
    --proto-border: rgba(0, 255, 255, 0.15);
    --proto-text: rgba(0, 255, 255, 0.5);
    --proto-hover-bg: rgba(0, 255, 255, 0.1);
    --proto-hover-text: #00ffff;
    --proto-active-bg: #00ffff;
    --proto-active-text: #0a0e17;
    border-radius: 4px;
    backdrop-filter: blur(4px);
}

.skin-cyber .option-btn {
    font-family: 'JetBrains Mono', monospace;
    border-radius: 2px;
    letter-spacing: 0.5px;
}

.skin-cyber .option-btn.active {
    box-shadow: 0 0 12px rgba(0, 255, 255, 0.4);
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
</style>
