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
import { useViewSettingsStore } from '../viewSettings';
import { storage, StorageNamespace } from '../../utils/storage';
import { nextTick } from 'vue';

describe('ViewSettingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const store = useViewSettingsStore();
    expect(store.dashboardSkin).toBe('cyber');
    expect(store.telemetryTimeframe).toBe('24h');
  });

  it('should persist changes to localStorage via StorageManager', async () => {
    const store = useViewSettingsStore();
    
    store.dashboardSkin = 'magma';
    store.telemetryScore = 50;

    // Attendiamo che il watcher di Pinia/Vue scatti
    await nextTick();

    const saved = storage.get<any>(StorageNamespace.SETTINGS);
    expect(saved).not.toBeNull();
    expect(saved.dashboardSkin).toBe('magma');
    expect(saved.telemetryScore).toBe(50);
  });

  it('should load initial state from StorageManager', () => {
    const mockSettings = {
        dashboardSkin: 'anthracite',
        telemetryTimeframe: '1w'
    };
    storage.set(StorageNamespace.SETTINGS, mockSettings);

    const store = useViewSettingsStore();
    expect(store.dashboardSkin).toBe('anthracite');
    expect(store.telemetryTimeframe).toBe('1w');
  });
});
