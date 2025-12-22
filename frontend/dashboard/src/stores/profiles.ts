import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { HoneypotProfile } from '../models/HoneypotProfile';

export const useProfileStore = defineStore('profiles', () => {
    const profiles = ref<HoneypotProfile[]>(JSON.parse(localStorage.getItem('hp_profiles') || '[]'));
    const activeProfileId = ref<string | null>(localStorage.getItem('hp_active_profile_id'));

    // Default fallbacks from environment
    const defaultProfile: HoneypotProfile = {
        id: 'default',
        name: import.meta.env.VITE_HONEYPOT_NAME || 'Default Honeypot',
        apiUrl: localStorage.getItem('api_url') || import.meta.env.VITE_APP_API_URL || 'https://alessandromodica.com:2443/honeypot',
        lat: Number(import.meta.env.VITE_HONEYPOT_LOCATION_LAT) || 48.8566,
        lon: Number(import.meta.env.VITE_HONEYPOT_LOCATION_LON) || 2.3522
    };

    const activeProfile = computed(() => {
        const profile = profiles.value.find(p => p.id === activeProfileId.value);
        return profile || defaultProfile;
    });

    function generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback for non-secure contexts
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    function saveProfiles() {
        localStorage.setItem('hp_profiles', JSON.stringify(profiles.value));
        localStorage.setItem('hp_active_profile_id', activeProfileId.value || '');
    }

    function addProfile(profile: Omit<HoneypotProfile, 'id'>) {
        const id = generateUUID();
        profiles.value.push({ ...profile, id });
        saveProfiles();
        return id;
    }

    function updateProfile(id: string | null, updates: Partial<HoneypotProfile>) {
        const targetId = id || 'default';
        const index = profiles.value.findIndex(p => p.id === targetId);

        if (index !== -1) {
            // Update existing custom profile
            profiles.value[index] = { ...profiles.value[index], ...updates };
        } else if (targetId === 'default' || targetId === 'custom-default') {
            // If editing default, we create a new custom entry if it doesn't exist
            // This prevents mutating the hardcoded defaultProfile constant
            const newId = generateUUID();
            const newProfile = { ...defaultProfile, ...updates, id: newId };
            profiles.value.push(newProfile);
            activeProfileId.value = newId;
        } else {
            console.warn(`Profile ${targetId} not found and is not default.`);
        }
        saveProfiles();
    }

    function setActiveProfile(id: string | null) {
        activeProfileId.value = id;
        saveProfiles();
    }

    function deleteProfile(id: string) {
        profiles.value = profiles.value.filter(p => p.id !== id);
        if (activeProfileId.value === id) {
            activeProfileId.value = null;
        }
        saveProfiles();
    }

    return {
        profiles,
        activeProfileId,
        activeProfile,
        addProfile,
        updateProfile,
        setActiveProfile,
        deleteProfile,
        defaultProfile
    };
});
