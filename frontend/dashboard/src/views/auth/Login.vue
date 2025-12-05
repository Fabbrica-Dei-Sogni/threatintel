<template>
    <div class="login-container">
        <h2>{{ t('auth.login') }}</h2>
        <form @submit.prevent="onSubmit">
            <div>
                <label for="username">{{ t('auth.username') }}</label>
                <input v-model="username" id="username" required />
            </div>
            <div>
                <label for="password">{{ t('auth.password') }}</label>
                <input v-model="password" id="password" type="password" required minlength="6" />
            </div>
            <button type="submit" :disabled="loading">
                <span v-if="loading">{{ t('auth.loadingLogin') }}</span>
                <span v-else>{{ t('auth.login') }}</span>
            </button>
            <p v-if="error" class="error">{{ errorMessage }}</p>
        </form>
        <router-link to="/register">{{ t('auth.registerHere') }}</router-link>
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
.error {
    color: red;
    margin-top: 1rem;
}
</style>
