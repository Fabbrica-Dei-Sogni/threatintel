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
  fetchCowrieSessions 
} from '../index';

describe('API index', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    vi.clearAllMocks();
  });

  it('should fetch search logs with correct params', async () => {
    const mockResponse = { logs: [], total: 0 };
    mock.onPost('/search').reply(200, mockResponse);

    const result = await fetchSearch({ page: 1, pageSize: 10 });
    
    expect(result).toEqual(mockResponse);
    expect(mock.history.post[0].data).toContain('"page":1');
    expect(mock.history.post[0].data).toContain('"pageSize":10');
  });

  it('should fetch log by id', async () => {
    const mockLog = { id: '123', ip: '1.1.1.1' };
    mock.onGet('/logs/123').reply(200, mockLog);

    const result = await fetchLogById('123');
    expect(result).toEqual(mockLog);
  });

  it('should fetch stats', async () => {
    const mockStats = { total: 100 };
    mock.onGet('/stats').reply(200, mockStats);

    const result = await fetchStats('24h', 15);
    expect(result).toEqual(mockStats);
    expect(mock.history.get[0].params).toEqual({
      timeframe: '24h',
      minScore: 15,
      top: 10,
      minLogs: 1
    });
  });

  it('should fetch IP details', async () => {
    const mockData = { ip: '1.2.3.4', city: 'Rome' };
    mock.onGet('/ipdetail/1.2.3.4').reply(200, mockData);

    const result = await fetchIpDetails('1.2.3.4');
    expect(result).toEqual(mockData);
  });

  it('should save dossier', async () => {
    const payload = { title: 'Dossier' };
    mock.onPost('/dossiers').reply(201, { id: 'new-id' });

    const result = await saveDossier(payload);
    expect(result.id).toBe('new-id');
  });

  it('should fetch dossiers', async () => {
    mock.onGet('/dossiers').reply(200, []);
    const result = await fetchDossiers();
    expect(result).toEqual([]);
  });

  it('should delete dossier', async () => {
    mock.onDelete('/dossiers/123').reply(200);
    await deleteDossier('123');
    expect(mock.history.delete[0].url).toBe('/dossiers/123');
  });

  it('should fetch Cowrie sessions', async () => {
    mock.onPost('/cowrie/search').reply(200, { sessions: [] });
    const result = await fetchCowrieSessions(1, 10);
    expect(result.sessions).toEqual([]);
  });
});
