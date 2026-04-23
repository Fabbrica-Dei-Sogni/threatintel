<template>
  <div class="dossier-archive-view detail-mode" :class="'skin-' + dashboardSkin">
    <!-- HUD Background Elements -->
    <div class="scanning-line cobalt-pulse"></div>
    <div class="vignette-overlay"></div>
    
    <div class="header-top">
      <div class="header-content-left">
        <h1 v-if="dossier && !isEditing">{{ dossier.title }}</h1>
        <div class="header-subtitle" v-if="dossier && !isEditing">
          <span class="status-classified">[CLASSIFIED_FILE]</span>
          <span class="separator">|</span>
          <span class="dossier-id-tag">DOSSIER_ID: {{ dossier._id }}</span>
        </div>
        <input v-else-if="dossier && isEditing" v-model="editForm.title" class="edit-title-input" />
      </div>
      <div class="header-actions">
        <SkinSwitcher />
        <LanguageSwitcher />
      </div>
    </div>

    <div class="archive-header">
      <div class="header-nav-left">
        <button @click="goBack" class="back-btn" :disabled="isSaving">{{ t('common.back').toUpperCase() }}</button>
      </div>

      <div class="title-with-back">
        <button v-if="dossier && !isEditing && canModify" @click="startEdit" class="back-btn edit-btn">✎ {{
          t('common.edit').toUpperCase() }}</button>
        
        <!-- Pulsante Genera Dossier allineato agli altri -->
        <DossierReportActions 
          v-if="dossier && !isEditing" 
          :dossierId="dossier._id" 
          customClass="back-btn report-btn" 
          :accentColor="reportAccentColor"
        />

        <template v-if="dossier && isEditing && canModify">
          <button @click="saveEdit" class="back-btn save-btn" :disabled="isSaving">✓ {{ t('common.save').toUpperCase()
          }}</button>
          <button @click="cancelEdit" class="back-btn add-btn" style="margin-left: 10px;">✗ {{
          t('common.cancel').toUpperCase() }}</button>
        </template>
      </div>
    </div>

    <!-- Grid & Overlays -->
    <div class="detail-grid-container cyber-table-status-container">
      <!-- Loading HUD Overlay -->
      <transition name="fade">
        <div v-if="loading || isSaving" class="cyber-status-overlay cyber-loading-overlay">
          <div class="cyber-hud-spinner">
            <div class="spinner-circle"></div>
            <div class="spinner-text">{{ isSaving ? 'COMMIT_DATA_CHANGES...' : 'ACCESSING_CLASSIFIED_RECORD...' }}</div>
          </div>
        </div>
      </transition>

      <div v-if="dossier" class="detail-container" :class="{ 'blur-context': loading || isSaving }">
        <!-- Info Sidebar -->
        <div class="detail-content">
          <div class="info-card cyber-card">
            <p class="description" v-if="!isEditing">{{ dossier.description || t('common.noDescription') }}</p>
            <textarea v-else v-model="editForm.description" class="edit-desc-input" rows="3"></textarea>
            <div class="dossier-meta">
              <div class="meta-item"><span class="meta-label">{{ t('common.id') }}:</span> <span class="meta-value">{{ dossier._id }}</span></div>
              <div class="meta-item"><span class="meta-label">{{ t('common.timestamp') }}:</span> <span class="meta-value">{{ formatDate(dossier.createdAt) }}</span></div>
              <div class="meta-item"><span class="meta-label">{{ t('common.status') }}:</span> <span class="meta-value status-value">{{ dossier.status }}</span></div>
              <div class="meta-item" v-if="dossier.tags && dossier.tags.length">
                <span class="tag-badge" v-for="tag in dossier.tags" :key="tag">{{ tag }}</span>
              </div>
            </div>
          </div>

          <!-- Rendered Sections -->
          <div class="sections-timeline">
            <!-- New Section Button at the TOP -->
            <div class="add-section-action top-action"
              v-if="!isSaving && dossier && !isEditing && editingSectionIndex === -1 && canModify">
              <button @click="handleAddHumanSection" class="back-btn add-btn-full">
                + {{ t('common.add').toUpperCase() }}
              </button>
            </div>

            <div v-for="(section, index) in dossier.sections" :key="index" class="section-preview cyber-card">
              <div class="section-header">
                <div class="badge-wrapper">
                  <span class="badge" :class="section.type">
                    {{ t('dossier.sections.' + section.type).toUpperCase() }}
                  </span>
                </div>
                <div class="section-actions">
                  <span class="timestamp">{{ formatDate(section.timestamp) }}</span>
                  <template v-if="editingSectionIndex !== index">
                    <button v-if="canModify" @click="startEditSection(index, section)" class="action-icon-btn"
                      :title="t('dossier.actions.editSection')">✎</button>
                    <button v-if="canModify" @click="handleDeleteSection(index)" class="action-icon-btn danger-text"
                      :title="t('dossier.actions.deleteSection')">🗑</button>
                  </template>
                  <template v-else>
                    <button @click="handleSaveSection(index)" class="action-icon-btn success-text" :title="t('dossier.actions.saveSection')"
                      :disabled="isSaving">✓</button>
                    <button v-if="isExpertModeAllowed(section.templateKey)" @click="showRawEdit = !showRawEdit" class="action-icon-btn btn-expert"
                      :class="{ 'active-expert': showRawEdit }" :title="t('dossier.actions.expertMode')">{...}</button>
                    <button @click="cancelEditSection()" class="action-icon-btn" :title="t('dossier.actions.cancel')"
                      :disabled="isSaving">✗</button>
                  </template>
                </div>
              </div>
              <div class="section-body">
                <template v-if="editingSectionIndex !== index">
                  <!-- Dynamic Section Renderer -->
                  <DossierSectionRenderer :section="section" />

                  <!-- Observations Container -->
                  <div class="observations-container" v-if="(section.observations && section.observations.length) || (!isSaving && editingSectionIndex === -1)">
                    <div v-for="(obs, obsIdx) in section.observations" :key="obsIdx" class="obs-item-wrapper">
                      <div class="obs-card cyber-card mini">
                        <div class="obs-header-tags">
                          <span class="obs-label">OSS-{{ obsIdx + 1 }} / {{ t('dossier.analystNote').toUpperCase() }}</span>
                          <div class="obs-actions" v-if="!isSaving && canModify">
                            <button @click="startEditObs(index, obsIdx, obs)" class="mini-icon-btn">✎</button>
                            <button @click="handleRemoveObs(index, obsIdx)" class="mini-icon-btn danger">🗑</button>
                          </div>
                        </div>
                        <div class="obs-text-content">
                          <pre v-if="editingObsIndex !== `${index}-${obsIdx}`" class="obs-pre">{{ obs }}</pre>
                          <div v-else class="obs-edit-box">
                            <textarea v-model="obsEditBuffer" class="obs-edit-area" rows="2"></textarea>
                            <div class="obs-edit-footer">
                              <button @click="handleSaveObs(index, obsIdx)" class="btn-confirm-mini">✓</button>
                              <button @click="cancelObsEdit" class="btn-cancel-mini">✗</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Add Observation Quick Input -->
                    <div class="add-obs-box" v-if="!isSaving && editingSectionIndex === -1 && canModify">
                      <div class="obs-input-wrapper">
                        <input 
                          v-model="newObsBuffers[index]" 
                          type="text" 
                          class="obs-quick-input cyber-input" 
                          :placeholder="t('dossier.addObservationPlaceholder') || 'Aggiungi nota investigativa...'"
                          @keyup.enter="handleAddObs(index)"
                        />
                        <button @click="handleAddObs(index)" class="obs-quick-add" :disabled="!newObsBuffers[index] || !newObsBuffers[index].trim()">+</button>
                      </div>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <div v-if="!showRawEdit" class="typed-editor-container">
                    <DossierSectionEditor :templateKey="section.templateKey" v-model="sectionEditForm.data" />
                  </div>
                  <div v-else class="expert-editor-container">
                    <label class="expert-label">EXPERT MODE: RAW JSON DATA</label>
                    <textarea v-model="sectionEditForm.dataString" class="edit-desc-input expert-json cyber-input" rows="18"></textarea>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useDossierDetail } from '../../composable/useDossierDetail';
import LanguageSwitcher from '../../components/LanguageSwitcher.vue';
import DossierReportActions from '../../components/DossierReportActions.vue';
import DossierSectionRenderer from '../../components/dossier/DossierSectionRenderer.vue';
import DossierSectionEditor from '../../components/dossier/DossierSectionEditor.vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useViewSettingsStore } from '../../stores/viewSettings';
import SkinSwitcher from '../../components/SkinSwitcher.vue';
import { formatDateTime, formatFullDateTime } from '../../utils/dateUtils';
import dayjs from 'dayjs';
import { DossierSectionType, type IDossierSection, type IHumanSectionData } from '../../models/DossierDTO';

const props = defineProps<{
  id: string;
}>();

const router = useRouter();
const { t } = useI18n();
const viewSettings = useViewSettingsStore();
const dashboardSkin = computed(() => viewSettings.dashboardSkin);
const reportAccentColor = computed(() => dashboardSkin.value === 'cyber' ? '#0ea5e9' : '#6366f1');

const {
  dossier,
  loading,
  error,
  isSaving,
  loadDossier,
  saveMetadata,
  addHumanSection,
  updateSection,
  deleteSection,
  addObservation,
  updateObservation,
  deleteObservation,
  canModify
} = useDossierDetail();

const showRaw = ref(false);
const isEditing = ref(false);
const showRawEdit = ref(false);
const editForm = ref({ title: '', description: '' });

// Buffers per le nuove osservazioni (uno per ogni sezione)
const newObsBuffers = ref<Record<number, string>>({});
// Buffer per l'editing di un'osservazione specifica
const editingObsIndex = ref<string | null>(null); // formato "sectionIdx-obsIdx"
const obsEditBuffer = ref('');

const handleAddObs = async (sectionIndex: number) => {
  const text = newObsBuffers.value[sectionIndex];
  if (!text || !text.trim()) return;
  try {
    await addObservation(props.id, sectionIndex, text);
    newObsBuffers.value[sectionIndex] = '';
    ElMessage.success(t('common.save') + ' OK');
  } catch (err) {
    ElMessage.error(t('common.error'));
  }
};

const startEditObs = (sectionIndex: number, obsIndex: number, text: string) => {
  editingObsIndex.value = `${sectionIndex}-${obsIndex}`;
  obsEditBuffer.value = text;
};

const cancelObsEdit = () => {
  editingObsIndex.value = null;
  obsEditBuffer.value = '';
};

const handleSaveObs = async (sectionIndex: number, obsIndex: number) => {
  try {
    await updateObservation(props.id, sectionIndex, obsIndex, obsEditBuffer.value);
    editingObsIndex.value = null;
    ElMessage.success(t('common.save') + ' OK');
  } catch (err) {
    ElMessage.error(t('common.error'));
  }
};

const handleRemoveObs = async (sectionIndex: number, obsIndex: number) => {
  try {
    await ElMessageBox.confirm('Eliminare questa osservazione?', 'Conferma', { type: 'warning' });
    await deleteObservation(props.id, sectionIndex, obsIndex);
    ElMessage.success(t('common.delete') + ' OK');
  } catch (err) {
    if (err !== 'cancel') ElMessage.error(t('common.error'));
  }
};

const startEdit = () => {
  if (!dossier.value) return;
  editForm.value = {
    title: dossier.value.title,
    description: dossier.value.description || ''
  };
  isEditing.value = true;
};

const cancelEdit = () => {
  isEditing.value = false;
};

const saveEdit = async () => {
  if (!editForm.value.title.trim()) {
    ElMessage.warning('Title required / Titolo richiesto');
    return;
  }
  try {
    await saveMetadata(props.id, editForm.value);
    isEditing.value = false;
    ElMessage.success(t('common.save') + ' OK');
  } catch (err) {
    ElMessage.error(t('common.error'));
  }
};

// === GESTIONE EDIT SEZIONI ===
const editingSectionIndex = ref(-1);
const sectionEditForm = ref({ type: '', templateKey: '', data: {}, dataString: '' });

const startEditSection = (index: number, section: IDossierSection) => {
  editingSectionIndex.value = index;
  showRawEdit.value = false;
  sectionEditForm.value = {
    type: section.type,
    templateKey: section.templateKey || '',
    data: JSON.parse(JSON.stringify(section.data || {})), // Deep copy reattivo
    dataString: section.data ? JSON.stringify(section.data, null, 2) : '{}'
  };
};

const cancelEditSection = () => {
  const index = editingSectionIndex.value;
  if (index !== -1 && dossier.value && (dossier.value.sections[index] as any)._isNew) {
    // Se è una nuova sezione mai salvata, la rimuoviamo dalla lista locale
    dossier.value.sections.splice(index, 1);
  }
  editingSectionIndex.value = -1;
};

const handleSaveSection = async (index: number) => {
  let finalData = {};

  if (showRawEdit.value) {
    try {
      finalData = JSON.parse(sectionEditForm.value.dataString);
    } catch (e) {
      ElMessage.error('JSON non valido nel Payload Dati.');
      return;
    }
  } else {
    finalData = sectionEditForm.value.data;
  }

  // Logica per popolare renderedText nelle sezioni generiche (Human Observation)
  const sectionUpdate: any = {
    type: sectionEditForm.value.type,
    data: finalData
  };

  if (sectionUpdate.type === DossierSectionType.HUMAN && (finalData as IHumanSectionData).text) {
    const divider = '---------------------------------------------------';
    const formatted = `${divider}\n[ HUMAN OBSERVATION ]\n${(finalData as IHumanSectionData).text}\n${divider}`;
    sectionUpdate.renderedText = formatted;
    sectionUpdate.templateKey = 'sectionHuman'; // Nuova chiave tecnica per il mapping backend

    // Inseriamo renderedText anche in data affinché il ReportService possa usarlo per il Telex
    sectionUpdate.data.renderedText = formatted;
  } else {
    // PRESERVIAMO il templateKey originale per evitare la corruzione dei dati
    sectionUpdate.templateKey = sectionEditForm.value.templateKey;
  }

  try {
    // Rimuoviamo il flag tecnico prima del salvataggio
    if ((sectionUpdate as any)._isNew) delete (sectionUpdate as any)._isNew;
    if (dossier.value && (dossier.value.sections[index] as any)._isNew) {
       delete (dossier.value.sections[index] as any)._isNew;
    }

    await updateSection(props.id, index, sectionUpdate);
    editingSectionIndex.value = -1;
    ElMessage.success(t('common.save') + ' OK');
  } catch (err) {
    ElMessage.error(t('common.error'));
  }
};

const handleDeleteSection = async (index: number) => {
  try {
    await ElMessageBox.confirm(
      t('common.confirmDeleteDossier'),
      t('common.confirm'),
      { type: 'warning' }
    );
    await deleteSection(props.id, index);
    if (editingSectionIndex.value === index) editingSectionIndex.value = -1;
    ElMessage.success(t('common.delete') + ' OK');
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(t('common.error'));
    }
  }
};

const handleAddHumanSection = () => {
  try {
    addHumanSection(props.id);
    // L'aggiunta in testa rende la nuova sezione all'indice 0
    if (dossier.value) {
      startEditSection(0, dossier.value.sections[0]);
    }
    // Nessun messaggio di OK qui, lo daremo al salvataggio effettivo
  } catch (err) {
    ElMessage.error(t('common.error'));
  }
};
// =============================

const init = async () => {
  try {
    await loadDossier(props.id);
  } catch (err) {
    ElMessage.error(t('common.errorLoadingData'));
    router.push('/dossiers');
  }
};

onMounted(init);

const goBack = () => router.push('/dossiers');
const formatDate = (date: any) => formatDateTime(date);

const isExpertModeAllowed = (templateKey: string) => {
  const knownKeys = [
    'clipboard.ip', 'clipboard.ipDetails.geo', 'clipboard.ipDetails.net', 
    'clipboard.ipDetails.abuse', 'clipboard.ipDetails.whois', 'clipboard.ipDetails.abuseLog',
    'clipboard.attackDetail.summary', 'clipboard.attackDetail.log', 'clipboard.attackDetail.rateLimitEvent',
    'clipboard.telnetDetail.summary', 'clipboard.telnetDetail.timelineRow', 'clipboard.telnetDetail.scannerAnalysis',
    'clipboard.attackTechnique'
  ];
  return !knownKeys.includes(templateKey);
};
</script>

<style scoped src="./DossierDetail.css"></style>
<style scoped src="./DossierDetailCyber.css"></style>
