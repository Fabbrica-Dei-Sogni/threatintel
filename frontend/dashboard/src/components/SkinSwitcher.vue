<template>
    <div class="skin-switcher">
        <div class="select-wrapper">
            <span class="skin-icon">🎨</span>
            <select v-model="dashboardSkin" class="skin-select">
                <option value="classic">{{ t('skin.classic') }}</option>
                <option value="cyber">{{ t('skin.cyber') }}</option>
            </select>
            <span class="arrow-icon">▼</span>
        </div>
    </div>
</template>

<script setup>
import { useViewSettingsStore } from '../stores/viewSettings';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const store = useViewSettingsStore();
const { dashboardSkin } = storeToRefs(store);
</script>

<style scoped>
.skin-switcher {
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
    padding: 0; /* Padding handled by select for better click area */
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
}

.select-wrapper:hover {
    background: rgba(var(--theme-primary-rgb, 0, 212, 255), 0.1);
    border-color: var(--theme-primary, #5FA5FF);
    transform: translateY(-1px);
    box-shadow: 0 0 15px rgba(var(--theme-primary-rgb, 0, 212, 255), 0.3);
}

.skin-icon {
    position: absolute;
    left: 10px;
    font-size: 14px;
    pointer-events: none;
    z-index: 1;
}

.skin-select {
    appearance: none;
    background: transparent;
    border: none;
    color: var(--theme-text, #f0e6d2);
    cursor: pointer;
    padding: 6px 30px 6px 32px; /* Extra left for icon, extra right for arrow */
    outline: none;
    min-width: 120px;
    font-size: 0.8rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    position: relative;
    z-index: 2;
}

.skin-select option {
    background-color: #1e1b1a !important;
    color: #f0e6d2 !important;
    padding: 12px;
    text-transform: none;
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

@media (max-width: 768px) {
    .skin-select {
        min-width: unset;
        width: 36px;
        color: transparent;
        padding: 6px;
    }
    
    .skin-icon {
        left: 50%;
        transform: translateX(-50%);
        font-size: 16px;
    }

    .arrow-icon {
        display: none;
    }
}
</style>
