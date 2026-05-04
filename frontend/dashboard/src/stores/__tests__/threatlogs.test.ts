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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useThreatLogsStore } from '../threatlogs';
import { storage, StorageNamespace } from '../../utils/storage';

describe('ThreatLogsStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('should initialize and load from storage', () => {
        storage.set(StorageNamespace.THREAT_LOGS, {
            filters: { protocol: 'ssh' }
        });

        const store = useThreatLogsStore();
        expect(store.state.filters.protocol).toBe('ssh');
    });

    it('should toggle chart', () => {
        const store = useThreatLogsStore();
        expect(store.state.view.showChart).toBe(false);
        store.toggleChart();
        expect(store.state.view.showChart).toBe(true);
    });

    it('should reset to defaults', () => {
        const store = useThreatLogsStore();
        store.state.filters.protocol = 'ssh';
        store.resetToDefaults();
        expect(store.state.filters.protocol).toBe('http');
    });
});
