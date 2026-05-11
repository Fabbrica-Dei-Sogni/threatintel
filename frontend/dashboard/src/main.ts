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

// Registrazione manuale del Service Worker per la PWA
const updateSW = registerSW({
    immediate: true,
    onRegistered(r) {
        console.log('[PWA] Service Worker registrato:', r?.scope);
    },
    onNeedRefresh() {
        console.log('[PWA] Nuovo contenuto disponibile, ricaricare la pagina.');
        if (confirm('Nuovo aggiornamento disponibile. Ricaricare ora?')) {
            updateSW(true);
        }
    },
    onOfflineReady() {
        console.log('[PWA] App pronta per l\'uso offline.');
    },
    onRegisterError(error) {
        console.error('[PWA] Errore SW:', error);
    }
});

import { getEnv } from './config';

// Imposta il titolo del documento
document.title = getEnv('VITE_APP_TITLE');

// Log della versione per verifica build (usa getEnv per supportare override runtime)
console.log(
    `%c ${getEnv('VITE_APP_TITLE')} %c v${getEnv('VITE_APP_VERSION')} `,
    'background: #222; color: #bada55; padding: 2px 5px; border-radius: 3px 0 0 3px;',
    'background: #bada55; color: #222; padding: 2px 5px; border-radius: 0 3px 3px 0; font-weight: bold;'
);

const pinia = createPinia();

createApp(App)
    .use(router)
    .use(pinia)
    .use(ElementPlus)
    .use(i18n)
    .mount('#app');
