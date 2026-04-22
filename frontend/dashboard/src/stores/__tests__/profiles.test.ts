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
});
