<template>
  <transition name="recorder-slide">
    <div v-if="dossierStore.isEnabled" class="dossier-recorder-wrapper" :class="{ 'is-active': dossierStore.isRecording }">
      <div class="recorder-bar glass-morphism">
        <!-- Section 1: Status -->
        <div class="status-section">
          <div v-if="dossierStore.isRecording" class="rec-indicator">
            <span class="dot"></span>
            <span class="label h-800">{{ t('common.recordingActive') }}</span>
          </div>
          <div v-else class="idle-indicator">
            <span class="dot idle"></span>
            <span class="label h-1200">{{ t('common.dossier') }}</span>
          </div>
        </div>

        <!-- Section 2: Counter -->
        <div class="count-section" v-if="dossierStore.sections.length > 0 || dossierStore.isRecording">
          <span class="count-badge pulse-emerald">{{ dossierStore.sections.length }}</span>
          <span class="count-label h-1000">{{ dossierStore.sections.length === 0 ? t('common.noSectionsCaptured') : t('common.sectionsCaptured', { count: dossierStore.sections.length }) }}</span>
        </div>

        <!-- Section 3: Actions -->
        <div class="actions-section">
          <button v-if="!dossierStore.isRecording" class="btn-rec start" @click="dossierStore.startRecording()">
            <span class="icon">⏺️</span> 
            <span class="btn-text h-600">{{ t('common.startRecording') }}</span>
          </button>
          <button v-else class="btn-rec stop" @click="dossierStore.stopRecording()">
            <span class="icon">⏹️</span> 
            <span class="btn-text h-600">{{ t('common.stopRecording') }}</span>
          </button>

          <template v-if="dossierStore.sections.length > 0">
            <div class="divider"></div>
            
            <div class="style-selector-pill">
              <button class="style-opt" :class="{ active: selectedStyle === 'classic' }" @click="selectedStyle = 'classic'" title="Stile Istituzionale">CLASSIC</button>
              <button class="style-opt" :class="{ active: selectedStyle === 'hud' }" @click="selectedStyle = 'hud'" title="Stile HUD Tattico">HUD</button>
            </div>

            <button class="btn-tool preview" @click="generateCustomReport('html', selectedStyle)" :disabled="loadingHtml" :title="t('common.previewDossier')">
              <span v-if="loadingHtml" class="spinner-tiny"></span>
              <span v-else class="icon">👁️</span> 
              <span class="btn-text h-900">{{ t('common.preview') }}</span>
            </button>
            <button class="btn-tool download" @click="generateCustomReport('pdf', selectedStyle)" :disabled="loadingPdf" :title="t('common.generateDossier')">
               <span v-if="loadingPdf" class="spinner-tiny"></span>
              <span v-else class="icon">📄</span> 
              <span class="btn-text h-900">{{ t('common.downloadPdf') }}</span>
            </button>
            <button class="btn-tool save" @click="handleSave" :disabled="dossierStore.isSaving" title="Salva nel Database">
               <span v-if="dossierStore.isSaving" class="spinner-tiny"></span>
              <span v-else class="icon">💾</span> 
              <span class="btn-text h-900">{{ t('common.save').toUpperCase() }}</span>
            </button>
            <button class="btn-tool reset" @click="confirmReset" :title="t('common.clearDossier')">
               <span class="icon">🗑️</span>
            </button>
          </template>
        </div>
      </div>

      <!-- Preview Modal -->
      <Teleport to="body">
        <transition name="modal-fade">
          <div v-if="showPreview" class="preview-modal-overlay" @click.self="closePreview" style="z-index: 10000;">
            <div class="preview-modal-content glass-morphism-dark">
              <div class="modal-header">
                <div class="header-title">
                  <span class="header-icon h-tablet">🔎</span>
                  <h3>DOSSIER PREVIEW</h3>
                </div>
                <div class="header-actions">
                  <button @click="generateCustomReport('pdf', selectedStyle)" class="download-mini-btn" :disabled="loadingPdf">
                    <span v-if="loadingPdf" class="spinner-tiny"></span>
                    <span v-else>📥 {{ t('common.downloadPdf') }}</span>
                  </button>
                  <button class="close-btn" @click="closePreview">✕</button>
                </div>
              </div>
              <div class="modal-body" ref="modalBody">
                <div class="scaling-wrapper" v-if="htmlContent" :style="scalingStyle">
                  <iframe ref="previewFrame" :srcdoc="htmlContent" class="report-frame shadow-2xl" frameborder="0" @load="onFrameLoad"></iframe>
                </div>
                <div v-else class="loading-preview">
                   <span class="spinner-large"></span>
                   <p>{{ t('common.loading') }}</p>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </Teleport>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, nextTick, onUnmounted } from 'vue';
import { useDossierStore } from '../stores/dossier';
import { useI18n } from 'vue-i18n';
import { ElMessageBox, ElMessage } from 'element-plus';
import { fetchCustomReport } from '../api';
import dayjs from 'dayjs';

const dossierStore = useDossierStore();
const { t, locale } = useI18n();

const showPreview = ref(false);
const htmlContent = ref('');
const loadingHtml = ref(false);
const loadingPdf = ref(false);
const selectedStyle = ref('classic');
const scaleFactor = ref(1);
const reportWidth = 794;
const modalBody = ref(null);
const previewFrame = ref(null);

const scalingStyle = computed(() => ({
  transform: `scale(${scaleFactor.value})`,
  transformOrigin: 'top center',
  width: `${reportWidth}px`,
  marginBottom: `-${reportWidth * (1 - scaleFactor.value)}px` 
}));

const updateScale = () => {
  if (!modalBody.value) return;
  const padding = window.innerWidth < 768 ? 20 : 80;
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

const closePreview = () => {
  showPreview.value = false;
  window.removeEventListener('resize', updateScale);
};

const confirmReset = () => {
  ElMessageBox.confirm(
    t('common.clearDossier') + '?',
    t('common.confirm'),
    { confirmButtonText: t('common.confirm'), cancelButtonText: t('common.cancel'), type: 'warning' }
  ).then(() => {
    dossierStore.reset();
    ElMessage.info(t('common.clearDossier'));
  });
};

const generateCustomReport = async (format, style = 'telex') => {
  if (dossierStore.sections.length === 0) return;
  selectedStyle.value = style;
  if (format === 'html') loadingHtml.value = true;
  else loadingPdf.value = true;
  try {
    const payload = {
      sections: dossierStore.sections.map(s => ({
        templateKey: s.templateKey, data: s.data, type: s.type, timestamp: s.timestamp, renderedText: s.renderedText
      })),
      locale: locale.value
    };
    if (format === 'html') {
      const html = await fetchCustomReport(payload, 'html', style);
      htmlContent.value = html;
      showPreview.value = true;
      await nextTick();
      updateScale();
      window.addEventListener('resize', updateScale);
    } else {
      await fetchCustomReport(payload, 'pdf', style);
      if (showPreview.value) ElMessage.success(t('common.downloadPdf'));
    }
  } catch (error) {
    ElMessage.error(t('common.error'));
  } finally {
    loadingHtml.value = false;
    loadingPdf.value = false;
  }
};

const handleSave = async () => {
  if (dossierStore.sections.length === 0) return;
  
  try {
    // Genera un titolo smart di default
    const now = dayjs().format('YYYY-MM-DD HH:mm');
    let subject = 'Intelligence';
    const firstSection = dossierStore.sections[0];
    
    if (firstSection) {
      if (firstSection.type === 'ip') subject = firstSection.data.ip || subject;
      else if (firstSection.type === 'attack') subject = firstSection.data.attacker || firstSection.data.id || subject;
      else if (firstSection.type === 'telnet') subject = firstSection.data.ip || subject;
    }

    const defaultTitle = `Dossier ${subject} - ${now}`;

    const { value: title } = await ElMessageBox.prompt(
      'Inserisci un titolo per questa investigazione', 
      'Salva Dossier', 
      {
        confirmButtonText: 'Salva',
        cancelButtonText: 'Annulla',
        inputValue: defaultTitle,
        inputPlaceholder: 'Es: Analisi Botnet March 2024',
        inputValidator: (val) => val ? true : 'Il titolo è obbligatorio'
      }
    );

    if (title) {
      await dossierStore.persistToDb(title);
      ElMessage.success('Dossier salvato correttamente nell\'archivio.');
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('Errore durante il salvataggio.');
    }
  }
};

onUnmounted(() => window.removeEventListener('resize', updateScale));
</script>

<style scoped>
.dossier-recorder-wrapper {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  width: auto;
  max-width: 98vw;
  display: flex;
  justify-content: center;
}

.recorder-bar {
  display: flex;
  align-items: center;
  height: 52px;
  padding: 0 clamp(10px, 2.5vw, 24px);
  border-radius: 60px;
  background: rgba(13, 17, 23, 0.92);
  border: 1px solid rgba(16, 185, 129, 0.3);
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.7);
  gap: clamp(6px, 1.2vw, 18px);
  backdrop-filter: blur(25px) saturate(200%);
  transition: all 0.4s;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.is-active .recorder-bar {
  border-color: rgba(239, 68, 68, 0.5);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.15), 0 15px 50px rgba(0, 0, 0, 0.7);
}

.status-section, .count-section, .actions-section {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.rec-indicator, .idle-indicator, .count-section {
  font-weight: 800;
  font-size: 0.7rem;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

.rec-indicator { color: #f87171; gap: 8px; }
.idle-indicator { color: #94a3b8; gap: 8px; }

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 8px #ef4444;
  animation: pulse-red 2.5s infinite;
  flex-shrink: 0;
}
.dot.idle { background: #475569; box-shadow: none; animation: none; }

@keyframes pulse-red {
  0% { transform: scale(0.9); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.6; }
  100% { transform: scale(0.9); opacity: 1; }
}

.count-badge {
  background: #10b981;
  color: #0d1117;
  font-weight: 900;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 6px;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
}

.count-label { color: #64748b; }

.actions-section { gap: 8px; }

.btn-rec, .btn-tool {
  height: 36px;
  border: none;
  border-radius: 12px;
  padding: 0 14px;
  font-weight: 800;
  font-size: 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.btn-rec { border-radius: 30px; min-width: 40px; }
.btn-rec.start { background: #10b981; color: #064e3b; }
.btn-rec.stop { background: #ef4444; color: #fff; }
.btn-rec:hover { transform: translateY(-2px); filter: brightness(1.1); box-shadow: 0 5px 15px rgba(0,0,0,0.4); }

.btn-tool {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  border-radius: 12px;
  min-width: 36px;
  padding: 0 12px;
}

.btn-tool:hover:not(:disabled) {
  background: rgba(16, 185, 129, 0.15);
  color: #fff;
  border-color: #10b981;
}

.btn-tool.save {
  background: rgba(59, 130, 246, 0.1);
  color: #60a5fa;
  border-color: rgba(59, 130, 246, 0.3);
}

.btn-tool.save:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.2);
  color: #fff;
  border-color: #3b82f6;
}

.btn-tool.reset:hover { border-color: #ef4444; color: #f87171; background: rgba(239, 68, 68, 0.1); }

/* Style Selector */
.style-selector-pill {
  display: flex;
  background: rgba(0, 0, 0, 0.3);
  padding: 2px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-right: 4px;
}

.style-opt {
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.5px;
}

.style-opt.active {
  background: var(--primary-light, #3b82f6);
  color: #fff;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

.style-opt:hover:not(.active) {
  color: #e2e8f0;
}

.icon { font-size: 1.1rem; flex-shrink: 0; }
.divider { width: 1px; height: 20px; background: rgba(255, 255, 255, 0.15); margin: 0 2px; }

/* PROGRESSIVE VISIBILITY */

@media (max-width: 1200px) {
  .idle-indicator .label { display: none; }
}

@media (max-width: 1050px) {
  .count-label { display: none; }
  .btn-tool .btn-text { display: none; }
  .btn-tool { padding: 0; width: 36px; }
}

@media (max-width: 800px) {
  .rec-indicator .label { display: none; }
}

@media (max-width: 650px) {
  .btn-rec .btn-text { display: none; }
  .btn-rec { padding: 0; width: 42px; border-radius: 50%; }
  .recorder-bar { gap: 10px; padding: 0 12px; }
}

@media (max-width: 400px) {
  .divider { display: none; }
  .recorder-bar { gap: 8px; }
}

/* Transitions */
.recorder-slide-enter-active, .recorder-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.recorder-slide-enter-from, .recorder-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, 100px);
}

.modal-fade-enter-active, .modal-fade-leave-active { transition: all 0.4s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; transform: scale(1.02); }

.preview-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 17, 0.98);
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(25px);
}

.preview-modal-content {
  width: 98vw;
  height: 98vh;
  max-width: 1400px;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.modal-header {
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(30, 41, 59, 0.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.header-title h3 { font-size: 0.75rem; letter-spacing: 3px; color: #fff; margin: 0; }

.download-mini-btn {
  background: #10b981;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
  transition: all 0.3s;
}

.download-mini-btn:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
}

.close-btn { background: rgba(255, 255, 255, 0.05); border: none; color: #fff; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; }

.modal-body {
  flex: 1;
  overflow: auto;
  padding: 10px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.report-frame { width: 100%; min-height: 100%; background: white; }

.spinner-tiny {
  width: 12px; height: 12px; border: 2px solid rgba(255, 255, 255, 0.2); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
