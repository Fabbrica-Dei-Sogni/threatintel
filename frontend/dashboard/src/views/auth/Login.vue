<template>
    <div class="login-container">
        <h2>Login</h2>
        <form @submit.prevent="onSubmit">
            <div>
                <label for="username">Username</label>
                <input v-model="username" id="username" required />
            </div>
            <div>
                <label for="password">Password</label>
                <input v-model="password" id="password" type="password" required minlength="6" />
            </div>
            <button type="submit" :disabled="loading">
                <span v-if="loading">Loading...</span>
                <span v-else>Login</span>
            </button>
            <p v-if="error" class="error">{{ errorMessage }}</p>
        </form>
        <router-link to="/register">Register here</router-link>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { loginUser } from '../../api/auth';

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
        errorMessage.value = err.response?.data?.message || 'Errore durante il login';
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
