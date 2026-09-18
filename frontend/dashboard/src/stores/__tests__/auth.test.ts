import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../auth';
import * as authApi from '../../api/auth';
import * as config from '../../config';
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

// Mock di getEnv: per default APP_ID non configurato (dev)
vi.mock('../../config', () => ({
  getEnv: vi.fn().mockReturnValue(''),
  getContextApiUrl: vi.fn().mockReturnValue('http://localhost/api')
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

  it('should identify admin role correctly — struttura annidata reale (con appId)', () => {
    // Simula istanza con APP_ID configurato
    vi.mocked(config.getEnv).mockReturnValue('honeypot-host-001');
    const store = useAuthStore();

    // Ruolo generico: non admin
    store.setAuth('tk', { roles: [{ appId: 'honeypot-host-001', role: { name: 'user' } }] });
    expect(store.isAdmin).toBe(false);

    // Ruolo admin sull'app corretta
    store.setAuth('tk', { roles: [{ appId: 'honeypot-host-001', role: { name: 'admin' } }] });
    expect(store.isAdmin).toBe(true);

    // Ruolo admin su un'altra app (cross-tenant) — deve essere RIFIUTATO
    store.setAuth('tk', { roles: [{ appId: 'digital-portfolio', role: { name: 'admin' } }] });
    expect(store.isAdmin).toBe(false);

    // Superadmin su ips-management — bypass globale
    store.setAuth('tk', { roles: [{ appId: 'ips-management', role: { name: 'superadmin' } }] });
    expect(store.isAdmin).toBe(true);
  });

  it('should identify admin role correctly — struttura flat (anonimo/dev, senza appId)', () => {
    // Nessun APP_ID configurato: fallback permissivo
    vi.mocked(config.getEnv).mockReturnValue('');
    const store = useAuthStore();

    // Flat: ruolo non admin
    store.setAuth('tk', { roles: [{ name: 'viewer' }] });
    expect(store.isAdmin).toBe(false);

    // Flat: ruolo admin — accettato perché APP_ID non configurato
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

