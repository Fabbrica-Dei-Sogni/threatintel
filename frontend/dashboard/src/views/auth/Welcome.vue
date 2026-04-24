<template>
    <div class="auth-page welcome-view">
        <div class="auth-header">
            <div class="header-left">
                <div class="brand-logo">
                    <span class="logo-icon">🛰️</span>
                    <span class="logo-text">THREAT<span class="highlight">INTEL</span></span>
                </div>
            </div>
            <div class="header-right">
                <LanguageSwitcher />
            </div>
        </div>

        <div class="auth-container">
            <div class="auth-card glass-card">
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
        <div class="ambient-glow"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import LanguageSwitcher from '../../components/LanguageSwitcher.vue';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();

const status = ref(route.query.status as string || 'success');
const username = ref(route.query.username as string || 'AGENT');

function goToLogin() {
    router.push('/login');
}

onMounted(() => {
    console.log('[Welcome] Page loaded with status:', status.value);
});
</script>

<style scoped>
.auth-page {
    position: relative;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #080C14;
    overflow: hidden;
    color: #E2E8F0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.auth-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px 40px;
    z-index: 10;
}

.brand-logo {
    display: flex;
    align-items: center;
    gap: 12px;
}

.logo-icon {
    font-size: 1.5rem;
}

.logo-text {
    font-weight: 900;
    font-size: 1.2rem;
    letter-spacing: 2px;
    color: #fff;
}

.logo-text .highlight {
    color: #00D4FF;
}

.auth-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 5;
}

.auth-card {
    width: 100%;
    max-width: 500px;
    padding: 60px 40px;
    background: rgba(16, 24, 48, 0.45);
    border: 1px solid rgba(0, 212, 255, 0.2);
    border-radius: 12px;
    backdrop-filter: blur(12px);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    position: relative;
    text-align: center;
    overflow: hidden;
}

.auth-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, transparent, #00D4FF, transparent);
}

.status-icon-container {
    position: relative;
    width: 80px;
    height: 80px;
    margin: 0 auto 30px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.status-icon {
    font-size: 2.5rem;
    z-index: 2;
}

.status-circle {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: rgba(0, 212, 255, 0.1);
    border: 1px solid rgba(0, 212, 255, 0.3);
}

.pulse-cyan {
    animation: pulse-cyan 2s infinite ease-in-out;
}

.pulse-red {
    animation: pulse-red 2s infinite ease-in-out;
    background: rgba(255, 51, 102, 0.1);
    border-color: rgba(255, 51, 102, 0.3);
}

@keyframes pulse-cyan {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 212, 255, 0.4); }
    70% { transform: scale(1.1); box-shadow: 0 0 0 20px rgba(0, 212, 255, 0); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 212, 255, 0); }
}

@keyframes pulse-red {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 51, 102, 0.4); }
    70% { transform: scale(1.1); box-shadow: 0 0 0 20px rgba(255, 51, 102, 0); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 51, 102, 0); }
}

.welcome-title {
    font-size: 1.8rem;
    font-weight: 800;
    color: #fff;
    margin-bottom: 20px;
    letter-spacing: 1px;
}

.welcome-title.error {
    color: #FF3366;
}

.user-id-badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: rgba(0, 0, 0, 0.3);
    padding: 8px 16px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 25px;
}

.user-id-badge .label {
    font-size: 0.7rem;
    color: #64748B;
    font-weight: 700;
}

.user-id-badge .value {
    font-size: 0.85rem;
    color: #00D4FF;
    font-weight: 800;
}

.welcome-message {
    font-size: 1rem;
    line-height: 1.6;
    color: #94A3B8;
    margin-bottom: 35px;
}

.tech-details {
    display: flex;
    justify-content: center;
    gap: 30px;
    margin-bottom: 40px;
    padding: 20px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
}

.tech-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
    text-align: left;
}

.tech-label {
    font-size: 0.6rem;
    font-weight: 800;
    color: #4B6584;
}

.tech-value {
    font-size: 0.75rem;
    font-weight: 700;
    font-family: 'Courier New', Courier, monospace;
}

.highlight-cyan {
    color: #00D4FF;
    text-shadow: 0 0 8px rgba(0, 212, 255, 0.5);
}

.btn-action-primary {
    width: 100%;
    background: linear-gradient(135deg, #007AFF, #00D4FF);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 18px;
    font-weight: 800;
    font-size: 1rem;
    letter-spacing: 2px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(0, 212, 255, 0.3);
}

.btn-action-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 212, 255, 0.5);
    filter: brightness(1.1);
}

.btn-action-secondary {
    width: 100%;
    background: transparent;
    color: #94A3B8;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    padding: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s;
}

.btn-action-secondary:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
    border-color: #fff;
}

.pulse-btn {
    animation: btn-glow 3s infinite alternate;
}

@keyframes btn-glow {
    from { box-shadow: 0 4px 15px rgba(0, 212, 255, 0.3); }
    to { box-shadow: 0 4px 25px rgba(0, 212, 255, 0.6); }
}

/* Decorative elements */
.scanline {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
    background-size: 100% 4px, 3px 100%;
    pointer-events: none;
    z-index: 100;
    opacity: 0.2;
}

.grid-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
    z-index: 1;
}

.ambient-glow {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80vw;
    height: 80vh;
    background: radial-gradient(circle, rgba(0, 122, 255, 0.05) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
}

@media (max-width: 768px) {
    .auth-header {
        padding: 20px;
    }
    .auth-card {
        padding: 40px 24px;
    }
    .tech-details {
        flex-direction: column;
        gap: 15px;
    }
}
</style>
