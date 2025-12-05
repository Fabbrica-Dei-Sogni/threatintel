<template>
    <div class="country-flag" v-if="countryCode" :title="countryCode">
        <img :src="flagUrl" :alt="countryCode" class="flag-img" @error="hasError = true" v-if="!hasError" />
        <span v-else class="flag-fallback">{{ countryCode }}</span>
    </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
    countryCode: {
        type: String,
        required: true
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
    // flagcdn uses lowercase 2-letter codes. 
    // w20 = width 20px, w40 = width 40px, etc.
    const code = props.countryCode.toLowerCase();
    // Using a fixed small width for table display efficiency
    //Risorsa remota per recuperare la bandiera da visualizzare a ricerca.
    //XXX: evolvere il recupero della bandiera con tecniche di caching efficace.
    return `https://flagcdn.com/w40/${code}.png`;
});
</script>

<style scoped>
.country-flag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
}

.flag-img {
    height: auto;
    width: 24px;
    /* Default width */
    border-radius: 2px;
    box-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
    object-fit: cover;
}

.flag-fallback {
    font-weight: bold;
    font-size: 0.8em;
    color: #ccc;
}
</style>
