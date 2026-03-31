<template>
  <div class="dossier-toggle-container" :class="{ 'is-enabled': dossierStore.isEnabled }">
    <div class="toggle-btn shadow-xl" @click="toggleDossier" :title="t('common.recorderToggle')">
      <!-- Fixed-width wrapper to ensure the icon is ALWAYS centered in the circle part -->
      <div class="icon-fixed-zone">
        <span class="main-icon">🕵️</span>
        <div class="status-led" :class="{ 'led-active': dossierStore.isEnabled }"></div>
      </div>

      <!-- Label revealed on expansion -->
      <div class="label-reveal h-mobile">
        {{ t('common.recorderToggle').toUpperCase() }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { useDossierStore } from '../stores/dossier';
import { useI18n } from 'vue-i18n';

const dossierStore = useDossierStore();
const { t } = useI18n();

const toggleDossier = () => {
  dossierStore.isEnabled = !dossierStore.isEnabled;
};
</script>

<style scoped>
.dossier-toggle-container {
  position: fixed;
  bottom: 25px;
  right: 92px;
  z-index: 1001;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.toggle-btn {
  position: relative;
  width: 52px;
  height: 52px;
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  color: #94a3b8;
}

.is-enabled .toggle-btn {
  border-color: rgba(16, 185, 129, 0.4);
  background: rgba(13, 17, 23, 0.9);
  color: #10b981;
}

.toggle-btn:hover {
  width: 190px;
  border-radius: 32px;
  background: rgba(30, 41, 59, 1);
  border-color: #10b981;
  color: #fff;
}

.icon-fixed-zone {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}

.main-icon {
  font-size: 1.8rem;
  transition: transform 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-btn:hover .main-icon {
  transform: scale(1.1);
}

.status-led {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #334155;
  border: 1px solid #0f172a;
  transition: all 0.3s;
}

.led-active {
  background: #10b981;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.8);
  animation: led-pulse 2.5s infinite;
}

@keyframes led-pulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
  100% { opacity: 1; transform: scale(1); }
}

.label-reveal {
  font-size: 0.65rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: 1px;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s;
  white-space: nowrap;
  padding-right: 20px;
}

.toggle-btn:hover .label-reveal {
  opacity: 1;
  transform: translateX(0);
}

@media (max-width: 600px) {
  .h-mobile { display: none; }
  .dossier-toggle-container {
    right: auto;
    left: 20px;
    bottom: 25px;
  }
  .toggle-btn:hover { width: 52px; border-radius: 50%; padding: 0; }
}
</style>
