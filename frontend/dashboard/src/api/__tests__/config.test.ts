import { describe, it, expect, vi, beforeEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { fetchAllConfigs, saveConfig, deleteConfig, apiClient } from '../config';

describe('API config', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    vi.clearAllMocks();
  });

  it('should fetch all configs', async () => {
    const mockData = [{ key: 'k', value: 'v' }];
    mock.onGet('/config').reply(200, mockData);

    const result = await fetchAllConfigs();
    expect(result).toEqual(mockData);
  });

  it('should save config', async () => {
    const mockData = { key: 'k', value: 'v' };
    mock.onPost('/config').reply(200, mockData);

    const result = await saveConfig('k', 'v');
    expect(result).toEqual(mockData);
  });

  it('should delete config', async () => {
    mock.onDelete('/config/k').reply(200, { message: 'ok' });
    const result = await deleteConfig('k');
    expect(result.message).toBe('ok');
  });
});
