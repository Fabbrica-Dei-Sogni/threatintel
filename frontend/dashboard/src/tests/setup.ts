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

// Mock base per vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    tm: (key: string) => key, // Mock di template manager
    locale: { value: 'it-IT' }
  }),
}));
