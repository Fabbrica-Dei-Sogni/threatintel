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

    const { configs, loadConfigs, loading, error } = useConfig();
    
    const promise = loadConfigs();
    expect(loading.value).toBe(true);
    
    await promise;
    expect(loading.value).toBe(false);
    expect(configs.value).toEqual(mockConfigs);
    expect(error.value).toBeNull();
  });

  it('should handle load error', async () => {
    vi.mocked(configApi.fetchAllConfigs).mockRejectedValue(new Error('Load failed'));

    const { loadConfigs, error } = useConfig();
    await loadConfigs();
    
    expect(error.value).toBe('Load failed');
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

    searchQuery.value = '';
    expect(filteredConfigs.value).toHaveLength(2);
  });

  it('should handle upsert (insert and update)', async () => {
    const { configs, upsertConfig } = useConfig();
    
    // Insert
    const newConfig = { key: 'new', value: 'val' };
    vi.mocked(configApi.saveConfig).mockResolvedValue(newConfig);
    await upsertConfig('new', 'val');
    expect(configs.value).toContainEqual(newConfig);

    // Update
    const updatedConfig = { key: 'new', value: 'updated' };
    vi.mocked(configApi.saveConfig).mockResolvedValue(updatedConfig);
    await upsertConfig('new', 'updated');
    expect(configs.value).toContainEqual(updatedConfig);
    expect(configs.value.length).toBe(1);
  });

  it('should handle upsert error', async () => {
    vi.mocked(configApi.saveConfig).mockRejectedValue(new Error('Save failed'));
    const { upsertConfig, error } = useConfig();
    
    const result = await upsertConfig('key', 'val');
    expect(result).toBe(false);
    expect(error.value).toBe('Save failed');
  });

  it('should remove config successfully', async () => {
    const { configs, removeConfig } = useConfig();
    configs.value = [{ key: 'toDelete', value: 'val' }];
    vi.mocked(configApi.deleteConfig).mockResolvedValue({ success: true } as any);

    const result = await removeConfig('toDelete');
    expect(result).toBe(true);
    expect(configs.value).toHaveLength(0);
  });

  it('should handle remove error', async () => {
    vi.mocked(configApi.deleteConfig).mockRejectedValue(new Error('Delete failed'));
    const { removeConfig, error } = useConfig();
    
    const result = await removeConfig('key');
    expect(result).toBe(false);
    expect(error.value).toBe('Delete failed');
  });

  it('should search configs on backend', async () => {
    const { configs, search } = useConfig();
    const searchResults = [{ key: 'result', value: 'found' }];
    vi.mocked(configApi.searchConfigs).mockResolvedValue(searchResults);

    await search('query');
    expect(configs.value).toEqual(searchResults);
    expect(configApi.searchConfigs).toHaveBeenCalledWith('query');

    // Empty query calls loadConfigs
    vi.mocked(configApi.fetchAllConfigs).mockResolvedValue([]);
    await search('');
    expect(configApi.fetchAllConfigs).toHaveBeenCalled();
  });

  it('should handle search error', async () => {
    vi.mocked(configApi.searchConfigs).mockRejectedValue(new Error('Search failed'));
    const { search, error } = useConfig();
    
    await search('query');
    expect(error.value).toBe('Search failed');
  });

  it('should reanalyze all logs', async () => {
    const mockResult = { 
      message: 'Reanalysis started', 
      jobs: { 
        http: { jobId: '123', status: 'pending' },
        ssh: { jobId: '456', status: 'pending' }
      }
    };
    vi.mocked(configApi.reanalyzeAllLogs).mockResolvedValue(mockResult as any);
    const { reanalyzeAll, saving } = useConfig();

    const result = await reanalyzeAll();
    expect(result).toEqual(mockResult);
    expect(saving.value).toBe(false);
  });

  it('should handle reanalyze error', async () => {
    vi.mocked(configApi.reanalyzeAllLogs).mockRejectedValue({ response: { data: { details: 'Deep error' } } });
    const { reanalyzeAll, error } = useConfig();

    const result = await reanalyzeAll();
    expect(result).toBeNull();
    expect(error.value).toBe('Deep error');
  });

  it('should identify value types', () => {
    const { getValueType } = useConfig();
    expect(getValueType('a,b,c')).toBe('list');
    expect(getValueType('k1:v1,k2:v2')).toBe('keyvalue');
    expect(getValueType('simple')).toBe('text');
  });

  it('should convert value to tags and vice-versa', () => {
    const { valueToTags, tagsToValue } = useConfig();
    
    expect(valueToTags('a, b, c')).toEqual(['a', 'b', 'c']);
    expect(valueToTags('')).toEqual([]);
    
    expect(tagsToValue(['a', 'b', 'c'])).toBe('a,b,c');
    expect(tagsToValue([' a ', ''])).toBe('a');
  });
});
