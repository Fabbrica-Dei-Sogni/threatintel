import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStats } from '../useStats';
import { setActivePinia, createPinia } from 'pinia';
import * as api from '../../api/index';

vi.mock('../../api/index', () => ({
  fetchStats: vi.fn()
}));

describe('useStats', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('should initialize with values from viewStore', () => {
    const { selectedTimeframe, selectedScore } = useStats();
    expect(selectedTimeframe.value).toBe('24h');
    expect(selectedScore.value).toBe(15);
  });

  it('should load stats and recalibrate thresholds', async () => {
    const mockData = {
      stats: {
        total: 100,
        scoreDistribution: { min: 0, max: 100, avg: 40 }
      }
    };
    vi.mocked(api.fetchStats).mockResolvedValue(mockData);

    const { loadStats, stats, dynamicThresholds } = useStats();
    
    await loadStats();

    expect(stats.value).toEqual(mockData.stats);
    // Verifica ricalibrazione (avg è 40, quindi med dovrebbe essere 40)
    expect(dynamicThresholds.med).toBe(40);
  });

  it('should update filters and reload', async () => {
    const { setTimeframe, selectedTimeframe } = useStats();
    
    setTimeframe('1w');
    expect(selectedTimeframe.value).toBe('1w');
    expect(api.fetchStats).toHaveBeenCalled();
  });

  it('should reset filters correctly', () => {
    const { resetFilters, selectedLevel, selectedScore } = useStats();
    
    selectedLevel.value = 'high';
    selectedScore.value = 90;
    
    resetFilters();
    
    expect(selectedLevel.value).toBe('low');
    expect(selectedScore.value).toBe(15);
  });
});
