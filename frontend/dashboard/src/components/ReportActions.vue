<template>
  <div class="report-actions-container" @mouseenter="showCard = true" @mouseleave="showCard = false">
    <!-- Main Button -->
    <button class="report-btn main-report-btn" :disabled="loadingPdf || loadingHtml">
      <span v-if="loadingPdf || loadingHtml" class="spinner-small"></span>
      <span v-else>📄</span> {{ t('common.generateReport').toUpperCase() }}
    </button>

    <!-- Hover Card -->
    <transition name="fade-slide">
      <div v-if="showCard" class="actions-card glass-morphism">
        <div class="card-arrow"></div>
        <button @click="handlePreview" class="action-item" :disabled="loadingHtml">
          <span class="icon">👁️</span>
          <span class="text">{{ t('common.viewHtml') }}</span>
          <span v-if="loadingHtml" class="spinner-tiny"></span>
        </button>
        <div class="divider"></div>
        <button @click="handleDownload" class="action-item" :disabled="loadingPdf">
          <span class="icon">📥</span>
          <span class="text">{{ t('common.downloadPdf') }}</span>
          <span v-if="loadingPdf" class="spinner-tiny"></span>
        </button>
      </div>
    </transition>

    <!-- Preview Modal -->
    <transition name="modal-fade">
      <div v-if="showPreview" class="preview-modal-overlay" @click.self="showPreview = false">
        <div class="preview-modal-content glass-morphism">
          <div class="modal-header">
            <h3>{{ t('common.generateReport') }} - {{ t('common.preview') }}</h3>
            <button class="close-btn" @click="showPreview = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="report-paper shadow-lg">
              <div v-if="htmlContent" v-html="htmlContent" class="html-container"></div>
              <div v-else class="loading-preview">
                 <span class="spinner-large"></span>
                 <p>{{ t('common.loading') }}</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="handleDownload" class="download-footer-btn" :disabled="loadingPdf">
              <span v-if="loadingPdf" class="spinner-small"></span>
              <span v-else>📥</span> {{ t('common.downloadPdf') }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { fetchReport } from '../api';
import { ElMessage } from 'element-plus';

const { t } = useI18n();

const props = defineProps({
  type: {
    type: String, // 'attack', 'telnet', 'ip'
    required: true
  },
  ip: {
    type: String,
    default: null
  },
  sessionId: {
    type: String,
    default: null
  },
  filename: {
    type: String,
    default: 'dossier'
  }
});

const showCard = ref(false);
const showPreview = ref(false);
const htmlContent = ref('');
const loadingHtml = ref(false);
const loadingPdf = ref(false);

const handlePreview = async () => {
  if (htmlContent.value) {
    showPreview.value = true;
    return;
  }

  loadingHtml.value = true;
  try {
    const blob = await fetchReport({
      type: props.type,
      ip: props.ip,
      sessionId: props.sessionId,
      format: 'html'
    });
    const text = await blob.text();
    htmlContent.value = text;
    showPreview.value = true;
  } catch (err) {
    console.error('Error fetching HTML preview:', err);
    ElMessage.error(t('common.error'));
  } finally {
    loadingHtml.value = false;
  }
};

const handleDownload = async () => {
  loadingPdf.value = true;
  try {
    const blob = await fetchReport({
      type: props.type,
      ip: props.ip,
      sessionId: props.sessionId,
      format: 'pdf'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const finalFilename = `${props.filename}_${props.ip || props.sessionId}.pdf`;
    link.setAttribute('download', finalFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error downloading PDF:', err);
    ElMessage.error(t('common.error'));
  } finally {
    loadingPdf.value = false;
  }
};
</script>

<style scoped>
.report-actions-container {
  position: relative;
  display: inline-block;
}

.main-report-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  font-size: 0.85rem;
  letter-spacing: 0.5px;
}

.main-report-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

/* Hover Card */
.actions-card {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 180px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  padding: 6px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.card-arrow {
  position: absolute;
  top: -6px;
  right: 20px;
  width: 12px;
  height: 12px;
  background: inherit;
  border-left: 1px solid rgba(255, 255, 255, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  transform: rotate(45deg);
  backdrop-filter: blur(10px);
}

.glass-morphism {
  background: rgba(20, 20, 30, 0.85);
  backdrop-filter: blur(12px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.action-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  color: #eee;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  width: 100%;
  text-align: left;
  font-size: 0.9rem;
}

.action-item:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.action-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 4px 0;
}

/* Modal */
.preview-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.preview-modal-content {
  width: 90%;
  max-width: 900px;
  height: 90%;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  overflow: hidden;
}

.modal-header {
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.close-btn {
  background: transparent;
  border: none;
  color: #aaa;
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #fff;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 40px;
  background: #1a1a2e;
  display: flex;
  justify-content: center;
}

.report-paper {
  background: white;
  width: 100%;
  max-width: 800px;
  min-height: 1100px;
  color: #333;
  padding: 0;
  border-radius: 4px;
  position: relative;
}

.html-container {
  width: 100%;
  height: 100%;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: flex-end;
}

.download-footer-btn {
  background: #2a2a4e;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  transition: background 0.2s;
}

.download-footer-btn:hover:not(:disabled) {
  background: #3a3a6e;
}

/* Animations */
.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.3s ease;
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.modal-fade-enter-active, .modal-fade-leave-active {
  transition: opacity 0.3s ease;
}
.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
}

/* Spinners */
.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-tiny {
  width: 12px;
  height: 12px;
  border: 1.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-left: auto;
}

.spinner-large {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top-color: #4a90e2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 500px;
  color: #fff;
}
</style>
