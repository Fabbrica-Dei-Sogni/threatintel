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
  });
});
