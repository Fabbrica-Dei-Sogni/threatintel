/**
 * ThreatIntel - Reference Implementation Dashboard
 * 
 * This file is part of the reference frontend implementation of the 
 * ThreatIntel Distributed Forensics Engine.
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Production or commercial use of this specific interface requires 
 * a valid commercial license from the author.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextTick } from 'vue';
import { useLogsFilter } from '../useLogsFilter';
import * as api from '../../api/index';

// Mock delle API
vi.mock('../../api/index', () => ({
  fetchSearch: vi.fn(),
  getApiUrl: vi.fn().mockReturnValue('http://localhost/api')
}));

describe('useLogsFilter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  it('should initialize with provided values', () => {
    const { filterIp, filterProtocol, page } = useLogsFilter('1.2.3.4', '', 'ssh', 'active', '', 2);
    
    expect(filterIp.value).toBe('1.2.3.4');
    expect(filterProtocol.value).toBe('ssh');
    expect(page.value).toBe(2);
  });

  it('should fetch data correctly', async () => {
    const mockLogs = [{ id: '1', request: { ip: '1.1.1.1' } }];
    vi.mocked(api.fetchSearch).mockResolvedValue({
      logs: mockLogs,
      total: 1
    });

    const { logs, total, loading, fetchData } = useLogsFilter();

    await fetchData();

    expect(loading.value).toBe(false);
    expect(logs.value).toEqual(mockLogs);
    expect(total.value).toBe(1);
    expect(api.fetchSearch).toHaveBeenCalledWith(expect.objectContaining({
      page: 1,
      pageSize: 20,
      filters: { protocol: 'http', status: 'active' },
      sortFields: { timestamp: -1 }
    }));
  });

  it('should handle API errors', async () => {
    vi.mocked(api.fetchSearch).mockRejectedValue(new Error('API Error'));

    const { logs, total, error, fetchData } = useLogsFilter();

    await fetchData();

    expect(error.value).toBe(true);
    expect(logs.value).toEqual([]);
    expect(total.value).toBe(0);
  });

  it('should trigger fetch when filters change (via useSearchBase)', async () => {
    const { filterIp } = useLogsFilter();
    
    // Initial fetch (immediate)
    vi.runAllTimers();
    expect(api.fetchSearch).toHaveBeenCalledTimes(1);

    filterIp.value = '8.8.8.8';
    await nextTick();
    vi.runAllTimers();

    expect(api.fetchSearch).toHaveBeenCalledTimes(2);
    expect(api.fetchSearch).toHaveBeenLastCalledWith(expect.objectContaining({
      filters: expect.objectContaining({ 'request.ip': '8.8.8.8' })
    }));
  });
});
