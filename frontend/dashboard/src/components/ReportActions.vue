<template>
  <div class="report-actions-wrapper" :class="[`mode-${mode}`]">
    <!-- Trigger (Conditional based on mode) -->
    
    <!-- MODE: STICKY -->
    <div v-if="mode === 'sticky'" class="sticky-report-tab" :class="{ 'is-loading': loadingPdf || loadingHtml, 'recorder-active': dossierStore.isEnabled && dossierStore.sections.length > 0 }">
      <div class="tab-trigger" @click="toggleMenu">
        <span v-if="loadingPdf || loadingHtml" class="spinner-small"></span>
        <span v-else class="tab-icon">📊</span>
        <span class="tab-text">{{ t('common.generateReport').toUpperCase() }}</span>
      </div>
      
      <Teleport to="body">
        <transition name="slide-card">
          <div v-if="showMenu" class="action-menu glass-morphism" :class="['mode-sticky', { 'is-mobile-menu': isMobile }]">
            <div class="menu-header">
              <strong>COMMAND CENTER</strong>
              <span class="status-dot pulse"></span>
            </div>
            <button @click="handlePreview" class="menu-item" :disabled="loadingHtml">
              <span class="icon">👁️</span>
              <div class="item-info">
                <span class="title">{{ t('common.viewHtml') }}</span>
                <span class="subtext">Anteprima Interattiva</span>
              </div>
              <span v-if="loadingHtml" class="spinner-tiny"></span>
            </button>
            <div class="menu-divider"></div>
            <button @click="handleDownload" class="menu-item" :disabled="loadingPdf">
              <span class="icon">📥</span>
              <div class="item-info">
                <span class="title">{{ t('common.downloadPdf') }}</span>
                <span class="subtext">Documento Forense A4</span>
              </div>
              <span v-if="loadingPdf" class="spinner-tiny"></span>
            </button>
          </div>
        </transition>
      </Teleport>
    </div>

    <!-- MODE: BUTTON -->
    <div v-else class="button-report-container">
      <button @click="toggleMenu" class="cyber-report-btn" :class="{ 'is-active': showMenu }">
        <span v-if="loadingPdf || loadingHtml" class="spinner-small"></span>
        <span v-else class="btn-content">
          <span class="icon">📊</span>
          {{ t('common.generateReport').toUpperCase() }}
        </span>
      </button>

      <Teleport to="body" :disabled="!isMobile">
        <transition name="popover">
          <div v-if="showMenu" class="action-menu popover-menu glass-morphism" :class="{ 'is-mobile-menu': isMobile }">
            <div class="menu-header mini">
              <strong>{{ t('common.preview').toUpperCase() }}</strong>
            </div>
            <button @click="handlePreview" class="menu-item" :disabled="loadingHtml">
              <span class="icon">👁️</span>
              <div class="item-info">
                <span class="title">{{ t('common.viewHtml') }}</span>
              </div>
              <span v-if="loadingHtml" class="spinner-tiny"></span>
            </button>
            <div class="menu-divider"></div>
            <button @click="handleDownload" class="menu-item" :disabled="loadingPdf">
              <span class="icon">📥</span>
              <div class="item-info">
                <span class="title">{{ t('common.downloadPdf') }}</span>
              </div>
              <span v-if="loadingPdf" class="spinner-tiny"></span>
            </button>
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
                <h3>INTELLIGENCE DOSSIER PREVIEW</h3>
              </div>
              <div class="header-actions">
                 <button @click="handleDownload" class="download-mini-btn" :disabled="loadingPdf">
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
              <span>FORMATO: A4 (ISO 216)</span>
              <span class="zoom-indicator">ZOOM: {{ Math.round(scaleFactor * 100) }}%</span>
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
import { fetchReport } from '../api';
import { ElMessage } from 'element-plus';
import { useDossierStore } from '../stores/dossier';

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

const showMenu = ref(false);
const showPreview = ref(false);
const htmlContent = ref('');
const loadingHtml = ref(false);
const loadingPdf = ref(false);

const isMobile = ref(false);
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

const modalBody = ref(null);
const previewFrame = ref(null);
const scaleFactor = ref(1);
const reportWidth = 794;

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

const handlePreview = async () => {
  showMenu.value = false;
  loadingHtml.value = true;
  try {
    const blob = await fetchReport({
      type: props.type,
      ip: props.ip,
      sessionId: props.sessionId,
      format: 'html',
      locale: locale.value
    });
    htmlContent.value = await blob.text();
    showPreview.value = true;
    await nextTick();
    updateScale();
    window.addEventListener('resize', updateScale);
  } catch (err) {
    ElMessage.error(t('common.error'));
  } finally {
    loadingHtml.value = false;
  }
};

const closePreview = () => {
  showPreview.value = false;
  window.removeEventListener('resize', updateScale);
};

const handleDownload = async () => {
  showMenu.value = false;
  loadingPdf.value = true;
  try {
    const blob = await fetchReport({
      type: props.type,
      ip: props.ip,
      sessionId: props.sessionId,
      format: 'pdf',
      locale: locale.value
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

/* Classic Button Mode */
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

.popover-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 10px;
  width: 220px;
  z-index: 9600; /* Higher than backdrop */
  border-radius: 12px;
}

.is-mobile-menu {
  position: fixed !important;
  bottom: 80px !important;
  right: 20px !important;
  top: auto !important;
  width: calc(100% - 40px) !important;
  z-index: 9500;
}

/* Unify Sticky Menu Position */
.action-menu.mode-sticky,
.is-mobile-menu.mode-sticky {
  position: fixed !important;
  top: 15vh !important;
  right: 64px !important;
  width: 280px !important;
  bottom: auto !important;
  z-index: 9600;
}

@media (max-width: 768px) {
  .action-menu.mode-sticky,
  .is-mobile-menu.mode-sticky {
    top: 18vh !important;
    right: 54px !important;
    width: clamp(260px, 80vw, 300px) !important;
  }
}

.popover-menu .menu-item {
  padding: 14px 18px;
}

/* Sticky Action Tab Mode */
.sticky-report-tab {
  position: fixed;
  right: 0;
  top: 15vh;
  transform: none;
  display: flex;
  flex-direction: row-reverse;
  align-items: flex-start;
  z-index: 9501; /* Must be above everything */
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

/* Action Menu Shared */
.action-menu {
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Removed relative margin logic as it is now Teleported/Fixed */
.mode-sticky .action-menu {
  transform-origin: right center;
  border-color: rgba(255, 255, 255, 0.1);
}

.glass-morphism {
  background: rgba(15, 23, 42, 0.98);
  backdrop-filter: blur(25px);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.7);
}

.menu-header {
  padding: 18px 24px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.05), transparent);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.menu-header.mini {
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.03);
}

.menu-header.mini strong {
  font-size: 0.65rem;
  letter-spacing: 2px;
  color: #64748b;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: var(--theme-color);
  border-radius: 50%;
  box-shadow: 0 0 10px var(--theme-color);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 18px 24px;
  background: transparent;
  border: none;
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.3s;
  width: 100%;
  text-align: left;
}

.menu-item:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
  color: var(--theme-color);
}

.menu-item .icon { 
  font-size: 1.8rem; 
  opacity: 0.8; 
  transition: all 0.3s; 
  flex-shrink: 0;
  width: 40px;
  display: flex;
  justify-content: center;
}
.menu-item:hover .icon { opacity: 1; transform: scale(1.1); color: var(--theme-color); }

.item-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

.item-info .title { 
  font-weight: 800; 
  font-size: 1rem;
  line-height: 1.2;
  color: #fff;
  display: block; 
}

.item-info .subtext { 
  font-size: 0.7rem; 
  color: #64748b;
  line-height: 1.2;
  display: block;
}

.menu-divider {
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.1), transparent);
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
  overflow: hidden; /* Lock the content inside */
}

.glass-morphism-dark {
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(40px);
}

.modal-header {
  padding: 24px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0; /* Header stays fixed */
}

.header-title h3 {
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 4px;
  color: #fff;
  text-shadow: 0 0 20px var(--theme-color);
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
  flex: 1; /* Occupies all space between header and footer */
  overflow: auto; /* Only this scrolls */
  padding: 60px 40px;
  background: radial-gradient(circle at center, #1e293b 0%, #020617 100%);
  display: flex;
  justify-content: center;
  align-items: flex-start; /* Start from top */
}

.scaling-wrapper { 
  transition: transform 0.4s; 
  transform-origin: top center; /* Better for scrolling */
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
  flex-shrink: 0; /* Footer stays fixed */
}

.zoom-indicator { margin-left: auto; color: var(--theme-color); }

/* Animations */
.slide-card-enter-active, .slide-card-leave-active { transition: all 0.5s; }
.slide-card-enter-from, .slide-card-leave-to { opacity: 0; transform: translateX(40px) scale(0.8); }

.popover-enter-active, .popover-leave-active { transition: all 0.3s; }
.popover-enter-from, .popover-leave-to { opacity: 0; transform: translateY(-10px); }

.pulse { animation: pulse-theme 2.5s infinite; }
@keyframes pulse-theme {
  0% { transform: scale(0.9); box-shadow: 0 0 0 0 var(--theme-color); }
  70% { transform: scale(1); box-shadow: 0 0 0 12px transparent; }
  100% { transform: scale(0.9); box-shadow: 0 0 0 0 transparent; }
}

.menu-header strong {
  font-size: 0.75rem;
  letter-spacing: 3px;
  color: #94a3b8;
}

/* Spinner */
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
  border-top-color: var(--theme-color);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .sticky-report-tab { 
    top: 18vh; 
    bottom: auto; 
    transform: none; 
    transition: top 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .preview-modal-content { 
    width: 100vw; 
    height: 100vh;
    height: 100dvh;
    border-radius: 0; 
  }
  .modal-header { padding: 15px 20px; }
  .header-title h3 { font-size: 0.8rem; letter-spacing: 2px; }
  .modal-body { 
    padding: 20px 5px; 
    align-items: flex-start;
  }
  .modal-info-bar {
    padding: 10px 20px;
    gap: 15px;
    flex-wrap: wrap;
  }
}
</style>
