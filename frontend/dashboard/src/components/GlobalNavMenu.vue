<!--
  ThreatIntel - Reference Implementation Dashboard
  
  This frontend application is provided as a reference implementation of the 
  ThreatIntel Distributed Forensics Engine. 
  
  Copyright (C) 2026 Alessandro Modica. All rights reserved.
  
  Use of this frontend for educational, research, and non-commercial purposes 
  is permitted. Production or commercial use of this specific dashboard 
  interface requires a valid commercial license from the author.
  
  See root LICENSE.md for core engine licensing details.
-->
<template>
  <transition name="hub-bounce">
    <div class="global-nav-container" v-if="!dossierStore.isEnabled" :class="{ 'menu-open': isOpen }">
      <!-- Overlay backdrop to close menu when clicking outside -->
      <div class="nav-backdrop" v-if="isOpen" @click="isOpen = false"></div>

      <div class="fan-menu">
        <!-- Fan Items -->
        <router-link v-for="(item, index) in availableOptions" :key="item.path" :to="item.path"
          class="fan-item shadow-2xl glass-card" :class="[`pos-${index}`]" @click="isOpen = false" :title="item.label">
          <span class="fan-icon">{{ item.icon }}</span>
        </router-link>

        <!-- Main Hub Button -->
        <button class="hub-btn shadow-2xl pulse-glow" :class="`theme-${currentDomain}`" @click="isOpen = !isOpen"
          :title="t('nav.menu')">
          <transition name="icon-spin" mode="out-in">
            <span v-if="isOpen" class="hub-icon close">✕</span>
            <span v-else class="hub-icon open">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
                <circle cx="12" cy="12" r="10"></circle>
              </svg>
            </span>
          </transition>
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useDossierStore } from '../stores/dossier';
import { useAuthStore } from '../stores/auth';

const { t } = useI18n();
const route = useRoute();
const dossierStore = useDossierStore();
const authStore = useAuthStore();

const isOpen = ref(false);

const allOptions = computed(() => {
  const options = [
    { path: '/', domain: 'home', icon: '🏠', label: t('home.dashboard') },
    { path: '/attacks', domain: 'attack', icon: '🛰️', label: t('attacks.title') },
    { path: '/telnet-sessions', domain: 'telnet', icon: '📟', label: t('home.telnet') }
  ];

  // Aggiungi Dossiers solo se l'utente è autenticato (non anonimo)
  if (authStore.isAuthenticated) {
    options.splice(1, 0, { path: '/dossiers', domain: 'dossier', icon: '📁', label: t('common.dossier') });
  }

  return options;
});

const currentDomain = computed(() => {
  const p = route.path;
  if (p.includes('/dossier')) return 'dossier';
  if (p.includes('/attack') || p.includes('/ip/') || p.includes('/threatlog')) return 'attack';
  if (p.includes('/telnet') || p.includes('/cowrie')) return 'telnet';
  return 'home'; // default for '/', '/settings', etc.
});

const availableOptions = computed(() => {
  return allOptions.value.filter(opt => opt.domain !== currentDomain.value);
});
</script>

<style scoped>
.global-nav-container {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.nav-backdrop {
  position: fixed;
  inset: 0;
  z-index: 990;
  background: rgba(2, 6, 17, 0.4);
  backdrop-filter: blur(4px);
  /* The backdrop covers the whole screen but doesn't move the container */
  left: 0;
  transform: none;
}

/* Hub Drop/Bounce Transition */
.hub-bounce-enter-active {
  animation: bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.hub-bounce-leave-active {
  animation: bounce-out 0.3s ease-in;
}

@keyframes bounce-in {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(100px);
  }

  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes bounce-out {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(100px);
  }
}

.fan-menu {
  position: relative;
  width: 60px;
  height: 60px;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.hub-btn {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 1px solid rgba(136, 170, 255, 0.4);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1005;
  /* Must be above fan items */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
}

/* THEMES */
.theme-home {
  background: radial-gradient(circle at top left, #1E3799, #0C2461);
  border-color: rgba(136, 170, 255, 0.4);
}

.theme-home.pulse-glow {
  box-shadow: 0 0 20px rgba(74, 105, 189, 0.5), inset 0 0 10px rgba(255, 255, 255, 0.1);
}

.theme-dossier {
  background: radial-gradient(circle at top left, #6366f1, #312e81);
  border-color: rgba(99, 102, 241, 0.4);
}

.theme-dossier.pulse-glow {
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.5), inset 0 0 10px rgba(255, 255, 255, 0.1);
}

.theme-attack {
  background: radial-gradient(circle at top left, #e11d48, #881337);
  border-color: rgba(225, 29, 72, 0.4);
}

.theme-attack.pulse-glow {
  box-shadow: 0 0 20px rgba(225, 29, 72, 0.5), inset 0 0 10px rgba(255, 255, 255, 0.1);
}

.theme-telnet {
  background: radial-gradient(circle at top left, #10b981, #064e3b);
  border-color: rgba(16, 185, 129, 0.4);
}

.theme-telnet.pulse-glow {
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.5), inset 0 0 10px rgba(255, 255, 255, 0.1);
}

.menu-open .hub-btn {
  background: #0f172a !important;
  border-color: #ef4444 !important;
  transform: scale(0.9);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.4) !important;
}

.hub-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.hub-icon.close {
  color: #ef4444;
}

/* Fan Items */
.fan-item {
  position: absolute;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  font-size: 1.4rem;
  color: #fff;
  z-index: 1000;
  /* Below the hub button */

  /* Initial state (hidden under hub) */
  top: 5px;
  left: 5px;
  opacity: 0;
  transform: scale(0.5) translate(0, 0);
  transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  pointer-events: none;
}

.menu-open .fan-item {
  opacity: 1;
  pointer-events: auto;
}

/* 
  Calculating the Arc for 3 items:
  Center item goes straight up (-85px).
  Left item goes left (-75px) and up (-50px).
  Right item goes right (75px) and up (-50px).
*/
.menu-open .fan-item.pos-0 {
  transform: scale(1) translate(-75px, -50px);
}

.menu-open .fan-item.pos-1 {
  transform: scale(1) translate(0px, -85px);
}

.menu-open .fan-item.pos-2 {
  transform: scale(1) translate(75px, -50px);
}

.fan-item:hover {
  background: #1E3799;
  border-color: #5FA5FF;
  box-shadow: 0 0 20px rgba(95, 165, 255, 0.5);
  z-index: 1010;
}

/* Icon Spin Transition */
.icon-spin-enter-active,
.icon-spin-leave-active {
  transition: all 0.3s ease;
}

.icon-spin-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.5);
}

.icon-spin-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.5);
}

@media (max-width: 600px) {
  .hub-btn {
    width: 54px;
    height: 54px;
  }

  .fan-menu {
    width: 54px;
    height: 54px;
  }

  .fan-item {
    width: 46px;
    height: 46px;
    top: 4px;
    left: 4px;
    font-size: 1.2rem;
  }

  .menu-open .fan-item.pos-0 {
    transform: scale(1) translate(-65px, -45px);
  }

  .menu-open .fan-item.pos-1 {
    transform: scale(1) translate(0px, -75px);
  }

  .menu-open .fan-item.pos-2 {
    transform: scale(1) translate(65px, -45px);
  }
}
</style>
