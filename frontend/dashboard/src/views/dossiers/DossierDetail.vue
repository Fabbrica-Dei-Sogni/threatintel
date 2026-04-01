<template>
  <div class="dossier-archive-view detail-mode">
    <div class="header-top">
      <h1 v-if="dossier && !isEditing">{{ dossier.title }}</h1>
      <input v-else-if="dossier && isEditing" v-model="editForm.title" class="edit-title-input" />
      <LanguageSwitcher />
    </div>

    <div class="archive-header" style="flex-wrap: wrap; gap: 15px;">
      <div class="title-with-back">
        <button @click="goBack" class="back-btn" :disabled="isSaving">← {{ t('common.back').toUpperCase() }}</button>
        <button v-if="dossier && !isEditing" @click="startEdit" class="back-btn edit-btn">✎ {{ t('common.edit').toUpperCase() }}</button>
        <template v-if="dossier && isEditing">
          <button @click="saveEdit" class="back-btn save-btn" :disabled="isSaving">✓ {{ t('common.save').toUpperCase() }}</button>
          <button @click="cancelEdit" class="back-btn cancel-btn" :disabled="isSaving">✗ {{ t('common.cancel').toUpperCase() }}</button>
        </template>
      </div>
      <div class="header-actions" v-if="dossier">
        <DossierReportActions :dossierId="dossier._id" />
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner-large"></div>
      <p>{{ t('common.loading') }}</p>
    </div>

    <div v-else-if="dossier" class="detail-container">
      <!-- Info Sidebar -->
      <div class="detail-content">
        <div class="info-card glass-card">
          <p class="description" v-if="!isEditing">{{ dossier.description || t('common.noDescription') }}</p>
          <textarea v-else v-model="editForm.description" class="edit-desc-input" rows="3"></textarea>
          <div class="dossier-meta">
            <div class="meta-item"><strong>{{ t('common.id') }}:</strong> {{ dossier._id }}</div>
            <div class="meta-item"><strong>{{ t('common.timestamp') }}:</strong> {{ formatDate(dossier.createdAt) }}</div>
            <div class="meta-item"><strong>{{ t('common.status') }}:</strong> {{ dossier.status }}</div>
            <div class="meta-item" v-if="dossier.tags && dossier.tags.length">
               <span class="tag-badge" v-for="tag in dossier.tags" :key="tag">{{ tag }}</span>
            </div>
          </div>
        </div>

        <!-- Rendered Sections -->
        <div class="sections-timeline">
           <!-- New Section Button at the TOP -->
           <div class="add-section-action top-action" v-if="!isSaving && dossier && !isEditing && editingSectionIndex === -1">
             <button @click="handleAddGenericSection" class="back-btn add-btn-full">
                + {{ t('common.add').toUpperCase() }}
             </button>
           </div>

           <div v-for="(section, index) in dossier.sections" :key="index" class="section-preview glass-card">
              <div class="section-header">
                <div>
                  <span class="badge" v-if="editingSectionIndex !== index">{{ section.type.toUpperCase() }}</span>
                  <select v-else v-model="sectionEditForm.type" class="edit-title-input" style="width: auto; padding: 4px; font-size: 0.8rem; height: auto;">
                    <option value="ip">IP</option>
                    <option value="attack">ATTACK</option>
                    <option value="telnet">TELNET</option>
                    <option value="generic">GENERIC</option>
                  </select>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span class="timestamp">{{ formatDate(section.timestamp) }}</span>
                  <template v-if="editingSectionIndex !== index">
                    <button @click="startEditSection(index, section)" class="action-icon-btn" title="Modifica Sezione">✎</button>
                    <button @click="handleDeleteSection(index)" class="action-icon-btn danger-text" title="Elimina Sezione">🗑</button>
                  </template>
                  <template v-else>
                    <button @click="handleSaveSection(index)" class="action-icon-btn success-text" title="Salva Sezione" :disabled="isSaving">✓</button>
                    <button @click="showRawEdit = !showRawEdit" class="action-icon-btn btn-expert" :class="{ 'active-expert': showRawEdit }" title="Expert Mode (JSON)">{...}</button>
                    <button @click="cancelEditSection()" class="action-icon-btn" title="Annulla" :disabled="isSaving">✗</button>
                  </template>
                </div>
              </div>
              <div class="section-body">
                  <template v-if="editingSectionIndex !== index">
                    <!-- Nuovo sistema di rendering dinamico basato su DTO -->
                    <DossierSectionRenderer :section="section" />
                    
                    <!-- Expandable Data Toggle (for forensic review) -->
                    <div class="data-dump" v-if="showRaw">
                       <pre>{{ JSON.stringify(section.data, null, 2) }}</pre>
                    </div>
                  </template>
                  <template v-else>
                    <div v-if="!showRawEdit" class="typed-editor-container">
                      <DossierSectionEditor 
                        :templateKey="section.templateKey" 
                        v-model="sectionEditForm.data" 
                      />
                    </div>
                    <div v-else class="expert-editor-container">
                      <label style="font-size: 0.8rem; color: #fbbf24; font-weight: bold; margin-bottom: 5px; display: block;">EXPERT MODE: RAW JSON DATA</label>
                      <textarea v-model="sectionEditForm.dataString" class="edit-desc-input expert-json" rows="18" style="font-family: monospace;"></textarea>
                    </div>
                  </template>
              </div>
           </div>
        </div>
      </div>
    </div>
</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useDossierDetail } from '../../composable/useDossierDetail';
import LanguageSwitcher from '../../components/LanguageSwitcher.vue';
import DossierReportActions from '../../components/DossierReportActions.vue';
import DossierSectionRenderer from '../../components/dossier/DossierSectionRenderer.vue';
import DossierSectionEditor from '../../components/dossier/DossierSectionEditor.vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import dayjs from 'dayjs';
import type { IDossier, IDossierSection } from '../../models/DossierDTO';

const props = defineProps<{
  id: string;
}>();

const router = useRouter();
const { t } = useI18n();

const {
  dossier,
  loading,
  error,
  isSaving,
  loadDossier,
  saveMetadata,
  addGenericSection,
  updateSection,
  deleteSection
} = useDossierDetail();

const showRaw = ref(false);
const isEditing = ref(false);
const showRawEdit = ref(false);
const editForm = ref({ title: '', description: '' });

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
const sectionEditForm = ref({ type: '', data: {}, dataString: '' });

const startEditSection = (index: number, section: IDossierSection) => {
  editingSectionIndex.value = index;
  showRawEdit.value = false;
  sectionEditForm.value = {
    type: section.type,
    data: JSON.parse(JSON.stringify(section.data || {})), // Deep copy reattivo
    dataString: section.data ? JSON.stringify(section.data, null, 2) : '{}'
  };
};

const cancelEditSection = () => {
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
  
  try {
    await updateSection(props.id, index, {
      type: sectionEditForm.value.type,
      data: finalData
    });
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

const handleAddGenericSection = async () => {
  try {
    await addGenericSection(props.id);
    // L'aggiunta in testa rende la nuova sezione all'indice 0
    if (dossier.value) {
        startEditSection(0, dossier.value.sections[0]);
    }
    ElMessage.success(t('common.add') + ' OK');
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
const formatDate = (date) => dayjs(date).format('DD/MM/YYYY HH:mm:ss');

onMounted(loadDossier);
</script>

<style scoped src="./Dossiers.css"></style>
<style scoped>
.title-with-back {
  display: flex;
  align-items: center;
  gap: 20px;
}

.btn-back {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
}
.btn-back:hover { background: #6366f1; transform: translateX(-4px); }

.detail-container {
  max-width: 1000px;
  margin: 0 auto;
}

.info-card {
  padding: 30px;
  margin-bottom: 40px;
}

.sections-timeline {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-preview {
  padding: 20px;
  border-left: 4px solid #6366f1;
}

.section-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 10px;
}

.section-header .badge {
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 800;
}

.section-header .timestamp {
  color: #64748b;
  font-size: 0.75rem;
}

.rendered-content {
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.6;
}

/* Override per uniformare i contenuti EJS iniettati */
:deep(.rendered-content) h2, :deep(.rendered-content) h3 {
  color: #6366f1;
  font-size: 1rem;
  margin-top: 15px;
}

:deep(.rendered-content) table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

:deep(.rendered-content) td {
  padding: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.85rem;
}

.data-dump {
  margin-top: 20px;
  background: #000;
  padding: 15px;
  border-radius: 8px;
  overflow: auto;
  font-size: 0.75rem;
}

.style-selector.ghost select {
  background: transparent;
  color: #818cf8;
  border: 1px solid rgba(99, 102, 241, 0.3);
  padding: 8px 12px;
}

.indigo-pulse {
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.3);
  padding: 6px 14px;
  border-radius: 20px;
  font-weight: 800;
  font-size: 0.8rem;
  letter-spacing: 1px;
}

/* Standard Header & Back Button */
.header-top {
  margin-bottom: 25px;
}

.back-btn {
  background: rgba(99, 102, 241, 0.1);
  color: #818cf8;
  border: 1px solid rgba(99, 102, 241, 0.3);
  font-weight: 700;
  padding: 10px 24px;
  box-shadow: 0 0 15px rgba(99, 102, 241, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 4px;
  cursor: pointer;
}

.back-btn:hover {
  background: #6366f1;
  color: white;
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
  transform: translateY(-2px);
  border-color: #6366f1;
}

.save-btn { border-color: #10b981; color: #10b981; }
.save-btn:hover { background: #10b981; border-color: #10b981; }
.cancel-btn { border-color: #ef4444; color: #ef4444; }
.cancel-btn:hover { background: #ef4444; border-color: #ef4444; }

.edit-title-input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(99, 102, 241, 0.5);
  color: white;
  font-size: 2rem;
  font-weight: 800;
  padding: 10px 15px;
  border-radius: 8px;
  width: 100%;
  max-width: 600px;
  outline: none;
}
.edit-title-input:focus { border-color: #6366f1; background: rgba(0, 0, 0, 0.2); }

.edit-desc-input {
  background: rgba(0, 0, 0, 0.2);
  border: 1px dashed rgba(99, 102, 241, 0.5);
  color: #a5b4fc;
  font-size: 1rem;
  padding: 15px;
  border-radius: 8px;
  width: 100%;
  resize: vertical;
  margin-bottom: 20px;
  outline: none;
  font-family: inherit;
}
.edit-desc-input:focus { border-color: #6366f1; }

.action-icon-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #818cf8;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 4px;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.action-icon-btn:hover { background: rgba(99, 102, 241, 0.2); transform: scale(1.05); border-color: rgba(99, 102, 241, 0.5); }
.active-expert { background: #fbbf24 !important; color: black !important; border-color: #fbbf24 !important; box-shadow: 0 0 10px rgba(251, 191, 36, 0.3) !important; }
.btn-expert { font-size: 0.7rem !important; font-weight: 800; font-family: monospace; }
.expert-json { border-color: #fbbf24 !important; color: #fbbf24 !important; }
.expert-json:focus { box-shadow: none !important; }

.action-icon-btn.success-text:hover { background: rgba(16, 185, 129, 0.2); border-color: rgba(16, 185, 129, 0.5); }
.action-icon-btn.danger-text:hover { background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.5); }

.add-section-action {
  margin-top: 30px;
  display: flex;
  justify-content: center;
  padding-bottom: 50px;
}

.add-btn-full {
  width: 100%;
  max-width: 400px;
  border-style: dashed;
  background: rgba(99, 102, 241, 0.05);
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  letter-spacing: 2px;
}

.add-btn-full:hover {
  border-style: solid;
  background: rgba(99, 102, 241, 0.15);
}
</style>
