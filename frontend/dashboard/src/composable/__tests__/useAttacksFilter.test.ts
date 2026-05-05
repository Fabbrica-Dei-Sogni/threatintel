import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAttacksFilter } from '../useAttacksFilter';
import * as api from '../../api/index';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('../../api/index', () => ({
  fetchAttackSearch: vi.fn(),
  getApiUrl: vi.fn().mockReturnValue('http://localhost')
}));

// Mock useSearchStore per evitare errori di inject
vi.mock('../../stores/searchPersistence', () => ({
  useSearchStore: () => ({
    saveQuery: vi.fn(),
    getQuery: vi.fn()
  })
}));

describe('useAttacksFilter', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('should initialize with provided values', () => {
    const filter = useAttacksFilter(
      '1.2.3.4', 'http', 1, 5, 'ago', 24, 'hours', null, 0, 'h', 0, 'h'
    );
    expect(filter.filterIp.value).toBe('1.2.3.4');
    expect(filter.minLogsForAttack.value).toBe(5);
    expect(filter.timeMode.value).toBe('ago');
  });

  it('should fetch data with ago time mode', async () => {
    const mockData = { attacks: [], total: 0 };
    vi.mocked(api.fetchAttackSearch).mockResolvedValue(mockData);

    const filter = useAttacksFilter(
      '', 'http', 1, 1, 'ago', 1, 'hours', null, 0, 'h', 0, 'h'
    );
    await filter.fetchData();

    expect(api.fetchAttackSearch).toHaveBeenCalledWith(expect.objectContaining({
      timeConfig: { hours: 1 }
    }));
  });

  it('should fetch data with range time mode and dateRange', async () => {
    vi.mocked(api.fetchAttackSearch).mockResolvedValue({ attacks: [], total: 0 });

    const filter = useAttacksFilter(
      '', 'http', 1, 1, 'range', 1, 'hours', ['2023-01-01', '2023-01-02'], 1, 'days', 0, 'days'
    );
    await filter.fetchData();

    expect(api.fetchAttackSearch).toHaveBeenCalledWith(expect.objectContaining({
      timeConfig: expect.objectContaining({
        from: { days: 1 },
        fromDate: '2023-01-01',
        toDate: '2023-01-02'
      })
    }));
  });

  it('should handle danger levels filter', async () => {
    vi.mocked(api.fetchAttackSearch).mockResolvedValue({ attacks: [], total: 0 });

    const filter = useAttacksFilter(
      '', 'http', 1, 1, 'ago', 1, 'hours', null, 0, 'h', 0, 'h', 'active', null, 20, [1, 2]
    );
    await filter.fetchData();

    expect(api.fetchAttackSearch).toHaveBeenCalledWith(expect.objectContaining({
      filters: expect.objectContaining({
        dangerLevel: '1,2'
      })
    }));
  });

  it('should handle fetch error', async () => {
    vi.mocked(api.fetchAttackSearch).mockRejectedValue(new Error('Fail'));
    const filter = useAttacksFilter(
      '', 'http', 1, 1, 'ago', 1, 'hours', null, 0, 'h', 0, 'h'
    );
    
    await filter.fetchData();
    
    expect(filter.error.value).toBe(true);
    expect(filter.attacks.value).toHaveLength(0);
  });
});
