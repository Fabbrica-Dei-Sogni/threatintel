<template>
  <div class="cyber-screensaver">
    <div class="screensaver-content">
      <div class="ascii-art">
<pre>
     .--------.
    /          \
   /            \
  |    .----.    |
  |   /  ()  \   |
  |   \      /   |
  |    '----'    |
   \            /
    \          /
     '--------'
</pre>
      </div>
      <div class="glitch-text" :data-text="currentPhrase">{{ currentPhrase }}</div>
      <div class="scanning-line"></div>
      <div class="binary-rain">
        <div v-for="n in 12" :key="n" class="binary-column" :style="{ left: (n-1)*8.5 + '%', animationDelay: (n*0.8) + 's' }">
          {{ generateBinary() }}
        </div>
      </div>
      <div class="status-indicators">
        <div class="indicator">
          <span class="dot pulse"></span>
          <span class="label">GUARDIAN LINK: ACTIVE</span>
        </div>
        <div class="indicator">
          <span class="dot"></span>
          <span class="label">TRAP STATUS: ARMED</span>
        </div>
        <div class="indicator">
          <span class="dot pulse-blue"></span>
          <span class="label">UPTIME: {{ uptime }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t, tm, rt } = useI18n();
const uptime = ref('00:00:00');
const currentPhrase = ref('');
let startTime = Date.now();
let interval;
let phraseInterval;

// Recuperiamo la lista di frasi da i18n
const phrases = computed(() => {
  const list = tm('home.screensaver_phrases');
  return Array.isArray(list) ? list : [];
});

const pickRandomPhrase = () => {
  if (phrases.value.length === 0) return;
  const index = Math.floor(Math.random() * phrases.value.length);
  // rt() serve per renderizzare il messaggio se è un template (o stringa semplice)
  currentPhrase.value = rt(phrases.value[index]);
};

const generateBinary = () => {
  return Array.from({ length: 25 }, () => Math.round(Math.random())).join('\n');
};

const updateUptime = () => {
  const diff = Math.floor((Date.now() - startTime) / 1000);
  const h = String(Math.floor(diff / 3600)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
  const s = String(diff % 60).padStart(2, '0');
  uptime.value = `${h}:${m}:${s}`;
};

onMounted(() => {
  pickRandomPhrase();
  interval = setInterval(updateUptime, 1000);
  phraseInterval = setInterval(pickRandomPhrase, 8000);
});

onUnmounted(() => {
  clearInterval(interval);
  clearInterval(phraseInterval);
});
</script>

<style scoped>
.cyber-screensaver {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 450px;
  width: 100%;
  background: radial-gradient(circle at center, rgba(15, 32, 39, 0.8), rgba(0, 0, 0, 0.9));
  border: 1px solid rgba(0, 217, 255, 0.15);
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 0 100px rgba(0, 0, 0, 0.8);
}

.screensaver-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2;
  padding: 20px;
}

.ascii-art pre {
  font-family: 'JetBrains Mono', monospace;
  color: #00d9ff;
  font-size: 14px;
  line-height: 1.1;
  text-shadow: 0 0 15px rgba(0, 217, 255, 0.5);
  opacity: 0.9;
  animation: pulse-eye 3s ease-in-out infinite;
}

.glitch-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.2rem;
  font-weight: bold;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 30px 40px;
  position: relative;
  text-align: center;
  max-width: 700px;
  line-height: 1.5;
  text-shadow: 0.05em 0 0 #ff4500,
               -0.025em -0.05em 0 #00d9ff,
               0.025em 0.05em 0 #ff8c00;
  animation: glitch 1s infinite;
}

.glitch-text::before,
.glitch-text::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.8;
}

.glitch-text::before {
  animation: glitch-red 0.4s infinite;
  clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
  transform: translate(-0.025em, -0.0125em);
  color: #ff2200;
}

.glitch-text::after {
  animation: glitch-blue 0.3s infinite;
  clip-path: polygon(0 80%, 100% 20%, 100% 100%, 0 100%);
  transform: translate(0.0125em, 0.025em);
  color: #00d9ff;
}

.scanning-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background: linear-gradient(to right, transparent, #00d9ff, transparent);
  box-shadow: 0 0 20px #00d9ff;
  animation: scan 4s linear infinite;
  z-index: 3;
  opacity: 0.4;
}

.binary-rain {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: space-around;
  opacity: 0.15;
  pointer-events: none;
}

.binary-column {
  font-family: 'JetBrains Mono', monospace;
  color: #00d9ff;
  font-size: 11px;
  white-space: pre;
  animation: fall 12s linear infinite;
  filter: blur(0.5px);
}

.status-indicators {
  display: flex;
  gap: 40px;
  margin-top: 40px;
  background: rgba(0, 0, 0, 0.3);
  padding: 15px 30px;
  border-radius: 30px;
  border: 1px solid rgba(0, 217, 255, 0.1);
}

.indicator {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #333;
}

.dot.pulse {
  background: #ff4500;
  box-shadow: 0 0 10px #ff4500;
  animation: pulse-red 1.5s infinite alternate;
}

.dot.pulse-blue {
  background: #00d9ff;
  box-shadow: 0 0 10px #00d9ff;
  animation: pulse-blue 1.5s infinite alternate;
}

.label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  color: #888;
  letter-spacing: 2px;
  font-weight: bold;
}

@keyframes scan {
  0% { top: 0; }
  100% { top: 100%; }
}

@keyframes fall {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}

@keyframes pulse-red {
  from { opacity: 0.3; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1.2); }
}

@keyframes pulse-blue {
  from { opacity: 0.3; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1.2); }
}

@keyframes pulse-eye {
  0%, 100% { opacity: 0.7; transform: scale(1); filter: blur(0px); }
  50% { opacity: 1; transform: scale(1.05); filter: blur(0.5px); }
}

@keyframes glitch {
  0% { transform: translate(0); }
  20% { transform: translate(-2px, 2px); }
  40% { transform: translate(-2px, -2px); }
  60% { transform: translate(2px, 2px); }
  80% { transform: translate(2px, -2px); }
  100% { transform: translate(0); }
}

@keyframes glitch-red {
  0% { clip-path: polygon(0 15%, 100% 15%, 100% 30%, 0 30%); }
  100% { clip-path: polygon(0 70%, 100% 70%, 100% 85%, 0 85%); }
}

@keyframes glitch-blue {
  0% { clip-path: polygon(0 50%, 100% 50%, 100% 55%, 0 55%); }
  100% { clip-path: polygon(0 10%, 100% 10%, 100% 15%, 0 15%); }
}
</style>
