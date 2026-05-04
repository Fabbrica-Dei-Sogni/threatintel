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

import { vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

// Setup globale per Pinia
beforeEach(() => {
  setActivePinia(createPinia());
});

// Mock di variabili d'ambiente se necessario
vi.stubGlobal('import.meta', {
  env: {
    VITE_API_URL: 'http://localhost:3000/api',
  },
});

import { ref } from 'vue';

// Mock base per vue-i18n
const mockLocale = ref('it-IT');
const mockAvailableLocales = ref(['it-IT', 'en-US', 'de-DE', 'fr-FR', 'pl-PL', 'ru-RU']);

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    tm: (key: string) => key,
    locale: mockLocale,
    availableLocales: mockAvailableLocales
  }),
}));
