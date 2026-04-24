import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useProfileStore } from '../profiles';

describe('ProfileStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('should use default profile when no active profile is set', () => {
    const store = useProfileStore();
    expect(store.activeProfile.id).toBe('default');
    expect(store.activeProfile.apiUrl).toBe('https://alessandromodica.com/honeypot/api');
  });

  it('should add a new custom profile', () => {
    const store = useProfileStore();
    const newProfile = {
      name: 'Test HP',
      apiUrl: 'http://test.com/api',
      lat: 10,
      lon: 20
    };
    
    const id = store.addProfile(newProfile);
    expect(id).toBeDefined();
    expect(store.profiles.length).toBe(1);
    expect(store.profiles[0].name).toBe('Test HP');
  });

  it('should set active profile', () => {
    const store = useProfileStore();
    const id = store.addProfile({ name: 'P1', apiUrl: 'U1', lat: 0, lon: 0 });
    
    store.setActiveProfile(id);
    expect(store.activeProfileId).toBe(id);
    expect(store.activeProfile.name).toBe('P1');
  });

  it('should update profile', () => {
    const store = useProfileStore();
    const id = store.addProfile({ name: 'P1', apiUrl: 'U1', lat: 0, lon: 0 });
    
    store.updateProfile(id, { name: 'P1 Updated' });
    expect(store.profiles[0].name).toBe('P1 Updated');
  });

  it('should delete profile', () => {
    const store = useProfileStore();
    const id = store.addProfile({ name: 'P1', apiUrl: 'U1', lat: 0, lon: 0 });
    store.setActiveProfile(id);
    
    store.deleteProfile(id);
    expect(store.profiles.length).toBe(0);
    expect(store.activeProfileId).toBe(null);
  });

  it('should generate UUID fallback when crypto is not available', () => {
    const originalCrypto = (window as any).crypto;
    // @ts-ignore
    delete (window as any).crypto;
    
    const store = useProfileStore();
    const id = store.addProfile({ name: 'P', apiUrl: 'U', lat: 0, lon: 0 });
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    
    (window as any).crypto = originalCrypto;
  });

  it('should handle update with default ID', () => {
    const store = useProfileStore();
    store.updateProfile(null, { name: 'New Default' });
    expect(store.profiles.length).toBe(1);
    expect(store.activeProfileId).not.toBeNull();
  });

  it('should handle deletion of non-active profile', () => {
    const store = useProfileStore();
    const id1 = store.addProfile({ name: 'P1', apiUrl: 'U1', lat: 0, lon: 0 });
    const id2 = store.addProfile({ name: 'P2', apiUrl: 'U2', lat: 0, lon: 0 });
    store.setActiveProfile(id1);
    
    store.deleteProfile(id2);
    expect(store.activeProfileId).toBe(id1);
  });
});
