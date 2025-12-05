<template>
    <div class="language-switcher">
        <button v-for="lang in languages" :key="lang.code" :class="{ active: locale === lang.code }"
            @click="setLocale(lang.code)" class="lang-btn" :title="`Switch to ${lang.name}`">
            {{ lang.flag }} {{ lang.label }}
        </button>
    </div>
</template>

<script setup>
import { useI18n } from '../composable/useI18n';

const { locale, setLocale } = useI18n();

const languages = [
    { code: 'it-IT', label: 'IT', name: 'Italiano', flag: '🇮🇹' },
    { code: 'en-US', label: 'EN', name: 'English', flag: '🇬🇧' },
    { code: 'fr-FR', label: 'FR', name: 'Français', flag: '🇫🇷' },
    { code: 'de-DE', label: 'DE', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'pl-PL', label: 'PL', name: 'Polski', flag: '🇵🇱' },
    { code: 'ru-RU', label: 'RU', name: 'Русский', flag: '🇷🇺' }
];
</script>

<style scoped>
.language-switcher {
    display: flex;
    gap: 8px;
    align-items: center;
}

.lang-btn {
    padding: 8px 14px;
    border: 1px solid #004080;
    background: linear-gradient(145deg, #003366, #004080);
    color: #e0e7ff;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 4px 8px rgba(0, 64, 128, 0.6);
}

.lang-btn:hover {
    background: linear-gradient(145deg, #004080, #0059b3);
    border-color: #0059b3;
    box-shadow: 0 6px 12px rgba(0, 89, 179, 0.9);
    transform: translateY(-1px);
}

.lang-btn.active {
    background: linear-gradient(145deg, #0059b3, #0073e6);
    color: #ffffff;
    border-color: #0073e6;
    font-weight: bold;
    box-shadow: 0 6px 14px rgba(0, 115, 230, 0.8);
}
</style>
