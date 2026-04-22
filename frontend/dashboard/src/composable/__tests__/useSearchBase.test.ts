import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, nextTick } from 'vue';
import { useSearchBase } from '../useSearchBase';

describe('useSearchBase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should initialize with default values', () => {
    const fetchFn = vi.fn();
    const { page, pageSize, total, loading } = useSearchBase({ fetchFn });

    expect(page.value).toBe(1);
    expect(pageSize.value).toBe(20);
    expect(total.value).toBe(0);
    expect(loading.value).toBe(false);
  });

  it('should call fetchFn after debounce when page changes', async () => {
    const fetchFn = vi.fn();
    const { page } = useSearchBase({ fetchFn });

    // La prima chiamata avviene all'avvio (immediate: true)
    vi.runAllTimers();
    expect(fetchFn).toHaveBeenCalledTimes(1);

    page.value = 2;
    await nextTick();
    
    expect(fetchFn).toHaveBeenCalledTimes(1); // Non ancora chiamata causa debounce
    
    vi.runAllTimers();
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('should reset page to 1 when filters change', async () => {
    const fetchFn = vi.fn();
    const filter = ref('initial');
    const { page } = useSearchBase({ fetchFn, filterRefs: [filter], initialPage: 5 });

    // Initial fetch
    vi.runAllTimers();
    expect(page.value).toBe(5);

    filter.value = 'changed';
    await nextTick();
    
    expect(page.value).toBe(1);
    
    vi.runAllTimers();
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('should handle sorting correctly', () => {
    const fetchFn = vi.fn();
    const { sortFields, toggleSort, getSortClass } = useSearchBase({ 
      fetchFn, 
      initialSortFields: { timestamp: -1 } 
    });

    expect(sortFields.value).toEqual({ timestamp: -1 });
    expect(getSortClass('timestamp')).toBe('sorted-desc');

    toggleSort('ip');
    expect(sortFields.value).toEqual({ timestamp: -1, ip: 1 });
    expect(getSortClass('ip')).toBe('sorted-asc');

    toggleSort('ip');
    expect(sortFields.value).toEqual({ timestamp: -1, ip: -1 });

    toggleSort('ip');
    expect(sortFields.value).toEqual({ timestamp: -1 });
    expect(getSortClass('ip')).toBe('');
  });
});
