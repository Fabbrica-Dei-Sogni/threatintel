<template>
  <div class="dossier-toggle-container" :class="{ 'is-enabled': dossierStore.isEnabled, 'recorder-active': dossierStore.isEnabled && dossierStore.sections.length > 0 }">
    <!-- Tooltip is handled by the 'title' attribute -->
    <div class="toggle-btn shadow-xl" @click="toggleDossier" :title="t('common.recorderToggle')">
      <!-- Fixed Investigator Icon -->
      <div class="icon-fixed-zone">
        <span class="main-icon">🕵️</span>
        <div class="status-led" :class="{ 'led-active': dossierStore.isEnabled }"></div>
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
  left: 24px;
  z-index: 1001;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.recorder-active {
  bottom: 85px;
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
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  overflow: hidden;
  color: #94a3b8;
}

.is-enabled .toggle-btn {
  border-color: rgba(16, 185, 129, 0.4);
  background: rgba(13, 17, 23, 0.9);
  color: #10b981;
}

.toggle-btn:hover {
  background: rgba(30, 41, 59, 1);
  border-color: #10b981;
  transform: translateY(-2px);
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
  /* Animation disabled by default as per request */
}

/* Optional slow pulse animation (kept here but not attached to led-active) */
@keyframes led-pulse-slow {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
  100% { opacity: 1; transform: scale(1); }
}

@media (max-width: 600px) {
  .dossier-toggle-container {
    left: 20px;
    bottom: 25px;
  }
  .recorder-active {
    bottom: 85px;
  }
}
</style>
