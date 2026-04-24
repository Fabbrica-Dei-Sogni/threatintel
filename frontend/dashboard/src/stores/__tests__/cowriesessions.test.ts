import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCowrieSessionsStore } from '../cowriesessions';
import { storage, StorageNamespace } from '../../utils/storage';

describe('CowrieSessionsStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('should initialize and load from storage', () => {
        storage.set(StorageNamespace.COWRIE_SESSIONS, {
            filters: { category: 'command' }
        });

        const store = useCowrieSessionsStore();
        expect(store.state.filters.category).toBe('command');
    });

    it('should reset to defaults', () => {
        const store = useCowrieSessionsStore();
        store.state.filters.category = 'command';
        store.resetToDefaults();
        expect(store.state.filters.category).toBe('interaction');
    });
});
