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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { 
  fetchSearch, 
  fetchLogById, 
  fetchStats, 
  apiClient, 
  fetchIpDetails, 
  saveDossier, 
  fetchDossiers, 
  deleteDossier, 
  fetchCowrieSessions,
  fetchAttackSearch,
  fetchAttackDetail,
  fetchRateLimitSearch,
  enrichReports,
  enrichReputationScore,
  fetchDossierById,
  updateDossier,
  fetchCustomReport,
  login,
  register,
  fetchLogs,
  fetchCowrieSessionDetails,
  fetchCowrieSessionEvents,
  fetchReport,
  exportDossier,
  getApiUrl
} from '../index';
import { setActivePinia, createPinia } from 'pinia';
import { useProfileStore } from '../../stores/profiles';
import { storage, StorageNamespace } from '../../utils/storage';

vi.mock('../../stores/profiles', () => ({
  useProfileStore: vi.fn()
}));

describe('API index', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    vi.clearAllMocks();
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('should fetch search logs with correct params', async () => {
    const mockResponse = { logs: [{ id: '1' }], total: 1 };
    mock.onPost('/search').reply(200, mockResponse);

    const result = await fetchSearch({ 
        page: 1, 
        pageSize: 10, 
        filters: {}, 
        sortFields: null 
    });
    
    expect(result).toEqual(mockResponse);
    expect(mock.history.post[0].data).toContain('"page":1');
  });

  it('should login and save token via StorageManager', async () => {
    const mockResponse = { token: 'fake-token', user: { username: 'test' } };
    mock.onPost('/auth/login').reply(200, mockResponse);

    const result = await login({ username: 'u', password: 'p' });
    expect(result).toEqual(mockResponse);
    
    const saved = storage.get<any>(StorageNamespace.AUTH);
    expect(saved.token).toBe('fake-token');
    expect(saved.user.username).toBe('test');
  });

  it('should fetch IP details', async () => {
    const mockData = { ip: '1.2.3.4' };
    mock.onGet('/ipdetail/1.2.3.4').reply(200, mockData);
    const result = await fetchIpDetails('1.2.3.4');
    expect(result).toEqual(mockData);
  });

  it('should return API URL from profile store if available', () => {
    vi.mocked(useProfileStore).mockReturnValue({
        activeProfileId: 'custom',
        profiles: [{ id: 'custom', name: 'C', apiUrl: 'http://custom-api', lat: 0, lon: 0 }],
        activeProfile: { id: 'custom', apiUrl: 'http://custom-api' }
    } as any);

    expect(getApiUrl()).toBe('http://custom-api');
  });

  it('should fallback to StorageManager/env in getApiUrl', () => {
    vi.mocked(useProfileStore).mockImplementation(() => { throw new Error('No Pinia'); });
    
    storage.set(StorageNamespace.API, 'http://local-api');
    expect(getApiUrl()).toBe('http://local-api');
  });

  it('should handle 401 response interceptor', async () => {
    mock.onGet('/logs/1').reply(401);
    storage.set(StorageNamespace.AUTH, { token: 'token', user: {} });
    
    try {
        await fetchLogById('1');
    } catch (e) {}
    
    expect(storage.get(StorageNamespace.AUTH)).toBeNull();
  });

  it('should handle export dossier', async () => {
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob-url');
    mock.onGet('/dossiers/123/export').reply(200, new Blob());

    const result = await exportDossier('123', 'pdf');
    expect(result).toBeNull();
    expect(window.URL.createObjectURL).toHaveBeenCalled();

    // HTML version
    mock.onGet('/dossiers/123/export').reply(200, '<html></html>');
    const htmlResult = await exportDossier('123', 'html');
    expect(htmlResult).toBe('<html></html>');
  });

  it('should fallback to env variable in getApiUrl', () => {
    vi.mocked(useProfileStore).mockImplementation(() => { throw new Error('No Pinia'); });
    storage.remove(StorageNamespace.API);
    // VITE_APP_API_URL is handled by vitest env or mock
    expect(getApiUrl()).toBeDefined();
  });

  it('should handle request interceptor without token', async () => {
    storage.remove(StorageNamespace.AUTH);
    mock.onGet('/test').reply(200);
    await apiClient.get('/test');
    expect(mock.history.get[0].headers?.Authorization).toBeUndefined();
  });

  it('should handle login without token in response', async () => {
    mock.onPost('/auth/login').reply(200, { user: {} });
    const result = await login({});
    expect(result.token).toBeUndefined();
  });

  it('should not redirect if already on auth page', async () => {
    // Mock window.location
    const originalLocation = window.location;
    delete (window as any).location;
    (window as any).location = { pathname: '/login', href: '' };

    mock.onGet('/test-401').reply(401);
    try {
        await apiClient.get('/test-401');
    } catch (e) {}
    
    expect((window.location as any).href).toBe(''); // No redirect
    
    (window as any).location = originalLocation;
  });

  it('should fetch attack search', async () => {
    const mockData = { attacks: [], total: 0 };
    mock.onPost('/attack/search').reply(200, mockData);
    const result = await fetchAttackSearch({ page: 1, pageSize: 20 } as any);
    expect(result).toEqual(mockData);
  });

  it('should fetch attack detail', async () => {
    const mockData = { ip: '1.2.3.4', details: {} };
    mock.onPost('/attack/details').reply(200, mockData);
    const result = await fetchAttackDetail({ ip: '1.2.3.4', minLogsForAttack: 5, timeConfig: {} });
    expect(result).toEqual(mockData);
  });

  it('should fetch rate limit search', async () => {
    const mockData = { bobjs: [], total: 0 };
    mock.onPost('/ratelimit/search').reply(200, mockData);
    const result = await fetchRateLimitSearch({ page: 1, pageSize: 20 });
    expect(result).toEqual(mockData);
  });

  it('should enrich reports', async () => {
    const mockData = { success: true };
    mock.onPost('/enrichreports/1.2.3.4').reply(200, mockData);
    const result = await enrichReports('1.2.3.4');
    expect(result).toEqual(mockData);
  });

  it('should enrich reputation score', async () => {
    const mockData = { score: 100 };
    mock.onPost('/enrich/1.2.3.4').reply(200, mockData);
    const result = await enrichReputationScore('1.2.3.4');
    expect(result).toEqual(mockData);
  });

  it('should fetch cowrie sessions', async () => {
    const mockData = { sessions: [] };
    mock.onPost('/cowrie/search').reply(200, mockData);
    const result = await fetchCowrieSessions();
    expect(result).toEqual(mockData);
  });

  it('should fetch cowrie session details and events', async () => {
    mock.onGet('/cowrie/sessions/s1').reply(200, { id: 's1' });
    mock.onGet('/cowrie/sessions/s1/events').reply(200, []);
    
    expect(await fetchCowrieSessionDetails('s1')).toEqual({ id: 's1' });
    expect(await fetchCowrieSessionEvents('s1')).toEqual([]);
  });

  it('should fetch report as blob', async () => {
    const mockBlob = new Blob(['test']);
    mock.onGet('/reports/dettaglio').reply(200, mockBlob);
    const result = await fetchReport({ type: 'ip', ip: '1.2.3.4' });
    expect(result).toBeInstanceOf(Blob);
  });

  it('should fetch custom report', async () => {
    // HTML version
    mock.onPost('/reports/custom').reply(200, '<html></html>');
    const htmlResult = await fetchCustomReport({}, 'html');
    expect(htmlResult).toBe('<html></html>');

    // PDF version
    window.URL.createObjectURL = vi.fn().mockReturnValue('url');
    mock.onPost('/reports/custom').reply(200, new Blob());
    const pdfResult = await fetchCustomReport({}, 'pdf');
    expect(pdfResult).toBeNull();
  });

  it('should manage dossiers', async () => {
    mock.onGet('/dossiers').reply(200, []);
    mock.onGet('/dossiers/1').reply(200, { id: '1' });
    mock.onPost('/dossiers').reply(201, { id: '2' });
    mock.onPatch('/dossiers/2').reply(200, { id: '2', title: 'new' });
    mock.onDelete('/dossiers/2').reply(200, { success: true });

    expect(await fetchDossiers()).toEqual([]);
    expect(await fetchDossierById('1')).toEqual({ id: '1' });
    expect(await saveDossier({ title: 'T' })).toEqual({ id: '2' });
    expect(await updateDossier('2', { title: 'new' })).toEqual({ id: '2', title: 'new' });
    expect(await deleteDossier('2')).toEqual({ success: true });
  });

  it('should handle error cases for various functions', async () => {
    mock.onPost('/auth/login').reply(500);
    await expect(login({})).rejects.toThrow();

    mock.onPost('/auth/register').reply(500);
    await expect(register({})).rejects.toThrow();

    mock.onGet('/logs/1').reply(500);
    await expect(fetchLogById('1')).rejects.toThrow();

    mock.onPost('/search').reply(500);
    await expect(fetchSearch({} as any)).rejects.toThrow();

    mock.onPost('/attack/search').reply(500);
    await expect(fetchAttackSearch({} as any)).rejects.toThrow();
  });

  it('should handle empty IDs gracefully', async () => {
    expect(await fetchLogById('')).toEqual({ data: null });
    expect(await fetchIpDetails(' ')).toEqual({ data: null });
    expect(await enrichReports('')).toBeNull();
    expect(await enrichReputationScore(undefined as any)).toBeNull();
  });
});
