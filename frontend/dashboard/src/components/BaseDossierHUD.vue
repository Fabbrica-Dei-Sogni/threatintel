<template>
  <div class="forensic-hud-container" :class="[`mode-${mode}`]">
    <!-- Trigger Slot -->
    <slot name="trigger" :toggle="toggleMenu" :isOpen="showMenu"></slot>

    <!-- Selection Menu Teleport -->
    <Teleport to="body" :disabled="mode === 'button' && !isMobile">
      <transition :name="mode === 'sticky' ? 'slide-card' : 'popover'">
        <div 
          v-if="showMenu" 
          class="action-menu glass-morphism" 
          :class="[
            `mode-${mode}`, 
            { 'is-mobile-menu': isMobile, 'popover-menu': mode === 'button' }
          ]"
        >
          <div class="menu-header" :class="{ 'mini': mode === 'button' }">
            <strong>{{ title.toUpperCase() }}</strong>
            <div v-if="mode === 'sticky'" class="header-status">
              <span class="status-label">READY</span>
              <span class="status-dot pulse"></span>
            </div>
          </div>
          
          <div class="selection-grid" :class="{ 'mini': mode === 'button' }">
            <!-- Styles Configuration -->
            <div v-for="style in reportStyles" :key="style.id" class="style-row-wrapper">
              <div class="style-row" :class="{ 'mini': mode === 'button' }">
                <div class="style-info">
                  <span class="style-name">{{ t(style.labelKey) }}</span>
                  <span v-if="mode === 'sticky'" class="style-desc">{{ style.description }}</span>
                </div>
                <div class="style-actions">
                  <button @click="emitAction(style.id, 'preview')" 
                    :class="mode === 'button' ? 'action-btn-mini' : 'action-btn'"
                    :title="t('common.preview')">
                    👁️
                  </button>
                  <button @click="emitAction(style.id, 'download')" 
                    :class="mode === 'button' ? 'action-btn-mini' : 'action-btn'"
                    :title="t('common.downloadPdf')">
                    📥
                  </button>
                </div>
              </div>
              <div v-if="style.id !== 'telex'" class="row-divider"></div>
            </div>
          </div>

          <div v-if="loadingHtml || loadingPdf" class="menu-loading-overlay" :class="{ 'mini': mode === 'button' }">
            <span :class="mode === 'button' ? 'spinner-small' : 'spinner-large'"></span>
            <span v-if="mode === 'sticky'" class="loading-text">
              {{ loadingPdf ? 'GENERATING PDF...' : 'DECRYPTING HTML...' }}
            </span>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- Backdrop -->
    <Teleport to="body">
      <div v-if="showMenu" class="menu-backdrop" @click="closeMenu"></div>
    </Teleport>

    <!-- Preview Modal -->
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
                <button @click="emitAction(currentStyle, 'download')" class="download-mini-btn" :disabled="loadingPdf">
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
              <span>{{ t('common.dossierFormatA4') === 'common.dossierFormatA4' ? 'FORMATO: A4 (ISO 216)' : t('common.dossierFormatA4').toUpperCase() }}</span>
              <span class="zoom-indicator">{{ t('common.dossierZoom') === 'common.dossierZoom' ? 'ZOOM' : t('common.dossierZoom').toUpperCase() }}: {{ Math.round(scaleFactor * 100) }}%</span>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onUnmounted, computed, nextTick, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  mode: { type: String, default: 'button' },
  title: { type: String, default: 'FORENSIC GENERATOR' },
  accentColor: { type: String, default: '#3b82f6' },
  loadingPdf: Boolean,
  loadingHtml: Boolean,
  htmlContent: String,
  showPreview: Boolean,
  currentStyle: String
});

const emit = defineEmits(['action', 'closePreview']);

const showMenu = ref(false);
const isMobile = ref(false);
const modalBody = ref(null);
const previewFrame = ref(null);
const scaleFactor = ref(1);
const reportWidth = 794;

const reportStyles = [
  { id: 'classic', labelKey: 'common.dossierStyleAdmin', description: 'Formal legal/admin format' },
  { id: 'hud', labelKey: 'common.dossierStyleTactical', description: 'High-density HUD layout' },
  { id: 'telex', labelKey: 'common.dossierStyleForensic', description: 'Old-school teletype stream' }
];

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

const toggleMenu = () => {
  showMenu.value = !showMenu.value;
};

const closeMenu = () => {
  showMenu.value = false;
};

const emitAction = (style, type) => {
  showMenu.value = false; // Always close menu on any action
  emit('action', { style, type });
};

const closePreview = () => {
  emit('closePreview');
};

const scalingStyle = computed(() => ({
  transform: `scale(${scaleFactor.value})`,
  transformOrigin: 'top center',
  width: `${reportWidth}px`
}));

const updateScale = () => {
  if (!modalBody.value) return;
  const padding = window.innerWidth < 768 ? 10 : 60;
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

// React to preview opening
watch(() => props.showPreview, async (newVal) => {
  if (newVal) {
    await nextTick();
    updateScale();
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
  window.addEventListener('resize', updateScale);
});

onUnmounted(() => {
  document.body.style.overflow = '';
  window.removeEventListener('resize', checkMobile);
  window.removeEventListener('resize', updateScale);
});

// Expose updateScale to parent if needed
defineExpose({ updateScale });

</script>

<style scoped>
.forensic-hud-container {
  z-index: 9500;
  --theme-color: v-bind(accentColor);
  position: relative;
  display: inline-block;
}

.forensic-hud-container.mode-sticky {
  display: block;
}

/* Base HUD Styles (Unified from both components) */
.action-menu {
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 9600;
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

.menu-header strong {
  font-size: 0.75rem;
  letter-spacing: 3px;
  color: #94a3b8;
}

.menu-header.mini strong {
  font-size: 0.65rem;
  letter-spacing: 2px;
  color: #64748b;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-label {
  font-size: 0.6rem;
  font-weight: 900;
  color: #10b981;
  letter-spacing: 2px;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: var(--theme-color);
  border-radius: 50%;
  box-shadow: 0 0 10px var(--theme-color);
}

/* Numerical Selection Grid */
.selection-grid { padding: 10px 20px 20px; }
.selection-grid.mini { padding: 5px 10px 10px; }

.style-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 10px;
  border-radius: 12px;
  transition: background 0.3s;
}

.style-row.mini { padding: 8px 10px; }
.style-row:hover { background: rgba(255, 255, 255, 0.03); }

.style-info { display: flex; flex-direction: column; gap: 2px; }
.style-name {
  font-weight: 800;
  font-size: 0.85rem;
  color: #fff;
  letter-spacing: 1px;
}
.style-row.mini .style-name { font-size: 0.8rem; }

.style-desc {
  font-size: 0.6rem;
  color: #64748b;
  font-weight: 600;
}

.style-actions { display: flex; gap: 8px; }

.action-btn {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn:hover {
  border-color: var(--theme-color);
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.action-btn-mini {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.action-btn-mini:hover {
  background: var(--theme-color);
  border-color: var(--theme-color);
}

.row-divider {
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.05), transparent);
  margin: 0 10px;
}

/* Positioning Logic - RE-IMPLEMENTED from Vademecum */
.action-menu.mode-sticky {
  position: fixed !important;
  top: 15vh !important;
  right: 64px !important;
  width: min(280px, 90vw) !important;
  z-index: 9600;
  bottom: auto !important;
  left: auto !important;
  transform: none;
}

.action-menu.popover-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 10px;
  width: 280px;
}

@media (max-width: 768px) {
  .action-menu.is-mobile-menu {
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    width: min(340px, 92vw) !important;
    position: fixed !important;
    right: auto !important;
    bottom: auto !important;
    z-index: 9700 !important;
  }
}

/* Loading Overlays */
.menu-loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 15px;
  z-index: 10;
}
.menu-loading-overlay.mini { gap: 0; }

.loading-text {
  font-size: 0.65rem;
  font-weight: 950;
  letter-spacing: 3px;
  color: #fff;
}

/* Backdrop */
.menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(2, 6, 17, 0.6);
  backdrop-filter: blur(4px);
}

/* Modal Styling Unified */
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
  padding: 24px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
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

/* Animations Unified */
.slide-card-enter-active, .slide-card-leave-active { transition: all 0.5s; }
.slide-card-enter-from, .slide-card-leave-to { opacity: 0; transform: translateX(40px) scale(0.8); }

.popover-enter-active, .popover-leave-active { transition: all 0.3s; }
.popover-enter-from, .popover-leave-to { opacity: 0; transform: translateY(-10px); }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.5s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

.pulse { animation: pulse-theme 2.5s infinite; }
@keyframes pulse-theme {
  0% { transform: scale(0.9); box-shadow: 0 0 0 0 var(--theme-color); }
  70% { transform: scale(1); box-shadow: 0 0 0 12px transparent; }
  100% { transform: scale(0.9); box-shadow: 0 0 0 0 transparent; }
}

/* Spinners */
.spinner-large {
  width: 40px; height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--theme-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
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
  .modal-header { padding: 15px 20px; }
  .modal-body { padding: 20px 5px; }
  .preview-modal-content { border-radius: 0; width: 100vw; height: 100vh; height: 100dvh; }
}
</style>
