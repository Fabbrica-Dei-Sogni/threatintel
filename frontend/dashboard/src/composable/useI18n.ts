import { computed } from 'vue';
import { useI18n as useVueI18n } from 'vue-i18n';

/**
 * Composable personalizzato per gestire l'internazionalizzazione
 * Fornisce funzioni helper per il cambio lingua e accesso alle traduzioni
 */
export function useI18n() {
    const i18n = useVueI18n();

    // Locale corrente (reattivo)
    const locale = computed({
        get: () => i18n.locale.value,
        set: (newLocale: string) => {
            i18n.locale.value = newLocale;
            // Opzionale: salva la preferenza nel localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem('userLocale', newLocale);
            }
        }
    });

    // Lingue disponibili
    const availableLocales = computed(() => ['it-IT', 'en-US']);

    // Funzione per cambiare lingua
    const setLocale = (newLocale: string) => {
        if (availableLocales.value.includes(newLocale)) {
            locale.value = newLocale;
        } else {
            console.warn(`Locale ${newLocale} non disponibile`);
        }
    };

    // Funzione di traduzione (shorthand)
    const { t } = i18n;

    return {
        locale,
        availableLocales,
        setLocale,
        t
    };
}
