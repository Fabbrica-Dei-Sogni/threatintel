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
    background: var(--theme-surface, rgba(255, 255, 255, 0.04));
    backdrop-filter: var(--theme-blur, blur(10px));
    -webkit-backdrop-filter: var(--theme-blur, blur(10px));
    border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.1));
    border-radius: var(--theme-radius, 4px);
    padding: 0;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
}

.select-wrapper:hover {
    background: rgba(var(--theme-primary-rgb, 76, 175, 80), 0.1);
    border-color: var(--theme-primary, #4CAF50);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3), 0 0 10px rgba(var(--theme-primary-rgb, 76, 175, 80), 0.2);
}

.globe-icon {
    position: absolute;
    left: 10px;
    font-size: 14px;
    pointer-events: none;
    z-index: 1;
}

.lang-select {
    appearance: none;
    background: transparent;
    border: none;
    color: var(--theme-text, #f0e6d2);
    cursor: pointer;
    padding: 6px 30px 6px 32px;
    outline: none;
    min-width: 140px;
    font-size: 0.8rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    position: relative;
    z-index: 2;
    color-scheme: dark;
}

.lang-select option {
    background-color: #1e1b1a !important;
    color: #f0e6d2 !important;
    padding: 12px;
    text-transform: none;
}

.lang-select option:hover,
.lang-select option:checked {
    background-color: var(--theme-primary, #4CAF50) !important;
    color: #ffffff !important;
}

.arrow-icon {
    position: absolute;
    right: 10px;
    pointer-events: none;
    color: var(--theme-text, #f0e6d2);
    opacity: 0.5;
    font-size: 8px;
    z-index: 1;
}

/* Firefox fix for dropdown arrow */
@-moz-document url-prefix() {
    .lang-select {
        padding-right: 30px;
    }
}
@media (max-width: 768px) {
    .lang-select {
        min-width: unset;
        width: 36px;
        color: transparent;
        padding: 6px;
    }
    
    .globe-icon {
        left: 50%;
        transform: translateX(-50%);
        font-size: 16px;
    }

    .arrow-icon {
        display: none;
    }
}
</style>
