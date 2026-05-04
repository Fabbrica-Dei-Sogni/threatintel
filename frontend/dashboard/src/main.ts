/**
 * ThreatIntel - Reference Implementation Dashboard
 * 
 * This file is part of the reference frontend implementation of the 
 * ThreatIntel Distributed Forensics Engine.
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Production or commercial use of this specific interface requires 
 * a valid commercial license from the author.
 */

import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import './assets/global.css';
import './assets/styles/cyber-shared.css';
import './assets/styles/classic-shared.css';
import i18n from './locales/index';
import { registerSW } from 'virtual:pwa-register';

// Registrazione automatica del Service Worker per la PWA
registerSW({
    immediate: true,
    onRegistered(r) {
        console.log('[PWA] Service Worker registrato con successo:', r);
    },
    onRegisterError(error) {
        console.error('[PWA] Errore durante la registrazione del Service Worker:', error);
    }
});

const pinia = createPinia();

createApp(App)
    .use(router)
    .use(pinia)
    .use(ElementPlus)
    .use(i18n)
    .mount('#app');
