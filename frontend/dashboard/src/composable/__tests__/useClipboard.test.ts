import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useClipboard } from '../useClipboard';
import { setActivePinia, createPinia } from 'pinia';
import { useDossierStore } from '../../stores/dossier';
import { ElMessage } from 'element-plus';
import { useI18n as useVueI18n } from 'vue-i18n';

// Mock di Element Plus
vi.mock('element-plus', () => ({
  ElMessage: vi.fn()
}));

// Mock di vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: vi.fn()
}));

describe('useClipboard', () => {
  const i18nState = {
    t: (key: string) => key,
    tm: (key: string) => key,
    locale: { value: 'it-IT' },
    availableLocales: ['it-IT', 'en-US']
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.clearAllMocks();
    
    // Reset i18nState defaults
    i18nState.t = (key: string) => key;
    i18nState.tm = (key: string) => key;
    i18nState.locale.value = 'it-IT';

    vi.mocked(useVueI18n).mockReturnValue(i18nState as any);

    // Mock navigator.clipboard (default: present)
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined)
      },
      configurable: true
    });

    // Mock document.execCommand
    document.execCommand = vi.fn().mockReturnValue(true);
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
  });

  it('should copy text to clipboard using navigator.clipboard', async () => {
    const { copyToClipboard } = useClipboard();
    await copyToClipboard('test message');

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test message');
    expect(ElMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'success'
    }));
  });

  it('should fallback to execCommand if navigator.clipboard is missing', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true
    });

    const { copyToClipboard } = useClipboard();
    await copyToClipboard('fallback message');

    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(ElMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'success'
    }));
  });

  it('should add to dossier when recording', async () => {
    const dossierStore = useDossierStore();
    dossierStore.isRecording = true;
    const addSectionSpy = vi.spyOn(dossierStore, 'addSection');

    const { copyToClipboard } = useClipboard();
    await copyToClipboard('important threat data');

    expect(addSectionSpy).toHaveBeenCalledWith('clipboard.generic', { text: 'important threat data' }, 'important threat data');
    expect(ElMessage).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('[REC]')
    }));
  });

  it('should use clipboardBuffer if recording and buffer exists', async () => {
    const dossierStore = useDossierStore();
    dossierStore.isRecording = true;
    dossierStore.clipboardBuffer = 'Buffered Content';

    const { copyToClipboard } = useClipboard();
    await copyToClipboard('new content');

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Buffered Content\n\nnew content');
  });

  it('should render template with placeholders', () => {
    i18nState.tm = () => 'Hello {name}, your IP is {ip}';
    const { renderTemplate } = useClipboard();
    
    const result = renderTemplate('some.key', { name: 'Admin', ip: '1.2.3.4' });
    expect(result).toBe('Hello Admin, your IP is 1.2.3.4');
  });

  it('should handle array templates in renderTemplate', () => {
    (i18nState as any).tm = () => ['Line 1: {val}', 'Line 2'];
    const { renderTemplate } = useClipboard();
    
    const result = renderTemplate('some.key', { val: 'test' });
    expect(result).toBe('Line 1: test\nLine 2');
  });

  it('should handle missing values in templates', () => {
    i18nState.t = () => 'N/A';
    i18nState.tm = () => 'Value: {missing}';
    const { renderTemplate } = useClipboard();
    
    const result = renderTemplate('some.key', {});
    expect(result).toBe('Value: N/A');
  });

  it('should copy formatted content and record it if REC is active', async () => {
    const dossierStore = useDossierStore();
    dossierStore.isRecording = true;
    const addSectionSpy = vi.spyOn(dossierStore, 'addSection');

    i18nState.tm = () => 'Attack on {target}';

    const { copyFormatted } = useClipboard();
    await copyFormatted('attack.template', { target: 'server' });

    expect(addSectionSpy).toHaveBeenCalledWith('attack.template', { target: 'server' }, 'Attack on server');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Attack on server');
  });

  it('should handle errors during copy', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockRejectedValue(new Error('Clipboard fail'))
      },
      configurable: true
    });
    
    const { copyToClipboard } = useClipboard();
    await copyToClipboard('fail');

    expect(ElMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'error'
    }));
  });
});
