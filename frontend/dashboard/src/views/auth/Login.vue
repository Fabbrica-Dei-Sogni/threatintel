<template>
    <div class="auth-page">
        <div class="auth-card glass-card">
            <h2 class="cyber-title-base glow-azure">{{ t('auth.login') }}</h2>
            <form @submit.prevent="onSubmit" class="auth-form">
                <div class="form-group">
                    <label for="username" class="cyber-label-muted">{{ t('auth.username') }}</label>
                    <input v-model="username" id="username" class="cyber-input-text" required />
                </div>
                <div class="form-group">
                    <label for="password" class="cyber-label-muted">{{ t('auth.password') }}</label>
                    <input v-model="password" id="password" type="password" class="cyber-input-text" required minlength="6" />
                </div>
                <button type="submit" class="btn-action glow-azure" :disabled="loading">
                    <span v-if="loading">{{ t('auth.loadingLogin') }}</span>
                    <span v-else>{{ t('auth.login') }}</span>
                </button>
                <p v-if="error" class="error-msg">{{ errorMessage }}</p>
            </form>
            <router-link to="/register" class="auth-link">{{ t('auth.registerHere') }}</router-link>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { loginUser } from '../../api/auth';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const router = useRouter();
const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref(false);
const errorMessage = ref('');

async function onSubmit() {
    error.value = false;
    loading.value = true;
    try {
        const res = await loginUser(username.value, password.value);
        // Qui puoi salvare token o dati utente (es. in Pinia o localStorage)
        console.log('Login success:', res.data);
        // Naviga alla dashboard o home protetta
        router.push('/dashboard');
    } catch (err) {
        error.value = true;
        errorMessage.value = err.response?.data?.message || t('auth.errorLogin');
    } finally {
        loading.value = false;
    }
}
</script>

<style scoped>
.auth-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: #080C14;
}

.auth-card {
    width: 100%;
    max-width: 400px;
    padding: 40px;
    background: rgba(16, 24, 48, 0.45);
    border: 1px solid rgba(74, 144, 226, 0.15);
    border-radius: 16px;
    backdrop-filter: blur(14px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.65);
}

.auth-card h2 {
    margin-bottom: 30px;
    justify-content: center;
}

.auth-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.auth-card input {
    width: 100%;
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(136, 170, 255, 0.2);
    border-radius: 8px;
    color: #e0e7ff;
    box-sizing: border-box;
}

.auth-card button {
    margin-top: 10px;
    padding: 14px;
    background: linear-gradient(135deg, #1E3799, #0C2461);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
}

.error-msg {
    color: #ff4c4c;
    font-size: 0.9rem;
    text-align: center;
    margin-top: 10px;
}

.auth-link {
    display: block;
    margin-top: 25px;
    text-align: center;
    color: #5FA5FF;
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 600;
}

.auth-link:hover {
    text-decoration: underline;
}
</style>
