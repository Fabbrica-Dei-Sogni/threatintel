import { createI18n } from 'vue-i18n';
import itIT from './it-IT.json';
import enUS from './en-US.json';

/**
 * Rileva la lingua del browser e la mappa alle lingue supportate
 */
function getBrowserLocale(): string {
    const browserLang = navigator.language || (navigator as any).userLanguage;

    // Mappa lingue browser → lingue supportate
    const localeMap: Record<string, string> = {
        'it': 'it-IT',
        'it-IT': 'it-IT',
        'it-CH': 'it-IT',
        'en': 'en-US',
        'en-US': 'en-US',
        'en-GB': 'en-US',
        'en-AU': 'en-US',
        'en-CA': 'en-US'
    };

    // Prova prima con il codice completo (es. "it-IT")
    if (localeMap[browserLang]) {
        return localeMap[browserLang];
    }

    // Prova con solo il codice lingua (es. "it" da "it-IT")
    const langCode = browserLang.split('-')[0];
    if (localeMap[langCode]) {
        return localeMap[langCode];
    }

    // Fallback a italiano
    return 'it-IT';
}

/**
 * Determina il locale iniziale con questa priorità:
 * 1. Preferenza salvata dall'utente (localStorage)
 * 2. Lingua del browser
 * 3. Fallback a italiano
 */
function getInitialLocale(): string {
    const savedLocale = localStorage.getItem('user-locale');

    if (savedLocale) {
        console.log('🌍 i18n: Using saved locale:', savedLocale);
        return savedLocale;
    }

    const browserLocale = getBrowserLocale();
    console.log('🌍 i18n: Detected browser locale:', browserLocale);
    return browserLocale;
}

// Configurazione i18n
const i18n = createI18n({
    legacy: false, // Usa Composition API mode
    locale: getInitialLocale(), // Lingua di default: Italiano
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
