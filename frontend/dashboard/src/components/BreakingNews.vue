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
import CountryFlag from './CountryFlag.vue';

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

const { t } = useI18n();

const currentHeadlineIndex = ref(0);
const typedText = ref('');
const isTyping = ref(false);
const contentRef = ref(null);
let rotationInterval = null;

/**
 * Helper to format IP with ISP if available
 */
const formatIpWithIsp = (ip, ipDetails) => {
  const isp = ipDetails?.ipinfo?.org || ipDetails?.isp || ipDetails?.ipinfo?.isp;
  if (isp) {
    // Clean some common ISP prefixes/suffixes if needed (optional)
    const cleanIsp = isp.replace(/^AS\d+\s+/, '');
    return `${ip} (${cleanIsp})`;
  }
  return ip;
};

const headlines = computed(() => {
  const list = [];

  // 1. Geopolitical Narrative
  if (props.attacks.length > 0) {
    const countries = props.attacks.map(a => a.ipDetails?.ipinfo?.country || a.ipDetails?.country).filter(Boolean);
    if (countries.length > 0) {
      const counts = countries.reduce((acc, c) => ({ ...acc, [c]: (acc[c] || 0) + 1 }), {});
      const topCountry = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
      list.push({ text: t('home.breakingNews.topCountry', { country: topCountry }), countryCode: topCountry });
    }
  }

  // 2. Recent Attack IPs
  if (props.attacks.length >= 3) {
    const formattedIps = props.attacks.slice(0, 3).map(a => formatIpWithIsp(a.request?.ip, a.ipDetails)).join(', ');
    list.push({ text: t('home.breakingNews.lastAttacks', { ips: formattedIps }), icon: '🛰️' });
  }

  // 3. Persistent Actor Intelligence (Sessions)
  if (props.sessions.length > 0) {
    const mostActive = [...props.sessions].sort((a, b) => (b.eventCount || 0) - (a.eventCount || 0))[0];
    if (mostActive && (mostActive.eventCount || 0) > 2) {
      const formattedActor = formatIpWithIsp(mostActive.src_ip, mostActive.ipDetailsId);
      list.push({
        text: t('home.breakingNews.mostActiveSession', { ip: formattedActor, count: mostActive.eventCount || 0 }),
        icon: '📟',
        countryCode: mostActive.ipDetailsId?.ipinfo?.country || mostActive.ipDetailsId?.country
      });
    }
  }

  // 4. Recent Session IPs
  if (props.sessions.length >= 3) {
    const formattedIps = props.sessions.slice(0, 3).map(s => formatIpWithIsp(s.src_ip, s.ipDetailsId)).join(', ');
    list.push({ text: t('home.breakingNews.lastSessions', { ips: formattedIps }), icon: '📟' });
  }

  // 5. Critical Incursion Alert
  if (props.attacks.length > 0) {
    const critical = props.attacks.find(a => a.dangerLevel >= 4);
    if (critical) {
      const formattedIp = formatIpWithIsp(critical.request?.ip, critical.ipDetails);
      list.push({ text: t('home.breakingNews.criticalAlert', { ip: formattedIp }), icon: '⚠️' });
    }
  }

  // 6. Emerging Traffic Pattern
  if (props.logs.length > 0) {
    const specificUrls = props.logs.map(l => l.request?.url).filter(u => u && u !== '/' && u !== '\\');
    if (specificUrls.length > 0) {
      const counts = specificUrls.reduce((acc, u) => ({ ...acc, [u]: (acc[u] || 0) + 1 }), {});
      const topUrl = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
      list.push({ text: t('home.breakingNews.targetDiscovery', { path: topUrl }), icon: '🔍' });
    }
  }

  if (list.length === 0) list.push({ text: t('common.noDataFound'), icon: '⏸️' });
  return list;
});

const doubleHeadlines = computed(() => [...headlines.value, ...headlines.value]);
const currentHeadline = computed(() => headlines.value[currentHeadlineIndex.value]);

// Calculate animation duration based on content length for the ticker
const trackStyle = computed(() => {
  if (props.mode !== 'ticker') return {};
  const duration = headlines.value.length * 15; // 15s per set of headlines
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
  if (props.mode === 'ticker') return; // Ticker uses CSS animation

  typeText(currentHeadline.value.text);
  rotationInterval = setInterval(() => {
    currentHeadlineIndex.value = (currentHeadlineIndex.value + 1) % headlines.value.length;
    typeText(currentHeadline.value.text);
  }, 7000);
};

onMounted(() => {
  startRotation();
});

onBeforeUnmount(() => {
  if (rotationInterval) clearInterval(rotationInterval);
});

watch(() => props.attacks.length, () => {
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

/* TICKER TRACK: The key to seamless loop */
.ticker-track {
  display: flex;
  align-items: center;
  white-space: nowrap;
  gap: 40px;
  animation: ticker-scroll linear infinite;
  will-change: transform;
}

@keyframes ticker-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); } /* Stop at half because we doubled the content */
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
  box-shadow: 2px 0 10px rgba(0,0,0,0.3);
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
  from { transform: scale(0.8); opacity: 0.5; }
  to { transform: scale(1.2); opacity: 1; }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.fade-news-enter-active,
.fade-news-leave-active {
  transition: all 0.3s ease;
}

.fade-news-enter-from { opacity: 0; transform: translateY(10px); }
.fade-news-leave-to { opacity: 0; transform: translateY(-10px); }

/* Visibility for Header Mode */
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
