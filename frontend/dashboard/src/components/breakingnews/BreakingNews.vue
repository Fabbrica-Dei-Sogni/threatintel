<template>
  <div class="breaking-news-container" :class="[mode, { 'is-active': isVisible }]">
    <div class="news-badge">
      <span class="pulse-dot"></span>
      {{ t('home.breakingNews.badge') }}
    </div>

    <div class="news-content" ref="contentRef">
      <!-- TYPEWRITER MODE: Single Headline Rotation -->
      <transition v-if="mode === 'typewriter'" name="fade-news" mode="out-in">
        <div :key="currentHeadlineIndex" class="headline-wrapper">
          <div class="visual-intel" v-if="currentHeadline?.countryCode || currentHeadline?.icon">
            <CountryFlag v-if="currentHeadline.countryCode" :countryCode="currentHeadline.countryCode" />
            <span v-else class="status-icon">{{ currentHeadline.icon }}</span>
          </div>
          <p class="headline-text">
            {{ typedText }}
            <span v-if="isTyping" class="cursor">|</span>
          </p>
        </div>
      </transition>

      <!-- TICKER MODE: Continuous Seamless Flow -->
      <div v-else class="ticker-track" :style="trackStyle">
        <div v-for="(hl, idx) in doubleHeadlines" :key="idx" class="headline-wrapper ticker-item">
          <div class="visual-intel" v-if="hl.countryCode || hl.icon">
            <CountryFlag v-if="hl.countryCode" :countryCode="hl.countryCode" />
            <span v-else class="status-icon">{{ hl.icon }}</span>
          </div>
          <p class="headline-text">{{ hl.text }}</p>
          <span class="news-separator">///</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import CountryFlag from '../CountryFlag.vue';
import { triggerAgenticNews, generateStaticFallback } from './NewsGenerator';
import { translateFromIt } from '../../utils/translator';
import { useSocketStore } from '../../stores/socket';
import { SocketEvents } from '../../models/SocketEvents';

const props = defineProps({
  attacks: {
    type: Array,
    default: () => []
  },
  sessions: {
    type: Array,
    default: () => []
  },
  logs: {
    type: Array,
    default: () => []
  },
  mode: {
    type: String,
    default: 'typewriter',
    validator: (v) => ['typewriter', 'ticker'].includes(v)
  },
  isVisible: {
    type: Boolean,
    default: true
  }
});

const { t, locale } = useI18n();
const socketStore = useSocketStore();

const currentHeadlineIndex = ref(0);
const typedText = ref('');
const isTyping = ref(false);
const contentRef = ref(null);
const aiHeadlines = ref([]); // Reattivo per le news generate dall'AI
let rotationInterval = null;
let lastFullTriggerTime = 0;
const TRIGGER_COOLDOWN_MS = 60000; // Al massimo un giro completo ogni 60 secondi
let debounceTimer = null;

/**
 * Aggiorna le news utilizzando la logica incubata in NewsGenerator
 * Ora fa solo il trigger, i risultati arrivano via socket.
 */
const updateNews = async (force = false) => {
  // 1. Fonte principale: Carichiamo subito le news statiche (veloci e affidabili)
  const staticNews = generateStaticFallback(props, t);
  aiHeadlines.value = staticNews;

  // 2. Controllo Cooldown per evitare spam di chiamate AI (ask)
  const now = Date.now();
  if (!force && (now - lastFullTriggerTime < TRIGGER_COOLDOWN_MS)) {
    return;
  }

  try {
    // 3. Fonte a corredo: Triggeriamo la generazione agentica
    console.debug('[BreakingNews] Triggering Agentic AI Scan...');
    lastFullTriggerTime = now;
    //XXX: commentato per valutarne le performance complessive delle chiamate a searchSemantic e ask che al momento in cui si scrive sono instabili
    //await triggerAgenticNews(props, locale.value, t);
  } catch (err) {
    console.error('[BreakingNews] Agentic trigger failed:', err);
  }
};

const debouncedUpdate = () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    updateNews();
  }, 2000); // Aspettiamo che i dati si stabilizzino per 2 secondi
};

/**
 * Gestisce l'integrazione con Socket.io per news in tempo reale
 */
const setupSocketListeners = () => {
  const socket = socketStore.socket;
  if (!socket) return;

  // A. Risposte AI in tempo reale (Giro di eventi RAG/Assistant)
  socket.on(SocketEvents.INTEL_AI_RESPONSE, async (data) => {
    if (data.answer) {
      // Se avevamo solo il messaggio di "sistema in attesa", lo puliamo al primo arrivo AI
      const isIdle = aiHeadlines.value.length === 1 && aiHeadlines.value[0].text === t('home.system_idle');

      try {
        // Traducono la risposta AI nella lingua corrente del frontend
        const translatedText = await translateFromIt(data.answer, locale.value);

        const newsItem = {
          text: translatedText,
          icon: '🤖',
          isLive: true
        };

        if (isIdle) {
          aiHeadlines.value = [newsItem];
        } else {
          // Aggiungiamo in testa per dare visibilità immediata, evitando duplicati esatti
          const exists = aiHeadlines.value.some(h => h.text === translatedText);
          if (!exists) {
            aiHeadlines.value = [newsItem, ...aiHeadlines.value].slice(0, 15);
          }
        }

        // Se siamo in typewriter e abbiamo appena ricevuto una news, forziamo la visualizzazione
        if (props.mode === 'typewriter' && aiHeadlines.value.length === 1) {
          currentHeadlineIndex.value = 0;
          typeText(newsItem.text);
        }
      } catch (err) {
        console.error('[BreakingNews] Translation failed for AI response:', err);
      }
    }
  });
};

const headlines = computed(() => aiHeadlines.value.length > 0 ? aiHeadlines.value : [{ text: t('common.loading'), icon: '⏳' }]);
const doubleHeadlines = computed(() => [...headlines.value, ...headlines.value]);
const currentHeadline = computed(() => headlines.value[currentHeadlineIndex.value]);

const trackStyle = computed(() => {
  if (props.mode !== 'ticker') return {};
  const duration = headlines.value.length * 15;
  return {
    animationDuration: `${duration}s`
  };
});

const typeText = async (text) => {
  if (props.mode === 'ticker') return;
  isTyping.value = true;
  typedText.value = '';
  for (let i = 0; i <= text.length; i++) {
    typedText.value = text.slice(0, i);
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  isTyping.value = false;
};

const startRotation = () => {
  if (rotationInterval) clearInterval(rotationInterval);
  if (props.mode === 'ticker') return;

  if (currentHeadline.value) {
    typeText(currentHeadline.value.text);
  }

  rotationInterval = setInterval(() => {
    if (headlines.value.length > 0) {
      currentHeadlineIndex.value = (currentHeadlineIndex.value + 1) % headlines.value.length;
      typeText(currentHeadline.value.text);
    }
  }, 7000);
};

const cleanupSocketListeners = () => {
  if (!socketStore.socket) return;
  socketStore.socket.off(SocketEvents.INTEL_AI_RESPONSE);
};

// Monitoriamo la disponibilità del socket (gestisce caricamento ritardato in App.vue)
watch(() => socketStore.socket, (newSocket) => {
  if (newSocket) {
    cleanupSocketListeners();
    setupSocketListeners();
  }
}, { immediate: true });

onMounted(async () => {
  debouncedUpdate();
  startRotation();
});

onBeforeUnmount(() => {
  if (rotationInterval) clearInterval(rotationInterval);
  if (debounceTimer) clearTimeout(debounceTimer);
  cleanupSocketListeners();
});

watch([() => props.attacks.length, locale], () => {
  debouncedUpdate();
  currentHeadlineIndex.value = 0;
  startRotation();
});
</script>

<style scoped>
.breaking-news-container {
  display: flex;
  align-items: center;
  gap: 15px;
  background: var(--theme-surface, rgba(15, 23, 42, 0.4));
  border-left: 4px solid var(--theme-accent, #F87171);
  padding: 12px 20px;
  border-radius: 4px;
  height: 50px;
  overflow: hidden;
  margin: 10px 0;
  backdrop-filter: var(--theme-blur, blur(8px));
  border: 1px solid rgba(var(--theme-accent-rgb, 248, 113, 113), 0.1);
  box-shadow: inset 0 0 20px rgba(var(--theme-accent-rgb, 248, 113, 113), 0.05);
  transition: opacity 0.5s ease, transform 0.5s ease;
  opacity: 1;
}

.breaking-news-container.ticker {
  background: transparent;
  border: none;
  border-left: 2px solid var(--theme-primary, #5FA5FF);
  box-shadow: none;
  margin: 0;
  height: 40px;
  flex: 1;
}

.breaking-news-container.ticker .news-badge {
  background: var(--theme-primary, #5FA5FF);
  box-shadow: 0 0 10px rgba(var(--theme-primary-rgb, 95, 165, 255), 0.3);
  z-index: 10;
}

.news-content {
  flex: 1;
  min-width: 0;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
}

.ticker-track {
  display: flex;
  align-items: center;
  white-space: nowrap;
  gap: 40px;
  animation: ticker-scroll linear infinite;
  will-change: transform;
}

@keyframes ticker-scroll {
  0% {
    transform: translateX(0);
  }

  100% {
    transform: translateX(-50%);
  }
}

.ticker-item {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.news-separator {
  color: var(--theme-primary, #5FA5FF);
  font-weight: 800;
  opacity: 0.5;
  margin-left: 10px;
  font-family: var(--font-cyber-mono, monospace);
}

.headline-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.news-badge {
  background: var(--theme-accent, #F87171);
  color: var(--theme-bg, #0F172A);
  font-weight: 800;
  font-size: 0.7rem;
  padding: 3px 8px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  flex-shrink: 0;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.3);
}

.pulse-dot {
  width: 6px;
  height: 6px;
  background: var(--theme-bg, #0F172A);
  border-radius: 50%;
  animation: pulse 1s infinite alternate;
}

.status-icon {
  font-size: 1.2rem;
}

.headline-text {
  margin: 0;
  font-family: var(--font-cyber-mono, monospace);
  font-size: 0.9rem;
  color: var(--theme-text, #E2E8F0);
  white-space: nowrap;
}

.cursor {
  display: inline-block;
  width: 2px;
  margin-left: 2px;
  background: var(--theme-accent, #F87171);
  animation: blink 1s infinite;
}

@keyframes pulse {
  from {
    transform: scale(0.8);
    opacity: 0.5;
  }

  to {
    transform: scale(1.2);
    opacity: 1;
  }
}

@keyframes blink {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0;
  }
}

.fade-news-enter-active,
.fade-news-leave-active {
  transition: all 0.3s ease;
}

.fade-news-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-news-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.breaking-news-container:not(.is-active) {
  opacity: 0;
  transform: translateY(-20px);
  pointer-events: none;
}

@media (max-width: 768px) {
  .headline-text {
    font-size: 0.8rem;
  }

  .news-badge {
    font-size: 0.65rem;
    padding: 2px 6px;
  }

  .breaking-news-container {
    gap: 10px;
  }
}
</style>
