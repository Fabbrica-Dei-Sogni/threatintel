import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAttacksStore } from '../attacks';
import { storage, StorageNamespace } from '../../utils/storage';

describe('AttacksStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('should initialize with default state', () => {
        const store = useAttacksStore();
        expect(store.state.filters.protocol).toBe('http');
        expect(store.state.filters.agoValue).toBe(10);
        expect(store.state.view.showMap).toBe(false);
    });

    it('should load state from storage', () => {
        const savedState = {
            filters: { protocol: 'ssh', agoValue: 30 },
            pagination: { page: 5 },
            view: { showMap: true }
        };
        storage.set(StorageNamespace.ATTACKS, savedState);

        const store = useAttacksStore();
        expect(store.state.filters.protocol).toBe('ssh');
        expect(store.state.filters.agoValue).toBe(30);
        expect(store.state.pagination.page).toBe(5);
        expect(store.state.view.showMap).toBe(true);
    });

    it('should perform migration for old 90 days default', () => {
        storage.set(StorageNamespace.ATTACKS, {
            filters: { agoValue: 90 }
        });

        const store = useAttacksStore();
        expect(store.state.filters.agoValue).toBe(10);
    });

    it('should reset to defaults', () => {
        const store = useAttacksStore();
        store.state.filters.protocol = 'ssh';
        store.state.pagination.page = 10;
        
        store.resetToDefaults();
        
        expect(store.state.filters.protocol).toBe('http');
        expect(store.state.pagination.page).toBe(1);
    });

    it('should toggle view elements', () => {
        const store = useAttacksStore();
        
        expect(store.state.view.showMap).toBe(false);
        store.toggleMap();
        expect(store.state.view.showMap).toBe(true);

        expect(store.state.view.showChart).toBe(false);
        store.toggleChart();
        expect(store.state.view.showChart).toBe(true);
    });

    it('should toggle danger levels', () => {
        const store = useAttacksStore();
        // Default is [3]
        expect(store.state.filters.dangerLevels).toContain(3);
        
        store.toggleDangerLevel(5);
        expect(store.state.filters.dangerLevels).toContain(5);
        expect(store.state.filters.dangerLevels).toContain(3);

        store.toggleDangerLevel(3);
        expect(store.state.filters.dangerLevels).not.toContain(3);
        expect(store.state.filters.dangerLevels).toContain(5);
    });

    it('should save to storage on change', async () => {
        const store = useAttacksStore();
        store.state.filters.ip = '8.8.8.8';
        
        // Wait for watcher to trigger
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const saved = storage.get<any>(StorageNamespace.ATTACKS);
        expect(saved).not.toBeNull();
        expect(saved.filters.ip).toBe('8.8.8.8');
    });
});
