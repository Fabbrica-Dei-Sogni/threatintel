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
import { useDashboardStore } from '../dashboard';
import { storage, StorageNamespace } from '../../utils/storage';

describe('DashboardStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('should initialize with default state', () => {
        const store = useDashboardStore();
        expect(store.state.rankings.attackProtocol).toBe('http');
        expect(store.state.showTicker).toBe(true);
    });

    it('should load state from storage and migrate old defaults', () => {
        storage.set(StorageNamespace.DASHBOARD, {
            rankings: { attackTimeValue: 90, logProtocol: 'ssh' },
            activeWidgets: ['w1'],
            showTicker: false
        });

        const store = useDashboardStore();
        expect(store.state.rankings.attackTimeValue).toBe(10); // Migrated
        expect(store.state.rankings.logProtocol).toBe('ssh');
        expect(store.state.activeWidgets).toEqual(['w1']);
        expect(store.state.showTicker).toBe(false);
    });

    it('should reset to defaults', () => {
        const store = useDashboardStore();
        store.state.rankings.attackProtocol = 'ssh';
        store.state.showTicker = false;
        
        store.resetToDefaults();
        
        expect(store.state.rankings.attackProtocol).toBe('http');
        expect(store.state.showTicker).toBe(true);
    });

    it('should toggle widgets', () => {
        const store = useDashboardStore();
        expect(store.isWidgetActive('test')).toBe(false);
        
        store.toggleWidget('test');
        expect(store.isWidgetActive('test')).toBe(true);
        
        store.toggleWidget('test');
        expect(store.isWidgetActive('test')).toBe(false);
    });

    it('should toggle defcon levels', () => {
        const store = useDashboardStore();
        expect(store.state.rankings.dangerLevels).toContain(3);
        
        store.toggleDefconLevel(5);
        expect(store.state.rankings.dangerLevels).toContain(5);
        
        store.toggleDefconLevel(3);
        expect(store.state.rankings.dangerLevels).not.toContain(3);
    });

    it('should handle undefined dangerLevels during toggle', () => {
        const store = useDashboardStore();
        (store.state.rankings as any).dangerLevels = undefined;
        
        store.toggleDefconLevel(1);
        expect(store.state.rankings.dangerLevels).toEqual([1]);
    });

    it('should reset specific contexts', () => {
        const store = useDashboardStore();
        store.state.rankings.attackProtocol = 'ssh';
        store.state.rankings.logPage = 10;
        store.state.rankings.sessionPage = 5;

        store.resetAttacks();
        expect(store.state.rankings.attackProtocol).toBe('http');

        store.resetLogs();
        expect(store.state.rankings.logPage).toBe(1);

        store.resetSessions();
        expect(store.state.rankings.sessionPage).toBe(1);
    });
});
