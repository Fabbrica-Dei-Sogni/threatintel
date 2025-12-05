import { createI18n } from 'vue-i18n';
import itIT from './it-IT.json';
import enUS from './en-US.json';
import frFR from './fr-FR.json';
import deDE from './de-DE.json';
import plPL from './pl-PL.json';
import ruRU from './ru-RU.json';

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
        'en-CA': 'en-US',
        'fr': 'fr-FR',
        'fr-FR': 'fr-FR',
        'fr-BE': 'fr-FR',
        'fr-CH': 'fr-FR',
        'fr-CA': 'fr-FR',
        'de': 'de-DE',
        'de-DE': 'de-DE',
        'de-AT': 'de-DE',
        'de-CH': 'de-DE',
        'pl': 'pl-PL',
        'pl-PL': 'pl-PL',
        'ru': 'ru-RU',
        'ru-RU': 'ru-RU'
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

const i18n = createI18n({
    legacy: false,
    locale: getInitialLocale(),
    fallbackLocale: 'en-US',
    messages: {
        'it-IT': itIT,
        'en-US': enUS,
        'fr-FR': frFR,
        'de-DE': deDE,
        'pl-PL': plPL,
        'ru-RU': ruRU
    },
    globalInjection: true,
    missingWarn: false,
    fallbackWarn: false
});

export default i18n;
