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

import { computed } from 'vue';
import { useI18n as useVueI18n } from 'vue-i18n';
import { storage, StorageNamespace } from '../utils/storage';

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
            
            // Salva la preferenza nel namespace SETTINGS
            const currentSettings = storage.get<any>(StorageNamespace.SETTINGS) || {};
            storage.set(StorageNamespace.SETTINGS, {
                ...currentSettings,
                userLocale: newLocale
            });
        }
    });

    // Lingue disponibili (recuperate dinamicamente da i18n)
    const availableLocales = computed(() => i18n.availableLocales);

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
