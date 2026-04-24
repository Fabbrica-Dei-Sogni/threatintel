<template>
    <div class="auth-page welcome-view cyber-view" :class="'skin-' + dashboardSkin">
        <div class="header-top">
            <div class="header-left">
                <div class="brand-logo">
                    <span class="logo-icon">🛰️</span>
                    <span class="logo-text">THREAT<span class="highlight">INTEL</span></span>
                </div>
            </div>
            <div class="header-actions">
                <SkinSwitcher />
                <LanguageSwitcher />
            </div>
        </div>

        <div class="auth-container">
            <button @click="router.push('/')" class="back-btn-integrated">
                ← {{ t('auth.backToConsole').toUpperCase() }}
            </button>
            <div class="auth-card">
                <div class="welcome-content" v-if="status === 'success'">
                    <div class="status-icon-container">
                        <div class="status-circle pulse-cyan"></div>
                        <span class="status-icon">🛡️</span>
                    </div>

                    <h1 class="welcome-title">
                        {{ t('auth.welcomeTitle').toUpperCase() }}
                    </h1>
                    
                    <div class="user-id-badge">
                        <span class="label">{{ t('auth.identityVerified').toUpperCase() }}:</span>
                        <span class="value">{{ username }}</span>
                    </div>

                    <p class="welcome-message">
                        {{ t('auth.welcomeMessage') }}
                    </p>

                    <div class="tech-details">
                        <div class="tech-item">
                            <span class="tech-label">PROTOCOL:</span>
                            <span class="tech-value">SECURE_AUTH_V2</span>
                        </div>
                        <div class="tech-item">
                            <span class="tech-label">STATUS:</span>
                            <span class="tech-value highlight-cyan">AUTHORIZED</span>
                        </div>
                    </div>

                    <button @click="goToLogin" class="btn-action-primary pulse-btn">
                        {{ t('auth.proceedToLogin').toUpperCase() }}
                    </button>
                </div>

                <div class="welcome-content error-state" v-else>
                    <div class="status-icon-container">
                        <div class="status-circle pulse-red"></div>
                        <span class="status-icon">⚠️</span>
                    </div>

                    <h1 class="welcome-title error">
                        {{ t('auth.activationErrorTitle').toUpperCase() }}
                    </h1>

                    <p class="welcome-message">
                        {{ t('auth.activationErrorMessage') }}
                    </p>

                    <button @click="router.push('/register')" class="btn-action-secondary">
                        {{ t('auth.backToRegister').toUpperCase() }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Decorative elements -->
        <div class="scanline"></div>
        <div class="grid-overlay"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import LanguageSwitcher from '../../../components/LanguageSwitcher.vue';
import SkinSwitcher from '../../../components/SkinSwitcher.vue';
import { useViewSettingsStore } from '../../../stores/viewSettings';
import { storeToRefs } from 'pinia';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const viewStore = useViewSettingsStore();
const { dashboardSkin } = storeToRefs(viewStore);

const status = ref(route.query.status as string || 'success');
const username = ref(route.query.username as string || 'AGENT');

const goToLogin = () => {
    router.push('/login');
};

onMounted(() => {
    console.log('Welcome Page Mounted. Status:', status.value, 'User:', username.value);
});
</script>

<style scoped src="./Welcome.css"></style>
<style scoped>
@import "./WelcomeCyber.css";

/* Component-specific animations */
.pulse-btn {
    animation: welcome-pulse 2s infinite ease-in-out;
}

@keyframes welcome-pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
}

.pulse-red {
    animation: pulse-red 2s infinite ease-in-out;
}

@keyframes pulse-red {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 76, 76, 0.4); }
    70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(255, 76, 76, 0); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 76, 76, 0); }
}
</style>
