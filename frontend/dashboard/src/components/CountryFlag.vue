<template>
    <div class="country-flag" :data-noc-tooltip="tooltip || (countryCode ? countryCode : 'Global/Unknown')">
        <template v-if="countryCode && !hasError">
            <img :src="flagUrl" :alt="countryCode" class="flag-img" @error="hasError = true" />
        </template>
        <div v-else class="flag-placeholder">
            <span class="placeholder-icon">🌐</span>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
    countryCode: {
        type: String,
        default: null
    },
    tooltip: {
        type: String,
        default: ''
    },
    size: {
        type: String, // 'small' i.e. 20px height, 'normal'
        default: 'normal'
    }
});

const hasError = ref(false);

watch(() => props.countryCode, () => {
    hasError.value = false;
});

const flagUrl = computed(() => {
    if (!props.countryCode) return '';
    const code = props.countryCode.toLowerCase();
    return `https://flagcdn.com/w40/${code}.png`;
});
</script>

<style scoped>
.country-flag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
    width: 24px;
    height: 18px;
}

.flag-img {
    height: auto;
    width: 24px;
    border-radius: 2px;
    box-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
    object-fit: cover;
}

.flag-placeholder {
    width: 24px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(136, 170, 255, 0.1);
    border-radius: 2px;
    border: 1px dashed rgba(136, 170, 255, 0.3);
}

.placeholder-icon {
    font-size: 11px;
    opacity: 0.7;
}
</style>
