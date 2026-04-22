import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDossiersFilter } from '../useDossiersFilter';
import { setActivePinia, createPinia } from 'pinia';
import * as api from '../../api/index';

vi.mock('../../api/index', () => ({
  fetchDossiers: vi.fn()
}));

describe('useDossiersFilter', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('should fetch dossiers correctly', async () => {
    const mockData = { items: [{ id: 'd1' }], total: 1 };
    vi.mocked(api.fetchDossiers).mockResolvedValue(mockData);

    const { fetchData, dossiers } = useDossiersFilter();
    await fetchData();

    expect(dossiers.value).toEqual(mockData.items);
    expect(api.fetchDossiers).toHaveBeenCalledWith(expect.objectContaining({
      page: 1,
      pageSize: 12
    }));
  });
});
