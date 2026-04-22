import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { nextTick } from 'vue';
import { useViewSettingsStore } from '../viewSettings';

describe('ViewSettingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('should initialize with default values', () => {
    const store = useViewSettingsStore();
    expect(store.dashboardSkin).toBe('cyber');
    expect(store.attacksShowChart).toBe(true);
    expect(store.telemetryTimeframe).toBe('24h');
  });

  it('should persist changes to localStorage', async () => {
    const store = useViewSettingsStore();
    
    store.dashboardSkin = 'magma';
    store.telemetryScore = 50;
    
    // Attendiamo il watcher (nextTick)
    await nextTick();
    
    const saved = JSON.parse(localStorage.getItem('hp_view_settings') || '{}');
    expect(saved.dashboardSkin).toBe('magma');
    expect(saved.telemetryScore).toBe(50);
  });

  it('should load initial state from localStorage', () => {
    const settings = {
      dashboardSkin: 'anthracite',
      telemetryTimeframe: '1w'
    };
    localStorage.setItem('hp_view_settings', JSON.stringify(settings));
    
    const store = useViewSettingsStore();
    expect(store.dashboardSkin).toBe('anthracite');
    expect(store.telemetryTimeframe).toBe('1w');
  });
});
