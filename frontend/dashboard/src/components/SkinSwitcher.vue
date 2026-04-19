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
    background: rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 6px 12px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.select-wrapper:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: #5FA5FF;
    transform: translateY(-1px);
}

.skin-icon {
    font-size: 14px;
    margin-right: 8px;
    user-select: none;
    opacity: 0.8;
}

.skin-select {
    appearance: none;
    background: transparent;
    border: none;
    color: #f0e6d2;
    cursor: pointer;
    padding-right: 20px;
    outline: none;
    min-width: 100px;
    font-size: 0.85rem;
    font-weight: 600;
}

.skin-select option {
    background-color: #1e1b1a !important;
    color: #f0e6d2 !important;
    padding: 12px;
}

.arrow-icon {
    position: absolute;
    right: 10px;
    pointer-events: none;
    color: #f0e6d2;
    opacity: 0.5;
    font-size: 8px;
}

.select-wrapper:hover .arrow-icon {
    opacity: 1;
    color: #5FA5FF;
}
</style>
