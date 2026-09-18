import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { getAuthMode } from '../api/auth';
import router from '../router';
import { storage, StorageNamespace } from '../utils/storage';
import { getEnv } from '../config';

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

        // APP_ID di questa istanza ThreatIntel (es. 'honeypot-host-001')
        // Se non configurato (dev locale), non blocchiamo sul filtro appId
        const currentAppId = getEnv('APP_ID');

        return user.value.roles.some((r: any) => {
            // Struttura reale post-populate: { appId: string, role: { name: string } }
            // Struttura flat per utenti anonimi/legacy: { name: string }
            const roleName: string = r.role?.name || r.name;

            // Il superadmin è un ruolo di sistema (ips-management): bypass globale
            if (roleName === 'superadmin') return true;

            // Per il ruolo admin: deve appartenere a questa specifica app
            if (roleName === 'admin') {
                // Se appId non è configurato (dev), accettiamo qualsiasi admin
                if (!currentAppId) return true;
                // Struttura annidata: verifica appId esplicito
                if (r.appId) return r.appId === currentAppId;
                // Struttura flat (anonimo): nessun appId → accettiamo
                return true;
            }

            return false;
        });
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

    /**
     * Gestione centralizzata di qualsiasi errore di autenticazione (401/403).
     * Pulisce lo stato locale e redirige al login tramite Vue Router.
     * Evita il redirect se siamo già sulla pagina di login/register.
     */
    function handleAuthError(redirectPath?: string) {
        const currentPath = router.currentRoute.value.fullPath;
        const isAuthPage = ['/login', '/register'].some(p => currentPath.startsWith(p));

        // Pulizia stato
        token.value = null;
        user.value = null;
        storage.remove(StorageNamespace.AUTH);

        if (!isAuthPage) {
            const target = redirectPath || currentPath;
            console.warn(`[AuthStore] Sessione non valida. Redirect a /login (da: ${target})`);
            router.push({ name: 'Login', query: { redirect: target } });
        }
    }

    return {
        token,
        user,
        isAuthenticated,
        isAdmin,
        setAuth,
        logout,
        handleAuthError,
        checkAuthMode
    };
});
