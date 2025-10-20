<template>
    <div class="register-container">
        <h2>Register</h2>
        <form @submit.prevent="onSubmit">
            <div>
                <label for="username">Username</label>
                <input v-model="username" id="username" required />
            </div>
            <div>
                <label for="email">Email</label>
                <input v-model="email" id="email" type="email" required />
            </div>
            <div>
                <label for="password">Password</label>
                <input v-model="password" id="password" type="password" required minlength="6" />
            </div>
            <button type="submit" :disabled="loading">
                <span v-if="loading">Loading...</span>
                <span v-else>Register</span>
            </button>
            <p v-if="error" class="error">{{ errorMessage }}</p>
        </form>
        <router-link to="/login">Already have an account? Login here</router-link>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { registerUser } from '../../api/auth';

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
        await registerUser(username.value, email.value, password.value);
        // Dopo registrazione con successo, reindirizza a login
        router.push('/login');
    } catch (err) {
        error.value = true;
        errorMessage.value = err.response?.data?.message || 'Errore durante la registrazione';
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
