<template>
    <div class="protocol-selector">
        <div :class="['options', `theme-${theme}`]">
            <button v-for="option in options" :key="option" :class="['option-btn', { active: modelValue === option }]"
                @click="selectProtocol(option)">
                {{ option.toUpperCase() }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
// defineProps and defineEmits are compiler macros and do not need to be imported in script setup

const props = defineProps({
    modelValue: {
        type: String,
        default: "http",
    },
    options: {
        type: Array as () => string[],
        default: () => ["http", "ssh"],
    },
    theme: {
        type: String,
        default: "light",
        validator: (value: string) => ["light", "dark"].includes(value),
    },
});

const emit = defineEmits(["update:modelValue"]);

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
    margin-right: 15px;
}

.options {
    display: flex;
    background-color: #f0f0f0;
    border-radius: 8px;
    padding: 4px;
    gap: 4px;
}

.option-btn {
    border: none;
    background: transparent;
    padding: 6px 12px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    border-radius: 6px;
    color: #666;
    transition: all 0.2s ease;
}

.option-btn:hover {
    background-color: rgba(0, 0, 0, 0.05);
}

.option-btn.active {
    background-color: #fff;
    color: #e63946;
    /* Accent color matching dashboard theme */
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Dark Theme (Dashboard) */
.options.theme-dark {
    background-color: rgba(0, 30, 60, 0.5);
    /* Sfondo più scuro ma traslucido per integrarsi col widget */
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.options.theme-dark .option-btn {
    color: #b0c4de;
    /* Azzurrino chiaro per contrasto */
}

.options.theme-dark .option-btn:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: #fff;
}

.options.theme-dark .option-btn.active {
    background-color: #0056b3;
    /* Blu brillante per il tasto attivo */
    color: #ffffff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}
</style>
