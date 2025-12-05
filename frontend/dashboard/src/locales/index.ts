import { createI18n } from 'vue-i18n';
import itIT from './it-IT.json';
import enUS from './en-US.json';

// Configurazione i18n
const i18n = createI18n({
    legacy: false, // Usa Composition API mode
    locale: 'it-IT', // Lingua di default: Italiano
    fallbackLocale: 'en-US', // Lingua di fallback
    messages: {
        'it-IT': itIT,
        'en-US': enUS
    },
    // Opzioni aggiuntive
    globalInjection: true, // Abilita $t globalmente nei template
    missingWarn: false, // Disabilita warning per chiavi mancanti in produzione
    fallbackWarn: false
});

export default i18n;
