<template>
  <div class="report-actions-wrapper">
    <BaseDossierHUD
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
            <span class="tab-text">{{ t('home.dashboard').toUpperCase() }}</span>
          </div>
        </div>

        <!-- MODE: BUTTON -->
        <div v-else class="button-report-container">
          <button @click="toggle" class="cyber-report-btn" :class="{ 'is-active': isOpen }">
            <span v-if="loadingPdf || loadingHtml" class="spinner-small"></span>
            <span v-else class="btn-content">
              <span class="icon">📊</span>
              {{ t('home.dashboard').toUpperCase() }}
            </span>
          </button>
        </div>
      </template>
    </BaseDossierHUD>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { fetchReport } from '../api';
import { ElMessage } from 'element-plus';
import { useDossierStore } from '../stores/dossier';
import BaseDossierHUD from './BaseDossierHUD.vue';

const { t, locale } = useI18n();
const dossierStore = useDossierStore();

const props = defineProps({
  type: String, // 'attack' | 'ip' | 'telnet'
  ip: String,
  sessionId: String,
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
      format: 'html',
      style: style,
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
</style>
