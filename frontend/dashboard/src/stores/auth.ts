import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('auth_token'));
    const user = ref(JSON.parse(localStorage.getItem('user_info') || 'null'));

    const isAuthenticated = computed(() => !!token.value);
    
    const isAdmin = computed(() => {
        if (!user.value || !user.value.roles) return false;
        return user.value.roles.some((role: any) => role.name === 'admin');
    });

    function setAuth(newToken: string, newUser: any) {
        token.value = newToken;
        user.value = newUser;
        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('user_info', JSON.stringify(newUser));
    }

    function logout() {
        token.value = null;
        user.value = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
        window.location.href = '/login';
    }

    return {
        token,
        user,
        isAuthenticated,
        isAdmin,
        setAuth,
        logout
    };
});
