import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import './assets/global.css';
import i18n from './locales/index';

const pinia = createPinia();

createApp(App)
    .use(router)
    .use(pinia)
    .use(ElementPlus)
    .use(i18n)
    .mount('#app');
