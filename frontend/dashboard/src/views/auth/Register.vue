<template>
    <div class="auth-page cyber-view">
        <div class="auth-header">
            <button @click="router.push('/')" class="back-btn">
                ← {{ t('auth.backToConsole').toUpperCase() }}
            </button>
            <div class="header-right">
                <LanguageSwitcher />
            </div>
        </div>

        <div class="auth-container">
            <div class="auth-card glass-card">
                <div class="auth-card-header">
                    <h1 class="auth-title">
                        <span class="animated-icon pulse-cobalt">🛰️</span>
                        {{ t('auth.registerTitle').toUpperCase() }}
                    </h1>
                </div>

                <form @submit.prevent="onSubmit" class="auth-form">
                    <div class="form-group">
                        <label for="username" class="cyber-label-muted">{{ t('auth.username').toUpperCase() }}</label>
                        <input 
                            v-model="username" 
                            id="username" 
                            type="text"
                            class="cyber-input-text" 
                            :placeholder="t('auth.usernamePlaceholder')"
                            required 
                        />
                    </div>
                    <div class="form-group">
                        <label for="email" class="cyber-label-muted">{{ t('auth.email').toUpperCase() }}</label>
                        <input 
                            v-model="email" 
                            id="email" 
                            type="email" 
                            class="cyber-input-text" 
                            :placeholder="t('auth.emailPlaceholder')"
                            required 
                        />
                    </div>
                    <div class="form-group">
                        <label for="password" class="cyber-label-muted">{{ t('auth.password').toUpperCase() }}</label>
                        <input 
                            v-model="password" 
                            id="password" 
                            type="password" 
                            class="cyber-input-text" 
                            :placeholder="t('auth.passwordPlaceholder')"
                            required
                            minlength="6" 
                        />
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

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { register } from '../../api/index';
import { useI18n } from 'vue-i18n';
import LanguageSwitcher from '../../components/LanguageSwitcher.vue';

const { t } = useI18n();
const router = useRouter();

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
        await register({ username: username.value, email: email.value, password: password.value });
        router.push('/login');
    } catch (err) {
        error.value = true;
        errorMessage.value = err.response?.data?.message || t('auth.errorRegister');
    } finally {
        loading.value = false;
    }
}
</script>

<style scoped>
.auth-page {
    position: relative;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #080C14;
    overflow: hidden;
}

.auth-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px 40px;
    z-index: 10;
}

.header-right {
    display: flex;
    align-items: center;
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
    max-width: 440px;
    padding: 40px;
    background: rgba(16, 24, 48, 0.45);
    border: 1px solid rgba(0, 212, 255, 0.2);
    border-radius: 12px;
    backdrop-filter: blur(12px);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    position: relative;
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

.auth-card-header {
    text-align: center;
    margin-bottom: 40px;
}

.auth-title {
    font-size: 1.5rem;
    color: #00D4FF;
    font-weight: 800;
    letter-spacing: 2px;
    text-shadow: 0 0 15px rgba(0, 212, 255, 0.4);
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
}

.auth-form {
    display: flex;
    flex-direction: column;
    gap: 25px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.cyber-label-muted {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: #4B6584;
}

.btn-action-primary {
    margin-top: 15px;
    background: linear-gradient(135deg, #007AFF, #00D4FF);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 16px;
    font-weight: 800;
    font-size: 1rem;
    letter-spacing: 1px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 4px 15px rgba(0, 212, 255, 0.3);
}

.btn-action-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 212, 255, 0.5);
    filter: brightness(1.1);
}

.btn-action-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.error-msg {
    background: rgba(255, 76, 76, 0.1);
    border: 1px solid rgba(255, 76, 76, 0.3);
    color: #FF7070;
    padding: 12px;
    border-radius: 6px;
    font-size: 0.85rem;
    text-align: center;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.auth-footer {
    margin-top: 35px;
    text-align: center;
}

.auth-link {
    color: #5FA5FF;
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 600;
    transition: all 0.2s ease;
    opacity: 0.8;
}

.auth-link:hover {
    opacity: 1;
    color: #00D4FF;
    text-shadow: 0 0 8px rgba(0, 212, 255, 0.3);
}

/* Common Back Button Style (Aligned with dashboard) */
.back-btn {
    background: rgba(0, 122, 255, 0.1);
    color: #00D4FF;
    border: 1px solid rgba(0, 212, 255, 0.3);
    font-weight: 700;
    padding: 10px 24px;
    box-shadow: 0 0 15px rgba(0, 212, 255, 0.15);
    transition: all 0.3s ease;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    letter-spacing: 1px;
}

.back-btn:hover {
    background: rgba(0, 122, 255, 0.2);
    box-shadow: 0 0 20px rgba(0, 212, 255, 0.4);
    transform: translateY(-2px);
    border-color: rgba(0, 212, 255, 0.6);
}

/* Animations and Backgrounds */
.pulse-cobalt {
    animation: pulse-cobalt 2s infinite ease-in-out;
}

@keyframes pulse-cobalt {
    0% { transform: scale(1); filter: drop-shadow(0 0 2px #007AFF); }
    50% { transform: scale(1.1); filter: drop-shadow(0 0 10px #00D4FF); }
    100% { transform: scale(1); filter: drop-shadow(0 0 2px #007AFF); }
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
    to { transform: rotate(360deg); }
}

.scanline {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
        rgba(18, 16, 16, 0) 50%,
        rgba(0, 0, 0, 0.1) 50%
    ), linear-gradient(
        90deg,
        rgba(255, 0, 0, 0.03),
        rgba(0, 255, 0, 0.01),
        rgba(0, 0, 255, 0.03)
    );
    background-size: 100% 4px, 3px 100%;
    pointer-events: none;
    z-index: 100;
    opacity: 0.3;
}

.grid-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: 
        linear-gradient(rgba(0, 212, 255, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 212, 255, 0.05) 1px, transparent 1px);
    background-size: 50px 50px;
    pointer-events: none;
    z-index: 1;
}

@media (max-width: 768px) {
    .auth-header {
        padding: 15px 20px;
    }
    .back-btn {
        padding: 8px 16px;
        font-size: 0.75rem;
    }
}
</style>
