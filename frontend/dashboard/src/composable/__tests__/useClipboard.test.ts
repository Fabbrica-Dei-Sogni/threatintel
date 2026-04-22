import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useClipboard } from '../useClipboard';
import { setActivePinia, createPinia } from 'pinia';
import { useDossierStore } from '../../stores/dossier';

// Mock di Element Plus
vi.mock('element-plus', () => ({
  ElMessage: vi.fn()
}));

describe('useClipboard', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    
    // Mock navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined)
      },
      configurable: true
    });
  });

  it('should copy text to clipboard', async () => {
    const { copyToClipboard } = useClipboard();
    await copyToClipboard('test message');

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test message');
  });

  it('should add to dossier when recording', async () => {
    const dossierStore = useDossierStore();
    dossierStore.isRecording = true;
    const addSectionSpy = vi.spyOn(dossierStore, 'addSection');

    const { copyToClipboard } = useClipboard();
    await copyToClipboard('important threat data');

    expect(addSectionSpy).toHaveBeenCalledWith('clipboard.generic', { text: 'important threat data' }, 'important threat data');
  });

  it('should render template correctly', () => {
    const { renderTemplate } = useClipboard();
    const result = renderTemplate('key', { name: 'test' });
    expect(result).toBe('key'); // Il mock in setup.ts ritorna la chiave stessa
  });
});
