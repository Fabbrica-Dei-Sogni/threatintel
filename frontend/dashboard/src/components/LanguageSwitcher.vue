<template>
    <div class="language-switcher">
        <div class="select-wrapper">
            <span class="globe-icon">🌐</span>
            <select v-model="locale" @change="handleChange" class="lang-select">
                <option v-for="lang in languages" :key="lang.code" :value="lang.code">
                    {{ lang.flag }} {{ lang.name }}
                </option>
            </select>
            <span class="arrow-icon">▼</span>
        </div>
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

const handleChange = () => {
    setLocale(locale.value);
};
</script>

<style scoped>
.language-switcher {
    display: flex;
    align-items: center;
}

.select-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    background: linear-gradient(145deg, #003366, #004080);
    border: 1px solid #004080;
    border-radius: 8px;
    padding: 8px 12px;
    box-shadow: 0 4px 8px rgba(0, 64, 128, 0.6);
    transition: all 0.3s ease;
}

.select-wrapper:hover {
    background: linear-gradient(145deg, #004080, #0059b3);
    border-color: #0059b3;
    box-shadow: 0 6px 12px rgba(0, 89, 179, 0.9);
    transform: translateY(-1px);
}

.globe-icon {
    font-size: 16px;
    margin-right: 8px;
    user-select: none;
}

.lang-select {
    appearance: none;
    background: transparent;
    border: none;
    color: #e0e7ff;
    font-size: 14px;
    font-weight: 600;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    cursor: pointer;
    padding-right: 24px;
    outline: none;
    min-width: 140px;
    color-scheme: dark;
    accent-color: #0073e6;
    /* Cambia colore checkmark */
}

.lang-select option {
    background-color: #002b5c !important;
    background: #002b5c !important;
    color: #e0e7ff !important;
    padding: 10px 14px;
    font-size: 14px;
    font-weight: 500;
}

.lang-select option:hover {
    background: #004080 !important;
    background-color: #004080 !important;
    color: #ffffff !important;
}

.lang-select option:checked,
.lang-select option[selected] {
    background: #0059b3 !important;
    background-color: #0059b3 !important;
    color: #ffffff !important;
    font-weight: bold !important;
    box-shadow: none !important;
}

/* Force remove highlight/checkmark styling */
.lang-select option:checked::before,
.lang-select option:checked::after {
    display: none !important;
}

/* Webkit specific */
@supports (-webkit-appearance: none) {
    .lang-select option:checked {
        background: #0059b3 !important;
        color: #ffffff !important;
    }
}

/* Moz specific */
@-moz-document url-prefix() {
    .lang-select option:checked {
        background: #0059b3 !important;
        color: #ffffff !important;
    }
}

.arrow-icon {
    position: absolute;
    right: 12px;
    pointer-events: none;
    color: #e0e7ff;
    font-size: 10px;
    transition: transform 0.2s ease;
}

.select-wrapper:hover .arrow-icon {
    color: #ffffff;
}

/* Firefox fix for dropdown arrow */
@-moz-document url-prefix() {
    .lang-select {
        padding-right: 20px;
    }
}
</style>
