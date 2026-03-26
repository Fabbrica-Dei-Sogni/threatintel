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
        default: () => ["http", "ssh", "https"],
    },
    theme: {
        type: String,
        default: "light",
        validator: (value: string) => ["light", "dark", "magma", "amber"].includes(value),
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

/* Dark Theme (Generic Dashboard Default) */
.options.theme-dark {
    background-color: rgba(0, 30, 60, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
}
.options.theme-dark .option-btn {
    color: #b0c4de;
}
.options.theme-dark .option-btn:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: #fff;
}
.options.theme-dark .option-btn.active {
    background-color: #0056b3;
    color: #ffffff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

/* Magma Theme (Attacks View) */
.options.theme-magma {
    background-color: #2b1b17;
    border: 1px solid #4f3b33;
}
.options.theme-magma .option-btn {
    color: #e0bbbb;
}
.options.theme-magma .option-btn:hover {
    background-color: rgba(255, 76, 76, 0.1);
    color: #ff4c4c;
}
.options.theme-magma .option-btn.active {
    background-color: #d93025;
    color: #ffffff;
    box-shadow: 0 1px 4px rgba(217, 48, 37, 0.4);
}

/* Amber Theme (Threat Logs View) */
.options.theme-amber {
    background-color: rgba(26, 20, 10, 0.6);
    border: 1px solid rgba(255, 179, 0, 0.3);
}
.options.theme-amber .option-btn {
    color: #cbb8a5;
}
.options.theme-amber .option-btn:hover {
    background-color: rgba(255, 179, 0, 0.1);
    color: #FFB300;
}
.options.theme-amber .option-btn.active {
    background-color: #FF8F00;
    color: #0A0605;
    box-shadow: 0 1px 4px rgba(255, 143, 0, 0.4);
}
</style>
