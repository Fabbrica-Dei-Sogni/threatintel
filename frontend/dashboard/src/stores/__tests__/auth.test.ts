import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../auth';
import * as authApi from '../../api/auth';

// Mock del router
vi.mock('../../router', () => ({
  default: {
    push: vi.fn()
  }
}));

// Mock dell'API
vi.mock('../../api/auth', () => ({
  getAuthMode: vi.fn()
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

  it('should set authentication correctly', () => {
    const store = useAuthStore();
    const mockUser = { username: 'admin', roles: [{ name: 'admin' }] };
    store.setAuth('fake-token', mockUser);

    expect(store.token).toBe('fake-token');
    expect(store.user).toEqual(mockUser);
    expect(store.isAuthenticated).toBe(true);
    expect(store.isAdmin).toBe(true);
    expect(localStorage.getItem('auth_token')).toBe('fake-token');
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
    expect(localStorage.getItem('auth_token')).toBe(null);
    expect(router.push).toHaveBeenCalledWith('/login');
  });

  it('should initialize anonymous session if allowed', async () => {
    vi.mocked(authApi.getAuthMode).mockResolvedValue({
      data: { allowAnonymous: true, anonymousRole: 'guest' }
    } as any);

    const store = useAuthStore();
    // Attendiamo che la promessa in checkAuthMode (chiamata nel setup) si risolva
    // Poiché viene chiamata immediatamente, dobbiamo aspettare un microtask
    await vi.waitFor(() => store.user !== null);

    expect(store.user.username).toBe('anonymous');
    expect(store.user.roles[0].name).toBe('guest');
  });
});
