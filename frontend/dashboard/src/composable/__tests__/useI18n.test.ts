import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useI18n } from '../useI18n';
import { setActivePinia, createPinia } from 'pinia';
import { useI18n as useVueI18n } from 'vue-i18n';
import { ref } from 'vue';

vi.mock('vue-i18n', () => ({
  useI18n: vi.fn()
}));

describe('useI18n', () => {
  const mockLocale = ref('it-IT');
  const mockAvailableLocales = ['it-IT', 'en-US'];

  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    mockLocale.value = 'it-IT';
    
    vi.mocked(useVueI18n).mockReturnValue({
      t: (key: string) => key,
      locale: mockLocale,
      availableLocales: mockAvailableLocales
    } as any);
  });

  it('should initialize and change locale', () => {
    const { locale, setLocale } = useI18n();
    
    expect(locale.value).toBe('it-IT');
    
    setLocale('en-US');
    expect(locale.value).toBe('en-US');
    expect(localStorage.getItem('userLocale')).toBe('en-US');
  });

  it('should translate keys', () => {
    const { t } = useI18n();
    expect(t('hello')).toBe('hello');
  });

  it('should not change locale if not available', () => {
    const { locale, setLocale } = useI18n();
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    setLocale('fr-FR');
    expect(locale.value).toBe('it-IT');
    expect(consoleSpy).toHaveBeenCalledWith('Locale fr-FR non disponibile');
    
    consoleSpy.mockRestore();
  });
});
