<template>
  <div class="dossier-archive-view detail-mode">
    <div class="header-top">
      <h1 v-if="dossier">{{ dossier.title }}</h1>
      <LanguageSwitcher />
    </div>

    <div class="archive-header">
      <div class="title-with-back">
        <button @click="goBack" class="back-btn">← {{ t('common.back').toUpperCase() }}</button>
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
          <p class="description">{{ dossier.description || t('common.noDescription') }}</p>
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
           <div v-for="(section, index) in dossier.sections" :key="index" class="section-preview glass-card">
              <div class="section-header">
                <span class="badge">{{ section.type.toUpperCase() }}</span>
                <span class="timestamp">{{ formatDate(section.timestamp) }}</span>
              </div>
              <div class="section-body">
                 <!-- Se è presente renderedText (fallback) lo mostriamo, altrimenti mostriamo i dati raw o un placeholder -->
                 <div class="rendered-content" v-html="section.renderedText"></div>
                 
                 <!-- Expandable Data Toggle (for forensic review) -->
                 <div class="data-dump" v-if="showRaw">
                    <pre>{{ JSON.stringify(section.data, null, 2) }}</pre>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { fetchDossierById } from '../../api';
import LanguageSwitcher from '../../components/LanguageSwitcher.vue';
import DossierReportActions from '../../components/DossierReportActions.vue';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';

const route = useRoute();
const router = useRouter();

const { t } = useI18n();

const dossier = ref(null);
const loading = ref(true);
const showRaw = ref(false);

const loadDossier = async () => {
  loading.value = true;
  try {
    const id = route.params.id;
    const data = await fetchDossierById(id);
    dossier.value = data;
  } catch (error) {
    ElMessage.error(t('common.errorLoadingData'));
    router.push('/dossiers');
  } finally {
    loading.value = false;
  }
};

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
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 25px;
}

.header-top :last-child {
  margin-left: auto;
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
</style>
