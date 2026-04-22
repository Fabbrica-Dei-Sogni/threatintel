import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAttacksFilter } from '../useAttacksFilter';
import { setActivePinia, createPinia } from 'pinia';
import * as api from '../../api/index';

vi.mock('../../api/index', () => ({
  fetchAttackSearch: vi.fn()
}));

describe('useAttacksFilter', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('should initialize with correct default values', () => {
    const { filterIp, timeMode, page } = useAttacksFilter(
      '1.1.1.1', 'http', 1, 5, 'ago', 24, 'hours', null, 1, 'days', 0, 'minutes'
    );
    
    expect(filterIp.value).toBe('1.1.1.1');
    expect(timeMode.value).toBe('ago');
    expect(page.value).toBe(1);
  });

  it('should fetch attacks successfully', async () => {
    const mockData = { attacks: [{ ip: '1.2.3.4', count: 10 }], total: 1 };
    vi.mocked(api.fetchAttackSearch).mockResolvedValue(mockData);

    const { fetchData, attacks, total } = useAttacksFilter(
      '', 'http', 1, 1, 'ago', 24, 'hours', null, 0, 'h', 0, 'h'
    );
    
    await fetchData();

    expect(attacks.value).toEqual(mockData.attacks);
    expect(total.value).toBe(1);
    expect(api.fetchAttackSearch).toHaveBeenCalledWith(expect.objectContaining({
      minLogsForAttack: 1,
      timeConfig: { hours: 24 }
    }));
  });

  it('should handle range time mode', async () => {
    const { fetchData, timeMode, dateRange } = useAttacksFilter(
      '', 'http', 1, 1, 'range', 24, 'hours', ['2026-01-01', '2026-01-02'], 1, 'days', 0, 'hours'
    );
    
    await fetchData();

    expect(api.fetchAttackSearch).toHaveBeenCalledWith(expect.objectContaining({
      timeConfig: expect.objectContaining({
        fromDate: '2026-01-01',
        toDate: '2026-01-02'
      })
    }));
  });
});
