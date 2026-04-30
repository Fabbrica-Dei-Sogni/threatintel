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
    <div class="auth-page cyber-view" :class="'skin-' + dashboardSkin">
        <GlobalHeader context="auth" />

        <div class="auth-container">
            <button @click="router.push('/')" class="back-btn-integrated">
                ← {{ t('auth.backToConsole').toUpperCase() }}
            </button>
            <div class="auth-card">
                <div class="auth-card-header">
                    <h1 class="auth-title">
                        <span class="animated-icon pulse-cobalt">🔐</span>
                        {{ t('auth.registerTitle').toUpperCase() }}
                    </h1>
                </div>

                <form @submit.prevent="onSubmit" class="auth-form">
                    <div class="form-group">
                        <label for="username" class="cyber-label-muted">{{ t('auth.username').toUpperCase() }}</label>
                        <input v-model="username" id="username" type="text" class="cyber-input-text"
                            :placeholder="t('auth.usernamePlaceholder')" required />
                    </div>
                    <div class="form-group">
                        <label for="email" class="cyber-label-muted">{{ t('auth.email').toUpperCase() }}</label>
                        <input v-model="email" id="email" type="email" class="cyber-input-text"
                            :placeholder="t('auth.emailPlaceholder')" required />
                    </div>
                    <div class="form-group">
                        <label for="password" class="cyber-label-muted">{{ t('auth.password').toUpperCase() }}</label>
                        <input v-model="password" id="password" type="password" class="cyber-input-text"
                            :placeholder="t('auth.passwordPlaceholder')" required minlength="6" />
                    </div>

                    <button type="submit" class="btn-action-primary" :disabled="loading">
                        <span v-if="loading" class="spinner-small"></span>
                        <span v-else>{{ t('auth.register').toUpperCase() }}</span>
                    </button>

                    <p v-if="error" class="error-msg">
                        <span class="error-icon">⚠️</span> {{ errorMessage }}
                    </p>
                </form>

                <div class="auth-footer">
                    <router-link to="/login" class="auth-link">
                        {{ t('auth.loginHere') }}
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
import { register } from '../../../api/index';
import { useI18n } from 'vue-i18n';
import GlobalHeader from '../../../components/GlobalHeader.vue';
import { useViewSettingsStore } from '../../../stores/viewSettings';
import { storeToRefs } from 'pinia';

const { t } = useI18n();
const router = useRouter();
const viewStore = useViewSettingsStore();
const { dashboardSkin } = storeToRefs(viewStore);

const username = ref('');
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref(false);
const errorMessage = ref('');

async function onSubmit() {
    error.value = false;
    loading.value = true;
    try {
        await register({
            username: username.value,
            email: email.value,
            password: password.value,
            redirectUrl: window.location.origin + import.meta.env.VITE_WELCOME_PATH
        });
        router.push('/login');
    } catch (err: any) {
        error.value = true;
        errorMessage.value = err.response?.data?.message || t('auth.errorRegister');
    } finally {
        loading.value = false;
    }
}
</script>

<style scoped src="./Register.css"></style>
<style scoped>
@import "./RegisterCyber.css";

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
