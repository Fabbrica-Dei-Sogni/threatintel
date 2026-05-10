import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface NewsItem {
  text: string;
  countryCode?: string;
  icon?: string;
  isLive?: boolean;
}

export const useNewsStore = defineStore('news', () => {
  const aiHeadlines = ref<NewsItem[]>([]);

  /**
   * Aggiunge una nuova headline live, gestendo la deduplicazione 
   * e il limite massimo di elementi.
   */
  function addHeadline(item: NewsItem) {
    // Evitiamo duplicati esatti in rapida successione
    const exists = aiHeadlines.value.some(h => h.text === item.text);
    if (!exists) {
      aiHeadlines.value = [item, ...aiHeadlines.value].slice(0, 15);
    }
  }

  function setHeadlines(items: NewsItem[]) {
    aiHeadlines.value = items;
  }

  function clearNews() {
    aiHeadlines.value = [];
  }

  return {
    aiHeadlines,
    addHeadline,
    setHeadlines,
    clearNews
  };
});
