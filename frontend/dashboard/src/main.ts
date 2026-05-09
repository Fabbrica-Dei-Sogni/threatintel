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

// Log della versione per verifica build
console.log(
    `%c ${import.meta.env.VITE_APP_TITLE} %c v${import.meta.env.VITE_APP_VERSION} `,
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
