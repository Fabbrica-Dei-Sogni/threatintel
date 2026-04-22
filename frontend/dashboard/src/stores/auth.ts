import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { getAuthMode } from '../api/auth';
import router from '../router';
import { storage, StorageNamespace } from '../utils/storage';

interface AuthState {
    token: string | null;
    user: any | null;
}

export const useAuthStore = defineStore('auth', () => {
    // Caricamento iniziale dallo storage centralizzato
    const savedAuth = storage.get<AuthState>(StorageNamespace.AUTH);

    const token = ref<string | null>(savedAuth?.token || null);
    const user = ref<any | null>(savedAuth?.user || null);

    const isAuthenticated = computed(() => !!token.value);
    
    const isAdmin = computed(() => {
        if (!user.value || !user.value.roles) return false;
        return user.value.roles.some((role: any) => role.name === 'admin');
    });

    // Salvataggio automatico allo store ogni volta che token o user cambiano
    watch([token, user], () => {
        storage.set(StorageNamespace.AUTH, {
            token: token.value,
            user: user.value
        });
    }, { deep: true });

    async function checkAuthMode() {
        if (token.value) return;

        try {
            const response = await getAuthMode();
            if (response.data.allowAnonymous) {
                user.value = {
                    username: 'anonymous',
                    roles: [{ name: response.data.anonymousRole }]
                };
                console.info(`[AuthStore] Inizializzata sessione anonima (Ruolo: ${response.data.anonymousRole})`);
            }
        } catch (error) {
            console.warn('[AuthStore] Impossibile recuperare modalità anonima:', error);
        }
    }

    checkAuthMode();

    function setAuth(newToken: string, newUser: any) {
        token.value = newToken;
        user.value = newUser;
    }

    function logout() {
        token.value = null;
        user.value = null;
        storage.remove(StorageNamespace.AUTH);
        router.push('/login');
    }

    return {
        token,
        user,
        isAuthenticated,
        isAdmin,
        setAuth,
        logout,
        checkAuthMode
    };
});
