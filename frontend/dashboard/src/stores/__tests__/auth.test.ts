import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../auth';
import * as authApi from '../../api/auth';
import { storage, StorageNamespace } from '../../utils/storage';
import { nextTick } from 'vue';

// Mock del router
vi.mock('../../router', () => ({
  default: {
    push: vi.fn()
  }
}));

// Mock dell'API
vi.mock('../../api/auth', () => ({
  getAuthMode: vi.fn().mockResolvedValue({ data: {} })
}));

describe('AuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should be unauthenticated by default', () => {
    const store = useAuthStore();
    expect(store.isAuthenticated).toBe(false);
    expect(store.token).toBe(null);
    expect(store.user).toBe(null);
  });

  it('should set authentication correctly via StorageManager', async () => {
    const store = useAuthStore();
    const mockUser = { username: 'admin', roles: [{ name: 'admin' }] };
    store.setAuth('fake-token', mockUser);

    expect(store.token).toBe('fake-token');
    expect(store.user).toEqual(mockUser);
    expect(store.isAuthenticated).toBe(true);
    expect(store.isAdmin).toBe(true);

    // Attendiamo che il watcher scatti
    await nextTick();

    const saved = storage.get<any>(StorageNamespace.AUTH);
    expect(saved).not.toBeNull();
    expect(saved.token).toBe('fake-token');
    expect(saved.user).toEqual(mockUser);
  });

  it('should identify admin role correctly', () => {
    const store = useAuthStore();
    store.setAuth('tk', { roles: [{ name: 'viewer' }] });
    expect(store.isAdmin).toBe(false);

    store.setAuth('tk', { roles: [{ name: 'admin' }] });
    expect(store.isAdmin).toBe(true);
  });

  it('should handle logout', async () => {
    const store = useAuthStore();
    const router = (await import('../../router')).default;
    
    store.setAuth('tk', { username: 'test' });
    store.logout();

    expect(store.token).toBe(null);
    expect(store.user).toBe(null);
    expect(storage.get(StorageNamespace.AUTH)).toBe(null);
    expect(router.push).toHaveBeenCalledWith('/login');
  });

  it('should initialize anonymous session if allowed', async () => {
    vi.mocked(authApi.getAuthMode).mockResolvedValue({
      data: { allowAnonymous: true, anonymousRole: 'guest' }
    } as any);

    const store = useAuthStore();
    await vi.waitFor(() => store.user !== null);

    expect(store.user.username).toBe('anonymous');
    expect(store.user.roles[0].name).toBe('guest');
  });
});
