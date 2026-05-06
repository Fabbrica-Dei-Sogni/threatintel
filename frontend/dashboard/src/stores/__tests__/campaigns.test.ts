import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';
import { nextTick } from 'vue';
import { useCampaignsStore } from '../campaigns';
import { storage, StorageNamespace } from '../../utils/storage';

describe('Campaigns Store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        storage.clearAll(); // Ensure clean state
    });

    it('should initialize with default values', () => {
        const store = useCampaignsStore();
        expect(store.state.filters.minIps).toBe(1);
        expect(store.state.filters.timeMode).toBe('ago');
        expect(store.state.filters.agoValue).toBe(7);
        expect(store.state.filters.agoUnit).toBe('days');
        expect(store.state.pagination.page).toBe(1);
    });

    it('should reset filters to defaults', () => {
        const store = useCampaignsStore();
        
        // Modify filters
        store.state.filters.minIps = 5;
        store.state.filters.agoValue = 10;
        store.state.pagination.page = 3;

        store.resetFilters();

        expect(store.state.filters.minIps).toBe(1);
        expect(store.state.filters.agoValue).toBe(7);
        expect(store.state.pagination.page).toBe(1);
    });

    it('should update page', () => {
        const store = useCampaignsStore();
        store.state.pagination.page = 5;
        expect(store.state.pagination.page).toBe(5);
    });

    it('should load from storage if available', () => {
        // Prepare storage with some data
        const mockData = {
            filters: {
                minIps: 10,
                timeMode: 'range' as const
            },
            sorting: {
                field: 'totalLogs',
                order: 1
            }
        };
        
        storage.set(StorageNamespace.CAMPAIGNS, mockData);
        
        const store = useCampaignsStore();
        expect(store.state.filters.minIps).toBe(10);
        expect(store.state.filters.timeMode).toBe('range');
        expect(store.state.sorting.field).toBe('totalLogs');
    });

    it('should save to storage on change', async () => {
        const store = useCampaignsStore();
        store.state.filters.minIps = 7;
        
        await nextTick();
        
        const saved = storage.get(StorageNamespace.CAMPAIGNS) as any;
        expect(saved.filters.minIps).toBe(7);
    });
});
