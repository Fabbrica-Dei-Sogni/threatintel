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
  <div class="report-actions-wrapper">
    <Teleport to="body" :disabled="mode !== 'sticky'">
      <BaseDossierHUD
        v-if="authStore.isAuthenticated"
        :mode="mode"
        :accentColor="accentColor"
        :loadingPdf="loadingPdf"
        :loadingHtml="loadingHtml"
        :htmlContent="htmlContent"
        :showPreview="showPreview"
        :currentStyle="currentStyle"
        :title="t('home.title')"
        @action="handleHUDAction"
        @closePreview="closePreview"
      >
        <template #trigger="{ toggle, isOpen }">
          <!-- MODE: STICKY -->
          <div v-if="mode === 'sticky'" 
            class="sticky-report-tab" 
            :class="{ 'is-loading': loadingPdf || loadingHtml, 'recorder-active': dossierStore.isEnabled && dossierStore.sections.length > 0 }"
          >
            <div class="tab-trigger" @click="toggle">
              <span v-if="loadingPdf || loadingHtml" class="spinner-small"></span>
              <span v-else class="tab-icon">📊</span>
              <span class="tab-text">{{ t('common.generateReport').toUpperCase() }}</span>
            </div>
          </div>

          <!-- MODE: BUTTON -->
          <div v-else class="button-report-container">
            <button @click="toggle" class="cyber-report-btn" :class="{ 'is-active': isOpen }">
              <span v-if="loadingPdf || loadingHtml" class="spinner-small"></span>
              <span v-else class="btn-content">
                <span class="icon">📊</span>
                {{ t('common.generateReport').toUpperCase() }}
              </span>
            </button>
          </div>
        </template>
      </BaseDossierHUD>

      <!-- Gated View for Anonymous -->
      <div v-else class="report-actions-gated" :class="mode">
        <div v-if="mode === 'sticky'" class="sticky-report-tab locked" @click="showGate = true">
            <div class="tab-trigger">
              <span class="tab-icon">🔒</span>
              <span class="tab-text">{{ t('common.auth_required_title').split(' ')[0] }}...</span>
            </div>
        </div>
        <button v-else @click="showGate = true" class="cyber-report-btn locked">
          <span class="icon">🔒</span>
          {{ t('common.auth_required_title') }}
        </button>

        <el-dialog
          v-model="showGate"
          :title="t('common.auth_required_title')"
          width="400px"
          :custom-class="'cyber-dialog skin-' + viewStore.dashboardSkin"
          destroy-on-close
          append-to-body
        >
          <RestrictedIntelligenceGate mode="compact" />
        </el-dialog>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { fetchReport } from '../api';
import { ElMessage } from 'element-plus';
import { useDossierStore } from '../stores/dossier';
import { useAuthStore } from '../stores/auth';
import BaseDossierHUD from './BaseDossierHUD.vue';
import RestrictedIntelligenceGate from './common/RestrictedIntelligenceGate.vue';
import { useViewSettingsStore } from '../stores/viewSettings';

const { t, locale } = useI18n();
const dossierStore = useDossierStore();
const authStore = useAuthStore();
const viewStore = useViewSettingsStore();

const showGate = ref(false);

const props = defineProps({
  type: String, // 'attack' | 'ip' | 'telnet'
  ip: String,
  sessionId: String,
  ipList: { type: Array, default: null },
  filename: { type: String, default: 'dossier' },
  mode: { type: String, default: 'button' }, // 'sticky' | 'button'
  accentColor: { type: String, default: '#3b82f6' }
});

const showPreview = ref(false);
const htmlContent = ref('');
const loadingHtml = ref(false);
const loadingPdf = ref(false);
const currentStyle = ref('classic');

const handleHUDAction = ({ style, type }) => {
  if (type === 'preview') {
    handlePreview(style);
  } else {
    handleDownload(style);
  }
};

const handlePreview = async (style) => {
  currentStyle.value = style;
  loadingHtml.value = true;
  try {
    const blob = await fetchReport({
      type: props.type,
      ip: props.ip,
      sessionId: props.sessionId,
      ipList: props.ipList ? JSON.stringify(props.ipList) : null,
      format: 'html',
      style: style || currentStyle.value,
      locale: locale.value
    });
    htmlContent.value = await blob.text();
    showPreview.value = true;
  } catch (err) {
    ElMessage.error(t('common.error'));
  } finally {
    loadingHtml.value = false;
  }
};

const closePreview = () => {
  showPreview.value = false;
};

const handleDownload = async (style) => {
  loadingPdf.value = true;
  try {
    const blob = await fetchReport({
      type: props.type,
      ip: props.ip,
      sessionId: props.sessionId,
      ipList: props.ipList ? JSON.stringify(props.ipList) : null,
      format: 'pdf',
      style: style || currentStyle.value,
      locale: locale.value
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const finalFilename = `${props.filename}_${props.ip || props.sessionId}_${style || 'report'}.pdf`;
    link.setAttribute('download', finalFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    ElMessage.error(t('common.error'));
  } finally {
    loadingPdf.value = false;
  }
};
</script>

<style scoped>
.report-actions-wrapper {
  --theme-color: v-bind(accentColor);
}

/* Container & Trigger Styles (Sticky/Button specific) */
.button-report-container {
  position: relative;
  display: inline-block;
}

.cyber-report-btn {
  background: rgba(15, 23, 42, 0.6);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 800;
  font-size: 0.85rem;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 10px;
  backdrop-filter: blur(8px);
}

.cyber-report-btn:hover {
  border-color: var(--theme-color);
  box-shadow: 0 0 15px var(--theme-color);
  transform: translateY(-2px);
}

.cyber-report-btn.is-active {
  background: var(--theme-color);
  color: white;
  border-color: var(--theme-color);
}

.sticky-report-tab {
  position: fixed;
  right: 0;
  top: 15vh;
  display: flex;
  flex-direction: row-reverse;
  align-items: flex-start;
  z-index: 9501;
  transition: top 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.tab-trigger {
  background: rgba(15, 23, 42, 0.9);
  color: var(--theme-color);
  border: 1px solid var(--theme-color);
  border-right: none;
  padding: 24px 10px;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  border-radius: 16px 0 0 16px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  gap: 15px;
}

.tab-trigger:hover {
  background: var(--theme-color);
  color: #fff;
  padding-right: 20px;
}

.tab-icon {
  font-size: 1.4rem;
  transform: rotate(90deg);
}

.tab-text {
  font-size: 0.8rem;
  font-weight: 900;
  letter-spacing: 3px;
}

.spinner-small {
  width: 20px; height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--theme-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .sticky-report-tab { top: 18vh; }
  .cyber-report-btn { padding: 8px 16px; font-size: 0.75rem; }
}

/* Locked State Overrides */
.cyber-report-btn.locked {
  border-style: dashed;
  opacity: 0.7;
  color: #94a3b8;
}

.cyber-report-btn.locked:hover {
  border-color: #f87171;
  box-shadow: 0 0 15px rgba(248, 113, 113, 0.3);
  color: #ef4444;
}

.sticky-report-tab.locked .tab-trigger {
  border-style: dashed;
  color: #94a3b8;
  opacity: 0.8;
}

.sticky-report-tab.locked .tab-trigger:hover {
  background: rgba(248, 113, 113, 0.1);
  color: #f87171;
  border-color: #f87171;
}
</style>

<style>
/* Global Dialog Overrides for Cyber Skin */
.cyber-dialog {
  background: #1e293b !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.cyber-dialog.skin-cyber {
  background: #0d0505 !important;
  border: 1px solid #ff4d4d !important;
}

.cyber-dialog .el-dialog__title {
  color: #5FA5FF !important;
  font-weight: 800;
  letter-spacing: 1px;
}

.cyber-dialog.skin-cyber .el-dialog__title {
  color: #ff4d4d !important;
  text-shadow: 0 0 10px rgba(255, 77, 77, 0.5);
}

.cyber-dialog .el-dialog__headerbtn .el-dialog__close {
  color: #94a3b8 !important;
}
</style>
