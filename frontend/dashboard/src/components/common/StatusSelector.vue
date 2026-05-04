<template>
    <div class="status-selector" :class="[`skin-${currentSkin}`]">
        <div :class="['options', `theme-${theme}`]">
            <button v-for="option in options" :key="option.value" 
                :class="['option-btn', { active: modelValue === option.value }, `status-${option.value}`]"
                @click="selectStatus(option.value)"
                :title="option.label">
                {{ option.label.toUpperCase() }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useViewSettingsStore } from '../../stores/viewSettings';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
    modelValue: {
        type: String,
        default: "active",
    },
    theme: {
        type: String,
        default: "dark",
        validator: (value: string) => ["light", "dark", "magma", "amber", "phosphorus"].includes(value),
    },
});

const options = computed(() => [
    { value: 'active', label: t('common.status_active') },
    { value: 'archived', label: t('common.status_archived') },
    { value: 'deleted', label: t('common.status_deleted') }
]);

const emit = defineEmits(["update:modelValue"]);

const viewStore = useViewSettingsStore();
const currentSkin = computed(() => viewStore.dashboardSkin);

function selectStatus(status: string) {
    if (props.modelValue !== status) {
        emit("update:modelValue", status);
    }
}
</script>

<style scoped>
.status-selector {
    display: flex;
    align-items: center;
}

.options {
    display: flex;
    background-color: var(--status-bg, #f0f0f0);
    border-radius: 8px;
    padding: 4px;
    gap: 4px;
    border: 1px solid var(--status-border, transparent);
    transition: all 0.3s ease;
}

.option-btn {
    border: none;
    background: transparent;
    padding: 4px 10px;
    cursor: pointer;
    border-radius: 6px;
    color: var(--status-text, #666);
    transition: all 0.2s ease;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    font-family: inherit;
}

.option-btn:hover {
    background-color: var(--status-hover-bg, rgba(0, 0, 0, 0.05));
    color: var(--status-hover-text, inherit);
}

.option-btn.active {
    background-color: var(--status-active-bg, #fff);
    color: var(--status-active-text, #e63946);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* === AGNOSTIC THEME ENGINE === */
.skin-cyber .options,
.skin-classic .options {
    --status-bg: var(--theme-surface, rgba(15, 23, 42, 0.3));
    --status-border: var(--theme-border, rgba(95, 165, 255, 0.12));
    --status-text: var(--theme-text-muted, #94a3b8);
    --status-hover-bg: rgba(var(--theme-primary-rgb, 95, 165, 255), 0.1);
    --status-hover-text: var(--theme-primary, #5FA5FF);
    --status-active-bg: var(--theme-primary, #5FA5FF);
    --status-active-text: var(--theme-bg, #0B111B);
    
    border-radius: var(--theme-radius, 4px);
    backdrop-filter: var(--theme-blur, blur(8px));
}

/* Specific colors for status when active in cyber skin */
.skin-cyber .option-btn.status-active.active,
.skin-classic .option-btn.status-active.active {
    --status-active-bg: #10b981; /* Green */
    box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
}

.skin-cyber .option-btn.status-archived.active,
.skin-classic .option-btn.status-archived.active {
    --status-active-bg: #f59e0b; /* Amber */
    box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
}

.skin-cyber .option-btn.status-deleted.active,
.skin-classic .option-btn.status-deleted.active {
    --status-active-bg: #ef4444; /* Red */
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.4);
}

.skin-cyber .option-btn,
.skin-classic .option-btn {
    font-family: var(--font-cyber-mono, 'JetBrains Mono', monospace);
    border-radius: 2px;
    letter-spacing: 0.5px;
}

/* Theme Overrides */
.options.theme-amber {
    --status-bg: rgba(26, 20, 10, 0.6);
    --status-border: rgba(255, 179, 0, 0.3);
    --status-text: #cbb8a5;
    --status-active-bg: #FF8F00;
    --status-active-text: #0A0605;
}

.options.theme-phosphorus {
    --status-bg: rgba(10, 25, 12, 0.6);
    --status-border: rgba(0, 255, 65, 0.3);
    --status-text: #b8cbb5;
    --status-active-bg: #00FF41;
    --status-active-text: #050a06;
}
</style>
