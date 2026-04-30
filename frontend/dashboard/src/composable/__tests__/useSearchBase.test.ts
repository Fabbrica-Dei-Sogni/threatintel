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
import { ref, nextTick } from 'vue';
import { useSearchBase } from '../useSearchBase';

describe('useSearchBase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should initialize with default values', () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined);
    const { page, pageSize, sortFields } = useSearchBase({ fetchFn });

    expect(page.value).toBe(1);
    expect(pageSize.value).toBe(20);
    expect(sortFields.value).toEqual({});
  });

  it('should call fetchFn when page changes', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined);
    const { page } = useSearchBase({ fetchFn });

    page.value = 2;
    vi.runAllTimers();
    await nextTick();

    expect(fetchFn).toHaveBeenCalled();
  });

  it('should reset page to 1 when filters change', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined);
    const filter = ref('initial');
    const { page } = useSearchBase({
      fetchFn,
      initialPage: 2,
      filterRefs: [filter]
    });

    // Aspettiamo il primo run (immediate: true)
    vi.runAllTimers();
    await nextTick();
    expect(page.value).toBe(2);

    // Cambiamo il filtro
    filter.value = 'changed';
    vi.runAllTimers();
    await nextTick();

    expect(page.value).toBe(1);
  });

  it('should handle sorting correctly', () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined);
    const { sortFields, toggleSort, getSortDirection, getSortClass } = useSearchBase({
      fetchFn,
      initialSortFields: { timestamp: -1 }
    });

    expect(getSortDirection('timestamp')).toBe(-1);
    expect(getSortClass('timestamp')).toBe('sorted-desc');

    // Primo clic su campo nuovo -> DESC (-1)
    toggleSort('ip');
    expect(sortFields.value).toEqual({ timestamp: -1, ip: -1 });
    expect(getSortClass('ip')).toBe('sorted-desc');

    // Secondo clic -> ASC (1)
    toggleSort('ip');
    expect(sortFields.value).toEqual({ timestamp: -1, ip: 1 });
    expect(getSortClass('ip')).toBe('sorted-asc');

    // Terzo clic -> Rimosso
    toggleSort('ip');
    expect(sortFields.value).toEqual({ timestamp: -1 });
    expect(getSortClass('ip')).toBe('');
  });
});
