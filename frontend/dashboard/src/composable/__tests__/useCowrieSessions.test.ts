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
import { useCowrieSessions } from '../useCowrieSessions';
import { setActivePinia, createPinia } from 'pinia';
import * as api from '../../api/index';

vi.mock('../../api/index', () => ({
  fetchCowrieSessions: vi.fn()
}));

describe('useCowrieSessions', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('should initialize and fetch sessions', async () => {
    const mockData = { sessions: [{ session: 's1' }], total: 1 };
    vi.mocked(api.fetchCowrieSessions).mockResolvedValue(mockData);

    const { fetchData, sessions } = useCowrieSessions();
    await fetchData();

    expect(sessions.value).toHaveLength(1);
    expect(api.fetchCowrieSessions).toHaveBeenCalled();
  });

  it('should filter by category correctly', async () => {
    const { filterCategory, fetchData } = useCowrieSessions();
    
    filterCategory.value = 'all';
    await fetchData();
    // Non deve inviare sessionCategory se è 'all'
    expect(api.fetchCowrieSessions).toHaveBeenCalledWith(
      1, 20, {}, {}
    );

    filterCategory.value = 'scanner';
    await fetchData();
    expect(api.fetchCowrieSessions).toHaveBeenCalledWith(
      1, 20, {}, { sessionCategory: 'scanner' }
    );
  });
});
