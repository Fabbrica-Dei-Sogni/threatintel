import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useConfig } from '../useConfig';
import * as configApi from '../../api/config';

vi.mock('../../api/config', () => ({
  fetchAllConfigs: vi.fn(),
  saveConfig: vi.fn(),
  deleteConfig: vi.fn(),
  searchConfigs: vi.fn(),
  reanalyzeAllLogs: vi.fn()
}));

describe('useConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load configs successfully', async () => {
    const mockConfigs = [{ key: 'test', value: 'val' }];
    vi.mocked(configApi.fetchAllConfigs).mockResolvedValue(mockConfigs);

    const { configs, loadConfigs, loading } = useConfig();
    
    const promise = loadConfigs();
    expect(loading.value).toBe(true);
    
    await promise;
    expect(loading.value).toBe(false);
    expect(configs.value).toEqual(mockConfigs);
  });

  it('should filter configs locally', async () => {
    const { configs, filteredConfigs, searchQuery } = useConfig();
    configs.value = [
      { key: 'port', value: '80' },
      { key: 'host', value: 'localhost' }
    ];

    searchQuery.value = 'port';
    expect(filteredConfigs.value).toHaveLength(1);
    expect(filteredConfigs.value[0].key).toBe('port');
  });

  it('should handle upsert correctly', async () => {
    const { configs, upsertConfig } = useConfig();
    const newConfig = { key: 'new', value: 'val' };
    vi.mocked(configApi.saveConfig).mockResolvedValue(newConfig);

    await upsertConfig('new', 'val');
    expect(configs.value).toContainEqual(newConfig);
  });

  it('should identify value types', () => {
    const { getValueType } = useConfig();
    expect(getValueType('a,b,c')).toBe('list');
    expect(getValueType('k1:v1,k2:v2')).toBe('keyvalue');
    expect(getValueType('simple')).toBe('text');
  });
});
