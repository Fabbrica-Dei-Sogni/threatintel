<template>
  <div class="report-actions-wrapper mode-button">
    <!-- Popover Trigger -->
    <div class="button-report-container">
      <button @click="toggleMenu" class="cyber-report-btn" :class="{ 'is-active': showMenu }">
        <span v-if="loadingPdf || loadingHtml" class="spinner-small"></span>
        <span v-else class="btn-content">
          <span class="icon">📊</span>
          {{ t('common.generateReport').toUpperCase() }}
        </span>
      </button>

      <!-- Popover Menu Teleported on Mobile -->
      <Teleport to="body" :disabled="!isMobile">
        <transition name="popover">
          <div v-if="showMenu" class="action-menu popover-menu glass-morphism" :class="{ 'is-mobile-menu': isMobile }">
            <div class="menu-header mini">
              <strong>{{ t('common.generateDossier').toUpperCase() }}</strong>
              <div class="header-status">
                <span class="status-label">READY</span>
                <span class="status-dot pulse"></span>
              </div>
            </div>
            
            <div class="selection-grid mini">
              <!-- Admin Style -->
              <div class="style-row mini">
                <div class="style-info">
                  <span class="style-name">{{ t('common.dossierStyleAdmin') }}</span>
                  <span class="style-desc">Formal technical review</span>
                </div>
                <div class="style-actions">
                  <button @click="handlePreview('classic')" class="action-btn-mini">👁️</button>
                  <button @click="handleDownload('classic')" class="action-btn-mini">📥</button>
                </div>
              </div>

              <div class="row-divider"></div>

              <!-- Tactical HUD Style -->
              <div class="style-row mini">
                <div class="style-info">
                  <span class="style-name">{{ t('common.dossierStyleTactical') }}</span>
                  <span class="style-desc">Cyber-sleek visual HUD</span>
                </div>
                <div class="style-actions">
                  <button @click="handlePreview('hud')" class="action-btn-mini">👁️</button>
                  <button @click="handleDownload('hud')" class="action-btn-mini">📥</button>
                </div>
              </div>

              <div class="row-divider"></div>

              <!-- Forensic Telex Style -->
              <div class="style-row mini">
                <div class="style-info">
                  <span class="style-name">{{ t('common.dossierStyleForensic') }}</span>
                  <span class="style-desc">Raw forensic teletype</span>
                </div>
                <div class="style-actions">
                  <button @click="handlePreview('telex')" class="action-btn-mini">👁️</button>
                  <button @click="handleDownload('telex')" class="action-btn-mini">📥</button>
                </div>
              </div>
            </div>

            <!-- Loading Overlay -->
            <div v-if="loadingHtml || loadingPdf" class="menu-loading-overlay mini">
              <span class="spinner-small"></span>
            </div>
          </div>
        </transition>
      </Teleport>
    </div>

    <!-- Backdrop Teleported to Body -->
    <Teleport to="body">
      <div v-if="showMenu" class="menu-backdrop" @click="showMenu = false"></div>
    </Teleport>

    <!-- Preview Modal Teleported to Body -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showPreview" class="preview-modal-overlay" @click.self="closePreview">
          <div class="preview-modal-content glass-morphism-dark">
            <div class="modal-header">
              <div class="header-title">
                <span class="header-icon">🔎</span>
                <h3>{{ t('common.dossierPreviewTitle').toUpperCase() }} [{{ currentStyle.toUpperCase() }}]</h3>
              </div>
              <div class="header-actions">
                 <button @click="handleDownload(currentStyle)" class="download-mini-btn" :disabled="loadingPdf">
                  <span v-if="loadingPdf" class="spinner-tiny"></span>
                  <span v-else>📥 {{ t('common.downloadPdf') }}</span>
                </button>
                <button class="close-btn" @click="closePreview">✕</button>
              </div>
            </div>
            
            <div class="modal-body" ref="modalBody">
              <div class="scaling-wrapper" :style="scalingStyle">
                <iframe 
                  v-if="htmlContent" 
                  ref="previewFrame"
                  :srcdoc="htmlContent" 
                  class="report-frame shadow-2xl"
                  frameborder="0"
                  @load="onFrameLoad"
                ></iframe>
                <div v-else class="loading-preview">
                   <span class="spinner-large"></span>
                   <p>{{ t('common.loading') }}</p>
                </div>
              </div>
            </div>
            
            <div class="modal-info-bar">
              <span>{{ t('common.dossierFormatA4').toUpperCase() }}</span>
              <span class="zoom-indicator">{{ t('common.dossierZoom').toUpperCase() }}: {{ Math.round(scaleFactor * 100) }}%</span>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onUnmounted, computed, nextTick, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { exportDossier } from '../api';
import { ElMessage } from 'element-plus';

const { t, locale } = useI18n();

const props = defineProps({
  dossierId: { type: String, required: true },
  accentColor: { type: String, default: '#6366f1' }
});

const showMenu = ref(false);
const showPreview = ref(false);
const htmlContent = ref('');
const loadingHtml = ref(false);
const loadingPdf = ref(false);
const currentStyle = ref('classic');

const modalBody = ref(null);
const previewFrame = ref(null);
const scaleFactor = ref(1);
const reportWidth = 794;

const isMobile = ref(false);
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

const toggleMenu = () => {
  showMenu.value = !showMenu.value;
};

const scalingStyle = computed(() => ({
  transform: `scale(${scaleFactor.value})`,
  transformOrigin: 'top center',
  width: `${reportWidth}px`
}));

const updateScale = () => {
  if (!modalBody.value) return;
  const padding = window.innerWidth < 768 ? 10 : 40;
  const availableWidth = modalBody.value.clientWidth - padding;
  scaleFactor.value = Math.min(availableWidth / reportWidth, 1.1); 
};

const onFrameLoad = () => {
  if (!previewFrame.value) return;
  try {
    const doc = previewFrame.value.contentWindow.document;
    const height = doc.documentElement.scrollHeight || doc.body.scrollHeight;
    previewFrame.value.style.height = (height + 50) + 'px';
  } catch (e) {
    previewFrame.value.style.height = '1500px';
  }
};

const handlePreview = async (style) => {
  showMenu.value = false;
  currentStyle.value = style;
  loadingHtml.value = true;
  htmlContent.value = ''; // Reset preview
  try {
    const htmlData = await exportDossier(props.dossierId, 'html', style, locale.value);
    htmlContent.value = htmlData;
    showPreview.value = true;
    await nextTick();
    updateScale();
    window.addEventListener('resize', updateScale);
  } catch (err) {
    console.error('Preview error:', err);
    ElMessage.error(t('common.error'));
  } finally {
    loadingHtml.value = false;
  }
};

const closePreview = () => {
  showPreview.value = false;
  window.removeEventListener('resize', updateScale);
};

const handleDownload = async (style) => {
  showMenu.value = false;
  loadingPdf.value = true;
  try {
    await exportDossier(props.dossierId, 'pdf', style, locale.value);
  } catch (err) {
    console.error('Download error:', err);
    ElMessage.error(t('common.error'));
  } finally {
    loadingPdf.value = false;
  }
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateScale);
  window.removeEventListener('resize', checkMobile);
});
</script>

<style scoped>
.report-actions-wrapper {
  z-index: 9500; /* Increased to be above backdrop */
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

/* Tactical Selection Grid Sync */
.selection-grid.mini {
  padding: 10px 15px 15px;
}

.style-row.mini {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 8px;
  border-radius: 10px;
  transition: background 0.2s;
}

.style-row.mini:hover {
  background: rgba(255, 255, 255, 0.03);
}

.style-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.style-name {
  font-weight: 800;
  font-size: 0.8rem;
  color: #fff;
}

.style-desc {
  font-size: 0.55rem;
  color: #64748b;
  font-weight: 600;
}

.style-actions {
  display: flex;
  gap: 8px;
}

.action-btn-mini {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.action-btn-mini:hover {
  background: var(--theme-color);
  border-color: var(--theme-color);
  transform: translateY(-1px);
}

.row-divider {
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.05), transparent);
  margin: 2px 8px;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-label {
  font-size: 0.55rem;
  font-weight: 900;
  color: #10b981;
  letter-spacing: 1px;
}

.status-dot {
  width: 6px;
  height: 6px;
  background: #10b981;
  border-radius: 50%;
  box-shadow: 0 0 8px #10b981;
}

.menu-loading-overlay.mini {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.popover-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 10px;
  width: 280px;
  z-index: 9600;
  border-radius: 16px;
  padding: 5px 0;
}

.is-mobile-menu {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  bottom: auto !important;
  right: auto !important;
  width: min(340px, 92vw) !important;
  z-index: 9700;
  margin: 0 !important;
}

.pulse { animation: pulse-status 2s infinite; }
@keyframes pulse-status {
  0% { opacity: 1; }
  50% { opacity: 0.4; }
  100% { opacity: 1; }
}

.menu-divider {
  display: none; /* Replaced by row-divider */
}

.menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(2, 6, 17, 0.6);
  backdrop-filter: blur(4px);
}

/* Modal Styling */
.preview-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 17, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  backdrop-filter: blur(12px);
}

.preview-modal-content {
  width: 96vw;
  height: 94vh;
  display: flex;
  flex-direction: column;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.glass-morphism-dark {
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(40px);
}

.modal-header {
  padding: 20px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}

.header-title h3 {
  font-size: 0.9rem;
  font-weight: 900;
  letter-spacing: 3px;
  color: #fff;
  text-shadow: 0 0 20px var(--theme-color);
}

.glass-morphism {
  background: rgba(15, 23, 42, 0.98);
  backdrop-filter: blur(25px);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.7);
}

.download-mini-btn {
  background: var(--theme-color);
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.close-btn {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: #94a3b8;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover { background: #ef4444; color: white; }

.modal-body {
  flex: 1;
  overflow: auto;
  padding: 60px 40px;
  background: radial-gradient(circle at center, #1e293b 0%, #020617 100%);
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.scaling-wrapper { 
  transition: transform 0.4s; 
  transform-origin: top center;
}
.report-frame { width: 100%; background: white; border-radius: 4px; }

.modal-info-bar {
  padding: 12px 40px;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  gap: 40px;
  font-size: 0.7rem;
  font-weight: 800;
  color: #64748b;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}

.zoom-indicator { margin-left: auto; color: var(--theme-color); }

/* Animations */
.popover-enter-active, .popover-leave-active { transition: all 0.3s; }
.popover-enter-from, .popover-leave-to { opacity: 0; transform: translateY(-10px); }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.5s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

.spinner-small {
  width: 20px; height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--theme-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-tiny {
  width: 14px; height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Mobile Adjustments */
@media (max-width: 768px) {
  .preview-modal-content { 
    width: 100vw; 
    height: 100vh; 
    height: 100dvh;
    border-radius: 0; 
  }
  .modal-header { padding: 15px 20px; }
  .modal-body { padding: 20px 5px; }

  .cyber-report-btn {
    padding: 8px 16px;
    font-size: 0.75rem;
  }
}
</style>
