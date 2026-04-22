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

  it('should handle fetchSearch error', async () => {
    mock.onPost('/search').reply(500);
    await expect(fetchSearch({ 
        page: 1, 
        pageSize: 10, 
        filters: {}, 
        sortFields: null 
    })).rejects.toThrow();
  });

  it('should fetch log by id', async () => {
    const mockLog = { id: '123', ip: '1.1.1.1' };
    mock.onGet('/logs/123').reply(200, mockLog);

    const result = await fetchLogById('123');
    expect(result).toEqual(mockLog);
  });

  it('should handle fetchLogById with empty id', async () => {
    const result = await fetchLogById('');
    expect(result.data).toBeNull();
  });

  it('should handle fetchLogById error', async () => {
    mock.onGet('/logs/123').reply(500);
    await expect(fetchLogById('123')).rejects.toThrow();
  });

  it('should login and save token', async () => {
    const mockResponse = { token: 'fake-token', user: { username: 'test' } };
    mock.onPost('/auth/login').reply(200, mockResponse);

    const result = await login({ username: 'u', password: 'p' });
    expect(result).toEqual(mockResponse);
    expect(localStorage.getItem('auth_token')).toBe('fake-token');
    expect(localStorage.getItem('user_info')).toContain('test');
  });

  it('should handle login error', async () => {
    mock.onPost('/auth/login').reply(401);
    await expect(login({})).rejects.toThrow();
  });

  it('should register successfully', async () => {
    mock.onPost('/auth/register').reply(201, { success: true });
    const result = await register({ username: 'u' });
    expect(result.success).toBe(true);
  });

  it('should handle register error', async () => {
    mock.onPost('/auth/register').reply(400);
    await expect(register({})).rejects.toThrow();
  });

  it('should fetch stats', async () => {
    const mockStats = { total: 100 };
    mock.onGet('/stats').reply(200, mockStats);

    const result = await fetchStats('24h', 15);
    expect(result).toEqual(mockStats);
  });

  it('should handle fetchStats error', async () => {
    mock.onGet('/stats').reply(500);
    await expect(fetchStats()).rejects.toThrow();
  });

  it('should fetch IP details', async () => {
    const mockData = { ip: '1.2.3.4' };
    mock.onGet('/ipdetail/1.2.3.4').reply(200, mockData);
    const result = await fetchIpDetails('1.2.3.4');
    expect(result).toEqual(mockData);
  });

  it('should handle empty ip in fetchIpDetails', async () => {
    const result = await fetchIpDetails(' ');
    expect(result.data).toBeNull();
  });

  it('should handle fetchIpDetails error', async () => {
    mock.onGet('/ipdetail/1.2.3.4').reply(500);
    await expect(fetchIpDetails('1.2.3.4')).rejects.toThrow();
  });

  it('should update dossier', async () => {
    mock.onPatch('/dossiers/123').reply(200, { id: '123', updated: true });
    const result = await updateDossier('123', { title: 'New' });
    expect(result.updated).toBe(true);
  });

  it('should handle updateDossier error', async () => {
    mock.onPatch('/dossiers/123').reply(500);
    await expect(updateDossier('123', {})).rejects.toThrow();
  });

  it('should fetch Cowrie session details and events', async () => {
    mock.onGet('/cowrie/sessions/s1').reply(200, { id: 's1' });
    mock.onGet('/cowrie/sessions/s1/events').reply(200, []);

    const details = await fetchCowrieSessionDetails('s1');
    const events = await fetchCowrieSessionEvents('s1');
    
    expect(details.id).toBe('s1');
    expect(events).toEqual([]);
  });

  it('should handle Cowrie session detail/events error', async () => {
    mock.onGet('/cowrie/sessions/s1').reply(500);
    await expect(fetchCowrieSessionDetails('s1')).rejects.toThrow();
    
    mock.onGet('/cowrie/sessions/s1/events').reply(500);
    await expect(fetchCowrieSessionEvents('s1')).rejects.toThrow();
  });

  it('should fetch report as blob', async () => {
    const mockBlob = new Blob(['pdf-content'], { type: 'application/pdf' });
    mock.onGet('/reports/dettaglio').reply(200, mockBlob);

    const result = await fetchReport({ type: 'attack', ip: '1.2.3.4' });
    expect(result).toBeInstanceOf(Blob);
  });

  it('should handle fetchReport error', async () => {
    mock.onGet('/reports/dettaglio').reply(500);
    await expect(fetchReport({ type: 'attack' })).rejects.toThrow();
  });

  it('should export dossier', async () => {
    // PDF Export
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob-url');
    mock.onGet('/dossiers/123/export').reply(200, new Blob());

    const result = await exportDossier('123', 'pdf');
    expect(result).toBeNull();
    expect(window.URL.createObjectURL).toHaveBeenCalled();

    // HTML Export
    mock.onGet('/dossiers/123/export').reply(200, '<html></html>');
    const htmlResult = await exportDossier('123', 'html');
    expect(htmlResult).toBe('<html></html>');
  });

  it('should handle exportDossier error', async () => {
    mock.onGet('/dossiers/123/export').reply(500);
    await expect(exportDossier('123')).rejects.toThrow();
  });

  it('should return API URL from profile store if available', () => {
    vi.mocked(useProfileStore).mockReturnValue({
        activeProfileId: 'custom',
        profiles: [{ id: 'custom', name: 'C', apiUrl: 'http://custom-api', lat: 0, lon: 0 }],
        activeProfile: { id: 'custom', apiUrl: 'http://custom-api' }
    } as any);

    expect(getApiUrl()).toBe('http://custom-api');
  });

  it('should fallback to localStorage/env in getApiUrl', () => {
    vi.mocked(useProfileStore).mockImplementation(() => { throw new Error('No Pinia'); });
    
    localStorage.setItem('api_url', 'http://local-api');
    expect(getApiUrl()).toBe('http://local-api');
  });

  it('should handle 401/403 response interceptor', async () => {
    mock.onGet('/logs/1').reply(401);
    localStorage.setItem('auth_token', 'token');
    try {
        await fetchLogById('1');
    } catch (e) {}
    expect(localStorage.getItem('auth_token')).toBeNull();

    mock.onGet('/logs/2').reply(403);
    try {
        await fetchLogById('2');
    } catch (e) {}
    // 403 doesn't clear token in implementation
  });

  it('should fetch deprecated logs', async () => {
    mock.onGet('/logs').reply(200, []);
    const result = await fetchLogs({});
    expect(result).toEqual([]);
  });

  it('should handle fetchLogs error', async () => {
    mock.onGet('/logs').reply(500);
    await expect(fetchLogs({})).rejects.toThrow();
  });

  it('should handle enrichReports and enrichReputationScore', async () => {
    mock.onPost('/enrichreports/1.2.3.4').reply(200, { ok: true });
    mock.onPost('/enrich/1.2.3.4').reply(200, { ok: true });
    
    expect(await enrichReports('1.2.3.4')).toEqual({ ok: true });
    expect(await enrichReputationScore('1.2.3.4')).toEqual({ ok: true });

    // Handle errors
    mock.onPost('/enrichreports/1.2.3.4').reply(500);
    await expect(enrichReports('1.2.3.4')).rejects.toThrow();
    
    mock.onPost('/enrich/1.2.3.4').reply(500);
    await expect(enrichReputationScore('1.2.3.4')).rejects.toThrow();

    // Handle empty IPs
    expect(await enrichReports('')).toBeNull();
    expect(await enrichReputationScore('')).toBeNull();
  });

  it('should fetch Cowrie sessions with params', async () => {
    mock.onPost('/cowrie/search').reply(200, { sessions: [] });
    const result = await fetchCowrieSessions(1, 10, null, {});
    expect(result.sessions).toEqual([]);
  });

  it('should handle fetchCowrieSessions error', async () => {
    mock.onPost('/cowrie/search').reply(500);
    await expect(fetchCowrieSessions(1, 10, null, {})).rejects.toThrow();
  });

  it('should fetch attack search with params', async () => {
    const mockData = { attacks: [], total: 0 };
    mock.onPost('/attack/search').reply(200, mockData);
    const result = await fetchAttackSearch({ 
        page: 1, 
        pageSize: 20, 
        filters: {}, 
        minLogsForAttack: 5, 
        timeConfig: { hours: 24 }, 
        sortFields: null 
    });
    expect(result).toEqual(mockData);
  });

  it('should handle fetchAttackSearch error', async () => {
    mock.onPost('/attack/search').reply(500);
    await expect(fetchAttackSearch({ 
        page: 1, 
        pageSize: 20, 
        filters: {}, 
        minLogsForAttack: 5, 
        timeConfig: { hours: 24 }, 
        sortFields: null 
    })).rejects.toThrow();
  });

  it('should handle fetchAttackDetail error', async () => {
    mock.onPost('/attack/details').reply(500);
    await expect(fetchAttackDetail({ 
        ip: '1.2.3.4', 
        minLogsForAttack: 1, 
        timeConfig: { hours: 1 } 
    })).rejects.toThrow();
  });

  it('should handle fetchRateLimitSearch error', async () => {
    mock.onPost('/ratelimit/search').reply(500);
    await expect(fetchRateLimitSearch({ 
        page: 1, 
        pageSize: 10, 
        filters: {} 
    })).rejects.toThrow();
  });

  it('should handle fetchCustomReport error', async () => {
    mock.onPost('/reports/custom').reply(500);
    await expect(fetchCustomReport({ 
        sections: [],
        locale: 'it-IT'
    })).rejects.toThrow();
  });
});
