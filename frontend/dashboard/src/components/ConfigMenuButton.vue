<template>
    <div class="config-menu">
        <!-- Config Button (hamburger style, fixed position) -->
        <button class="config-btn" @click="goToConfig" :title="$t('nav.configuration')">
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
        </button>
    </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const router = useRouter();

function goToConfig() {
    router.push('/config');
}
</script>

<style scoped>
.config-menu {
    position: fixed;
    top: 20px;
    left: 20px;
    z-index: 1001;
}

.config-btn {
    width: 48px;
    height: 48px;
    background: linear-gradient(145deg, #1a4d7c, #0d2d4d);
    border: 2px solid rgba(136, 170, 255, 0.4);
    border-radius: 12px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px;
    transition: all 0.3s ease;
    box-shadow:
        0 4px 15px rgba(0, 0, 0, 0.4),
        0 0 20px rgba(136, 170, 255, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.config-btn:hover {
    background: linear-gradient(145deg, #256ba3, #1a4d7c);
    border-color: rgba(136, 170, 255, 0.7);
    box-shadow:
        0 6px 20px rgba(0, 0, 0, 0.5),
        0 0 25px rgba(136, 170, 255, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.15);
    transform: scale(1.05);
}

.hamburger-line {
    width: 24px;
    height: 3px;
    background: linear-gradient(90deg, #88aaff, #aabbff);
    border-radius: 3px;
    transition: all 0.3s ease;
    box-shadow: 0 0 4px rgba(136, 170, 255, 0.5);
}

/* Responsive */
@media (max-width: 640px) {
    .config-menu {
        top: 12px;
        left: 12px;
    }

    .config-btn {
        width: 44px;
        height: 44px;
    }

    .hamburger-line {
        width: 22px;
        height: 2.5px;
    }
}
</style>
