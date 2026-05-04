<!--
  ThreatIntel - Reference Implementation Dashboard
  
  This frontend application is provided as a reference implementation of the 
  ThreatIntel Distributed Forensics Engine. 
  
  Copyright (C) 2026 Alessandro Modica. All rights reserved.
  
  Use of this frontend for educational, research, and non-commercial purposes 
  is permitted. Production or commercial use of this specific dashboard 
  interface requires a valid commercial license from the author.
-->

<template>
  <div id="app-container">
    <router-view />

    <template v-if="authStore.isAuthenticated">
      <DossierRecorder />
      <DossierToggle />
    </template>

    <!-- Floating Settings Button (Solo per Admin) -->
    <router-link v-if="authStore.isAdmin" to="/settings" class="floating-settings"
      :class="{ 'recorder-active': dossierStore.isEnabled && dossierStore.sections.length > 0 }"
      :title="t('nav.settings')">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z">
        </path>
      </svg>
    </router-link>

    <!-- Floating Login / Logout Button -->
    <div v-if="!isAuthPage" class="floating-auth-group" :class="{
      'has-settings': authStore.isAdmin,
      'recorder-active': dossierStore.isEnabled && dossierStore.sections.length > 0
    }">
      <router-link v-if="!authStore.isAuthenticated" to="/login" class="floating-login" :title="t('auth.login')">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </router-link>
      <button v-else @click="authStore.logout()" class="floating-logout" :title="t('auth.logout')">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
      </button>
    </div>

    <GlobalNavMenu />
    
    <!-- App Version Display -->
    <div class="app-version">v{{ appVersion }}</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import DossierRecorder from './components/DossierRecorder.vue';
import DossierToggle from './components/DossierToggle.vue';
import GlobalNavMenu from './components/GlobalNavMenu.vue';
import { useDossierStore } from './stores/dossier';
import { useAuthStore } from './stores/auth';

const { t } = useI18n();
const route = useRoute();
const dossierStore = useDossierStore();
const authStore = useAuthStore();

const appVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';
const isAuthPage = computed(() => route.path === '/login' || route.path === '/register');

onMounted(() => {
  // Controlla se l'app è già in modalità standalone (installata)
  if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
    (window as any).isPwaInstalled = true;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    (window as any).deferredPwaPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-prompt-available'));
  });

  window.addEventListener('appinstalled', () => {
    (window as any).isPwaInstalled = true;
    (window as any).deferredPwaPrompt = null;
    window.dispatchEvent(new CustomEvent('pwa-installed-success'));
  });
});
</script>

<style>
#app-container {
  position: relative;
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden;
}

.floating-settings {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 54px;
  height: 54px;
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  color: #ffb74d;
  /* Colore ambra/arancio caldo */
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  text-decoration: none;
}

.floating-settings:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: #ffb74d;
  color: #1a1a1a;
  background-color: #ffb74d;
  transform: scale(1.1) translateY(-2px);
  box-shadow: 0 12px 40px rgba(255, 183, 77, 0.3), 0 0 20px rgba(255, 183, 77, 0.2);
}

.floating-settings svg {
  width: 26px;
  height: 26px;
  transition: transform 0.3s ease;
}

.floating-settings:hover svg {
  transform: rotate(45deg);
}

.recorder-active {
  bottom: 84px !important;
}

.floating-login,
.floating-logout {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 54px;
  height: 54px;
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;
  text-decoration: none;
}

.floating-login {
  color: #4ade80;
}

.floating-logout {
  color: #ff4c4c;
}

/* Logica di posizionamento dinamico */
.floating-auth-group.has-settings .floating-login,
.floating-auth-group.has-settings .floating-logout {
  bottom: 100px; /* Spostato leggermente più su per via delle dimensioni maggiori */
}

.floating-auth-group.recorder-active .floating-login,
.floating-auth-group.recorder-active .floating-logout {
  bottom: 94px;
}

.floating-auth-group.has-settings.recorder-active .floating-login,
.floating-auth-group.has-settings.recorder-active .floating-logout {
  bottom: 170px;
}

.floating-login:hover {
  background: #4ade80;
  color: #1a1a1a;
  transform: scale(1.1) translateY(-2px);
  box-shadow: 0 12px 40px rgba(74, 222, 128, 0.3);
}

.floating-logout:hover {
  background: #ff4c4c;
  color: #1a1a1a;
  transform: scale(1.1) translateY(-2px);
  box-shadow: 0 12px 40px rgba(255, 76, 76, 0.3);
}

.floating-login svg,
.floating-logout svg {
  width: 26px;
  height: 26px;
  transition: transform 0.3s ease;
}

@media (max-width: 600px) {
  .floating-settings {
    right: 15px;
    bottom: 24px;
    width: 44px;
    height: 44px;
  }

  .floating-settings svg {
    width: 20px;
    height: 20px;
  }

  .floating-settings.recorder-active {
    bottom: 84px !important;
  }

  .floating-login,
  .floating-logout {
    right: 15px;
    bottom: 24px;
    width: 44px;
    height: 44px;
  }

  .floating-auth-group.has-settings .floating-login,
  .floating-auth-group.has-settings .floating-logout {
    bottom: 90px;
  }

  .floating-auth-group.recorder-active .floating-login,
  .floating-auth-group.recorder-active .floating-logout {
    bottom: 94px;
  }

  .floating-auth-group.has-settings.recorder-active .floating-login,
  .floating-auth-group.has-settings.recorder-active .floating-logout {
    bottom: 160px;
  }
}

.app-version {
  position: fixed;
  bottom: 8px;
  left: 12px;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.2);
  font-family: 'Courier New', Courier, monospace;
  pointer-events: none;
  z-index: 10;
  letter-spacing: 1px;
}
</style>
