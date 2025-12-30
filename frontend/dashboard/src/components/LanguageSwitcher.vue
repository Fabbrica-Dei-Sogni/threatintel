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
    background: rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
    border-radius: 10px;
    padding: 6px 12px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.select-wrapper:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: var(--primary-color, #4CAF50);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px var(--primary-color, rgba(76, 175, 80, 0.2));
    transform: translateY(-1px);
}

.globe-icon {
    font-size: 14px;
    margin-right: 8px;
    user-select: none;
    opacity: 0.8;
}

.lang-select {
    appearance: none;
    background: transparent;
    border: none;
    color: var(--text-color, #f0e6d2);
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    padding-right: 20px;
    outline: none;
    min-width: 120px;
    color-scheme: dark;
    accent-color: var(--primary-color, #4CAF50);
}

.lang-select option {
    background-color: #1e1b1a !important;
    /* Mantiene coerenza con il colore di sfondo shell */
    color: #f0e6d2 !important;
    padding: 12px;
    font-size: 14px;
}

.lang-select option:hover,
.lang-select option:checked {
    background-color: var(--primary-color, #4CAF50) !important;
    color: #ffffff !important;
}

.arrow-icon {
    position: absolute;
    right: 10px;
    pointer-events: none;
    color: var(--text-color, #f0e6d2);
    opacity: 0.5;
    font-size: 8px;
    transition: all 0.2s ease;
}

.select-wrapper:hover .arrow-icon {
    opacity: 1;
    color: var(--primary-color, #4CAF50);
    transform: translateY(1px);
}

/* Firefox fix for dropdown arrow */
@-moz-document url-prefix() {
    .lang-select {
        padding-right: 20px;
    }
}
</style>
