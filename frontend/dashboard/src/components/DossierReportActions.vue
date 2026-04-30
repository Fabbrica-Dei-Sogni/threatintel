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
    <Teleport to="body" :disabled="!teleport">
      <BaseDossierHUD
        v-if="authStore.isAuthenticated"
        mode="button"
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
          <div class="button-report-container">
            <el-tooltip
              v-if="mode === 'compact'"
              :content="t('common.generateReport')"
              placement="top"
              effect="dark"
            >
              <button @click="toggle" :class="[customClass || 'cyber-report-btn', 'compact', { 'is-active': isOpen }]">
                <span v-if="loadingPdf || loadingHtml" class="spinner-small"></span>
                <span v-else class="btn-content">📄</span>
              </button>
            </el-tooltip>
            <button v-else @click="toggle" :class="[customClass || 'cyber-report-btn', { 'is-active': isOpen }]">
              <span v-if="loadingPdf || loadingHtml" class="spinner-small"></span>
              <span v-else class="btn-content">
                {{ t('common.generateReport').toUpperCase() }}
              </span>
            </button>
          </div>
        </template>
      </BaseDossierHUD>

      <!-- Gated View for Anonymous -->
      <div v-else class="report-actions-gated">
        <button @click="showGate = true" class="cyber-report-btn locked">
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
import { exportDossier } from '../api';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../stores/auth';
import { useViewSettingsStore } from '../stores/viewSettings';
import BaseDossierHUD from './BaseDossierHUD.vue';
import RestrictedIntelligenceGate from './common/RestrictedIntelligenceGate.vue';

const { t, locale } = useI18n();
const authStore = useAuthStore();
const viewStore = useViewSettingsStore();
const showGate = ref(false);

const props = defineProps({
  dossierId: { type: String, required: true },
  accentColor: { type: String, default: '#6366f1' },
  teleport: { type: Boolean, default: false },
  customClass: { type: String, default: '' },
  mode: { type: String, default: 'normal' } // 'normal' | 'compact'
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
  htmlContent.value = '';
  try {
    const htmlData = await exportDossier(props.dossierId, 'html', style, locale.value);
    htmlContent.value = htmlData;
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
    await exportDossier(props.dossierId, 'pdf', style, locale.value);
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

.button-report-container {
  position: relative;
  display: inline-block;
}

.cyber-report-btn {
  background: rgba(15, 23, 42, 0.6);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.3);
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

.cyber-report-btn.compact {
  width: 44px;
  height: 44px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #818cf8;
}

.cyber-report-btn.compact:hover {
  background: #6366f1;
  color: white;
  box-shadow: 0 0 15px rgba(99, 102, 241, 0.4);
  transform: translateY(-2px);
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
</style>

<style>
/* Global Dialog Overrides Shared with ReportActions */
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
}

.cyber-dialog.skin-cyber .el-dialog__title {
  color: #ff4d4d !important;
}
</style>
