/**
 * Simple Runtime Translator utility
 * Uses MyMemory API (free, no key required for low volume)
 */

const CACHE_KEY = 'threatintel_translation_cache';

interface TranslationCache {
  [key: string]: {
    [locale: string]: string;
  };
}

const getCache = (): TranslationCache => {
  const cached = localStorage.getItem(CACHE_KEY);
  return cached ? JSON.parse(cached) : {};
};

const saveToCache = (text: string, locale: string, translated: string) => {
  const cache = getCache();
  if (!cache[text]) cache[text] = {};
  cache[text][locale] = translated;
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
};

/**
 * Translates text from Italian to target locale
 */
export async function translateFromIt(text: string, targetLocale: string): Promise<string> {
  // Normalize target locale (e.g., 'en-US' -> 'en')
  const lang = targetLocale.split('-')[0].toLowerCase();
  
  if (lang === 'it') return text;

  // Check Cache
  const cache = getCache();
  if (cache[text] && cache[text][lang]) {
    return cache[text][lang];
  }

  try {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=it|${lang}`
    );
    const data = await response.json();

    if (data.responseData && data.responseData.translatedText) {
      const translated = data.responseData.translatedText;
      saveToCache(text, lang, translated);
      return translated;
    }
    
    return text; // Fallback to original
  } catch (error) {
    console.error('[Translator] Error translating text:', error);
    return text;
  }
}
