<!--
  ThreatIntel - Reference Implementation Dashboard
  
  This frontend application is provided as a reference implementation of the 
  ThreatIntel Distributed Forensics Engine. 
  
  Copyright (C) 2026 Alessandro Modica. All rights reserved.
  
  Use of this frontend for educational, research, and non-commercial purposes 
  is permitted. Production or commercial use of this specific dashboard 
  interface requires a valid commercial license from the author.
  
  See root LICENSE.md for core engine licensing details.
-->
<template>
  <div class="restricted-intelligence-gate" :class="[{ 'compact': mode === 'compact' }, 'skin-' + dashboardSkin]">
    <div class="gate-overlay">
      <div class="lock-icon">🔒</div>
      <h4>{{ t('common.auth_required_title') || 'SECURITY CLEARANCE REQUIRED' }}</h4>
      <p v-if="mode !== 'compact'">
        {{ t('common.auth_required_desc') || 'Forensic investigation dossiers are restricted to identified operators.' }}
      </p>
      <router-link :to="{ name: 'Login', query: { redirect: $route.fullPath } }" class="btn-action gate-login-btn">
        {{ t('auth.login') || 'LOGIN' }}
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useViewSettingsStore } from '../../stores/viewSettings';
import { storeToRefs } from 'pinia';

const { t } = useI18n();
const route = useRoute();
const viewStore = useViewSettingsStore();
const { dashboardSkin } = storeToRefs(viewStore);

defineProps({
  mode: {
    type: String,
    default: 'normal' // 'normal' | 'compact'
  }
});
</script>

<style scoped>
.restricted-intelligence-gate {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 250px;
  background: rgba(15, 23, 42, 0.4);
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  border: 1px dashed rgba(136, 170, 255, 0.2);
  margin: 10px 0;
  transition: all 0.3s ease;
}

.gate-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 30px;
  z-index: 2;
}

.lock-icon {
  font-size: 3rem;
  margin-bottom: 15px;
  filter: drop-shadow(0 0 10px rgba(95, 165, 255, 0.4));
  animation: gate-pulse 2s infinite ease-in-out;
}

@keyframes gate-pulse {
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
}

h4 {
  color: #5FA5FF;
  margin: 0 0 10px 0;
  letter-spacing: 1.5px;
  font-weight: 800;
  font-size: 1.1rem;
}

p {
  font-size: 0.85rem;
  color: #94a3b8;
  max-width: 320px;
  margin-bottom: 25px;
  line-height: 1.5;
}

.gate-login-btn {
  text-decoration: none;
  display: inline-block;
  min-width: 120px;
}

/* Compact Mode */
.restricted-intelligence-gate.compact {
  min-height: 150px;
  padding: 15px;
}

.restricted-intelligence-gate.compact .lock-icon {
  font-size: 1.5rem;
  margin-bottom: 8px;
}

.restricted-intelligence-gate.compact h4 {
  font-size: 0.9rem;
  margin-bottom: 12px;
}

/* Cyber Skin Overrides */
.restricted-intelligence-gate.skin-cyber {
  background: rgba(0, 0, 0, 0.8) !important;
  border: 1px solid #00ffff !important;
  border-radius: 0 !important;
  box-shadow: inset 0 0 20px rgba(0, 255, 255, 0.1), 0 0 30px rgba(0, 0, 0, 0.5) !important;
}

.restricted-intelligence-gate.skin-cyber h4 {
  color: #00ffff !important;
  text-shadow: 0 0 10px #00ffff !important;
  font-family: 'JetBrains Mono', monospace;
}

.restricted-intelligence-gate.skin-cyber p {
  color: #00d4ff !important;
  opacity: 0.8;
}

.restricted-intelligence-gate.skin-cyber .lock-icon {
  filter: drop-shadow(0 0 12px #00ffff) !important;
}

.restricted-intelligence-gate.skin-cyber .gate-login-btn {
  background: #00ffff !important;
  color: #000 !important;
  border-radius: 0;
  font-weight: 900;
  box-shadow: 0 0 15px #00ffff;
}
</style>
