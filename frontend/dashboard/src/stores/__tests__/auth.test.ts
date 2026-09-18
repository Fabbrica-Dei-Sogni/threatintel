import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../auth';
import * as authApi from '../../api/auth';
import { storage, StorageNamespace } from '../../utils/storage';
import { nextTick } from 'vue';

// Mock del router
vi.mock('../../router', () => ({
  default: {
    push: vi.fn(),
    currentRoute: {
      value: {
        fullPath: '/attacks'
      }
    }
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
    // Struttura annidata reale: come restituita dal backend dopo populate('roles.role')
    const mockUser = { username: 'admin', roles: [{ appId: 'honeypot-host-001', role: { name: 'admin', permissions: [] } }] };
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

  it('should identify admin role correctly — struttura annidata reale', () => {
    const store = useAuthStore();

    // Ruolo generico: non admin
    store.setAuth('tk', { roles: [{ appId: 'app', role: { name: 'user' } }] });
    expect(store.isAdmin).toBe(false);

    // Ruolo admin con struttura annidata
    store.setAuth('tk', { roles: [{ appId: 'app', role: { name: 'admin' } }] });
    expect(store.isAdmin).toBe(true);

    // Ruolo superadmin con struttura annidata — deve valere come admin
    store.setAuth('tk', { roles: [{ appId: 'ips-management', role: { name: 'superadmin' } }] });
    expect(store.isAdmin).toBe(true);
  });

  it('should identify admin role correctly — struttura flat (anonimo/legacy)', () => {
    const store = useAuthStore();

    // Flat: ruolo non admin
    store.setAuth('tk', { roles: [{ name: 'viewer' }] });
    expect(store.isAdmin).toBe(false);

    // Flat: ruolo admin
    store.setAuth('tk', { roles: [{ name: 'admin' }] });
    expect(store.isAdmin).toBe(true);

    // Flat: ruolo superadmin
    store.setAuth('tk', { roles: [{ name: 'superadmin' }] });
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

  it('handleAuthError: should clear state and redirect to login with redirect param', async () => {
    const store = useAuthStore();
    const router = (await import('../../router')).default;

    store.setAuth('expired-token', { username: 'user' });
    await nextTick();

    store.handleAuthError();

    expect(store.token).toBe(null);
    expect(store.user).toBe(null);
    expect(storage.get(StorageNamespace.AUTH)).toBe(null);
    expect(router.push).toHaveBeenCalledWith({
      name: 'Login',
      query: { redirect: '/attacks' }
    });
  });

  it('handleAuthError: should NOT redirect if already on login page', async () => {
    // Override currentRoute to simulate being on /login
    const router = (await import('../../router')).default;
    (router.currentRoute as any).value.fullPath = '/login';

    const store = useAuthStore();
    store.setAuth('expired-token', { username: 'user' });
    vi.clearAllMocks();

    store.handleAuthError();

    expect(store.token).toBe(null);
    expect(router.push).not.toHaveBeenCalled();
  });
});

