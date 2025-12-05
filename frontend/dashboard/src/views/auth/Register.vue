<template>
    <div class="register-container">
        <h2>{{ t('auth.register') }}</h2>
        <form @submit.prevent="onSubmit">
            <div>
                <label for="username">{{ t('auth.username') }}</label>
                <input v-model="username" id="username" required />
            </div>
            <div>
                <label for="email">{{ t('auth.email') }}</label>
                <input v-model="email" id="email" type="email" required />
            </div>
            <div>
                <label for="password">{{ t('auth.password') }}</label>
                <input v-model="password" id="password" type="password" required minlength="6" />
            </div>
            <button type="submit" :disabled="loading">
                <span v-if="loading">{{ t('auth.loadingLogin') }}</span>
                <span v-else>{{ t('auth.register') }}</span>
            </button>
            <p v-if="error" class="error">{{ errorMessage }}</p>
        </form>
        <router-link to="/login">{{ t('auth.loginHere') }}</router-link>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { registerUser } from '../../api/auth';
import { useI18n } from 'vue-i18n';

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
        await registerUser(username.value, email.value, password.value);
        // Dopo registrazione con successo, reindirizza a login
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
.error {
    color: red;
    margin-top: 1rem;
}
</style>
