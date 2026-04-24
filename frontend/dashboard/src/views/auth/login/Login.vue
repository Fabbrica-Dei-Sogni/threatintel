<template>
    <div class="auth-page cyber-view" :class="'skin-' + dashboardSkin">
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
                <div class="auth-card-header">
                    <h1 class="auth-title">
                        <span class="animated-icon pulse-cobalt">🔐</span>
                        {{ t('auth.loginTitle').toUpperCase() }}
                    </h1>
                </div>

                <form @submit.prevent="onSubmit" class="auth-form">
                    <div class="form-group">
                        <label for="username" class="cyber-label-muted">{{ t('auth.username').toUpperCase() }}</label>
                        <input v-model="username" id="username" type="text" class="cyber-input-text"
                            :placeholder="t('auth.usernamePlaceholder')" required />
                    </div>
                    <div class="form-group">
                        <label for="password" class="cyber-label-muted">{{ t('auth.password').toUpperCase() }}</label>
                        <input v-model="password" id="password" type="password" class="cyber-input-text"
                            :placeholder="t('auth.passwordPlaceholder')" required minlength="6" />
                    </div>

                    <button type="submit" class="btn-action-primary" :disabled="loading">
                        <span v-if="loading" class="spinner-small"></span>
                        <span v-else>{{ t('auth.login').toUpperCase() }}</span>
                    </button>

                    <p v-if="error" class="error-msg">
                        <span class="error-icon">⚠️</span> {{ errorMessage }}
                    </p>
                </form>

                <div class="auth-footer">
                    <router-link to="/register" class="auth-link">
                        {{ t('auth.registerHere') }}
                    </router-link>
                </div>
            </div>
        </div>

        <!-- Decorative elements -->
        <div class="scanline"></div>
        <div class="grid-overlay"></div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '../../../api/index';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../../../stores/auth';
import LanguageSwitcher from '../../../components/LanguageSwitcher.vue';
import SkinSwitcher from '../../../components/SkinSwitcher.vue';
import { useViewSettingsStore } from '../../../stores/viewSettings';
import { storeToRefs } from 'pinia';

const { t } = useI18n();
const authStore = useAuthStore();
const router = useRouter();
const viewStore = useViewSettingsStore();
const { dashboardSkin } = storeToRefs(viewStore);

const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref(false);
const errorMessage = ref('');

async function onSubmit() {
    error.value = false;
    loading.value = true;
    try {
        const res = await login({ username: username.value, password: password.value });

        if (res.token && res.user) {
            authStore.setAuth(res.token, res.user);
        }

        // Recupera il redirect dalla query string, se presente, altrimenti vai in home
        const redirectPath = router.currentRoute.value.query.redirect as string;
        if (redirectPath) {
            router.push(redirectPath);
        } else {
            router.push('/');
        }
    } catch (err: any) {
        error.value = true;
        errorMessage.value = err.response?.data?.message || t('auth.errorLogin');
    } finally {
        loading.value = false;
    }
}
</script>

<style scoped src="./Login.css"></style>
<style scoped>
@import "./LoginCyber.css";

/* Component-specific animations */
.pulse-cobalt {
    animation: pulse-cobalt 2s infinite ease-in-out;
}

@keyframes pulse-cobalt {
    0% {
        transform: scale(1);
        filter: drop-shadow(0 0 2px #007AFF);
    }

    50% {
        transform: scale(1.1);
        filter: drop-shadow(0 0 10px #00D4FF);
    }

    100% {
        transform: scale(1);
        filter: drop-shadow(0 0 2px #007AFF);
    }
}

.spinner-small {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
