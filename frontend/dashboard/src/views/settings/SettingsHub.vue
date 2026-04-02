<template>
  <div class="settings-hub-container">
    <header class="header-top">
      <div class="header-left">
        <button class="back-btn" @click="goHome" :title="t('common.back')">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 class="page-title">{{ t('nav.configuration').toUpperCase() }}</h1>
      </div>
      <LanguageSwitcher />
    </header>

    <div class="hub-content">
      <div class="hub-grid">
        <!-- Tile 1: Backend Profiles -->
        <div class="hub-tile glass-card" @click="goToProfiles">
          <div class="tile-icon profile-icon">🛡️</div>
          <div class="tile-info">
            <h3>{{ t('settings.profiles').toUpperCase() }}</h3>
            <p>{{ t('settings.hubProfilesDesc') }}</p>
          </div>
          <div class="tile-arrow">→</div>
        </div>

        <!-- Tile 2: Recording Algorithms -->
        <div class="hub-tile glass-card" @click="goToAlgorithms">
          <div class="tile-icon algorithm-icon">⚙️</div>
          <div class="tile-info">
            <h3>{{ t('config.title').toUpperCase() }}</h3>
            <p>{{ t('settings.hubAlgorithmsDesc') }}</p>
          </div>
          <div class="tile-arrow">→</div>
        </div>
      </div>

      <div class="hub-footer">
        <p class="system-status">
          <span class="status-dot pulse"></span>
          {{ t('settings.systemOperational').toUpperCase() }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import LanguageSwitcher from '../../components/LanguageSwitcher.vue';

const { t } = useI18n();
const router = useRouter();

const goHome = () => router.push('/');
const goToProfiles = () => router.push('/settings/profiles');
const goToAlgorithms = () => router.push('/settings/algorithms');
</script>

<style scoped>
.settings-hub-container {
  padding: 25px 30px;
  min-height: 100vh;
  color: #e0e7ff;
  background-color: #020617;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 50px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: 4px;
  text-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
}

.back-btn {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  cursor: pointer;
  padding: 10px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.back-btn:hover {
  background-color: rgba(255, 255, 255, 0.08);
  color: #fff;
  transform: translateX(-3px);
}

.hub-content {
  max-width: 900px;
  margin: 0 auto;
}

.hub-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 25px;
  margin-bottom: 40px;
}

.hub-tile {
  display: flex;
  align-items: center;
  padding: 35px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
  overflow: hidden;
}

.hub-tile::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: transparent;
  transition: all 0.3s;
}

.hub-tile:hover {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(99, 102, 241, 0.3);
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}

.hub-tile:hover::before {
  background: #6366f1;
}

.tile-icon {
  font-size: 3rem;
  margin-right: 25px;
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.2));
}

.tile-info {
  flex: 1;
}

.tile-info h3 {
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: 2px;
  margin: 0 0 8px 0;
  color: #fff;
}

.tile-info p {
  font-size: 0.9rem;
  color: #94a3b8;
  margin: 0;
  line-height: 1.5;
}

.tile-arrow {
  font-size: 1.5rem;
  color: #475569;
  font-weight: 100;
  transition: all 0.3s;
}

.hub-tile:hover .tile-arrow {
  color: #6366f1;
  transform: translateX(5px);
}

.hub-footer {
  text-align: center;
  margin-top: 60px;
  opacity: 0.5;
}

.system-status {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 2px;
  color: #94a3b8;
}

.status-dot {
  width: 8px;
  height: 8px;
  background-color: #10b981;
  border-radius: 50%;
}

.pulse {
  animation: pulse-green 2s infinite;
}

@keyframes pulse-green {
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

@media (max-width: 600px) {
  .hub-grid {
    grid-template-columns: 1fr;
  }
  .hub-tile {
    padding: 25px;
  }
  .tile-icon {
    font-size: 2.5rem;
  }
}
</style>
