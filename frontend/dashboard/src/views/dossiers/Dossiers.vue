<template>
  <div class="dossier-archive-view">
    <div class="header-top">
      <h1>🗃️ {{ t('nav.archive').toUpperCase() }}</h1>
      <LanguageSwitcher />
    </div>

    <div class="archive-header">
      <button @click="goBack" class="back-btn">{{ t('home.dashboard').toUpperCase() }}</button>
      <div class="header-stats">
        <span class="badge indigo-pulse">{{ total }} {{ t('common.investigations') }}</span>
      </div>
    </div>

    <!-- Controls -->
    <div class="archive-controls glass-morphism">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input v-model="filterSearch" type="text" class="search-input" :placeholder="t('common.searchByTitleOrIp')"
          @input="handleSearchInput" />
      </div>
      <div class="filter-group">
        <select v-model="filterStatus" class="filter-select">
          <option value="">{{ t('common.allStatus') }}</option>
          <option value="draft">DRAFT</option>
          <option value="finalized">FINALIZED</option>
          <option value="archived">ARCHIVED</option>
        </select>
      </div>
      <div class="filter-group">
        <select @change="handleSortChange" class="filter-select">
          <option value="createdAt:-1">{{ t('sorting.sortTimestamp') }} (Newest)</option>
          <option value="createdAt:1">{{ t('sorting.sortTimestamp') }} (Oldest)</option>
          <option value="title:1">{{ t('sorting.sortUrl') }} (A-Z)</option>
          <!-- Using sortUrl because it's available and similar to Title -->
          <option value="status:1">{{ t('common.status') }}</option>
        </select>
      </div>
      <button @click="fetchData" class="btn-refresh" :class="{ rotating: loading }">🔄</button>
    </div>

    <!-- Grid -->
    <div v-if="loading && dossiers.length === 0" class="loading-state">
      <div class="spinner-large"></div>
      <p>{{ t('common.loading') }}</p>
    </div>

    <div v-else-if="dossiers.length === 0" class="empty-state">
      <span class="empty-icon">📁</span>
      <h3>{{ t('common.noDossiersFound') }}</h3>
    </div>

    <div v-else class="dossier-grid">
      <div v-for="dossier in dossiers" :key="dossier._id" class="dossier-card">
        <div class="card-header">
          <h3>{{ dossier.title }}</h3>
          <span class="status-dot" :class="dossier.status.toLowerCase()"></span>
        </div>

        <p class="description">{{ dossier.description || t('common.noDescription') }}</p>

        <div class="dossier-meta">
          <div class="meta-item">
            <span class="icon">📅</span> {{ formatDateTime(dossier.createdAt) }}
          </div>
          <div class="meta-item">
            <span class="icon">🧩</span> {{ dossier.sections.length }} {{ t('common.sections') }}
          </div>
          <div class="meta-item" v-if="dossier.tags && dossier.tags.length">
            <span class="tag-badge" v-for="tag in dossier.tags" :key="tag">{{ tag }}</span>
          </div>
        </div>

        <div class="card-actions">
          <button @click="viewDetail(dossier._id)" class="btn-archive primary">
            👁️ {{ t('common.view') }}
          </button>
          <button @click="exportDossierPdf(dossier._id)" class="btn-archive">
            📄 PDF
          </button>
          <button v-if="canDeleteDossier(dossier)" @click="confirmDelete(dossier._id)" class="btn-archive delete" :title="t('common.delete')">
            🗑️
          </button>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div class="pagination-controls" v-if="totalPages > 1">
      <button class="page-btn" :disabled="page === 1" @click="changePage(page - 1)">
        &lt;
      </button>
      <button v-for="p in totalPages" :key="p" class="page-btn" :class="{ active: p === page }" @click="changePage(p)">
        {{ p }}
      </button>
      <button class="page-btn" :disabled="page === totalPages" @click="changePage(page + 1)">
        &gt;
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { deleteDossier, exportDossier } from '../../api';
import LanguageSwitcher from '../../components/LanguageSwitcher.vue';
import { ElMessageBox, ElMessage } from 'element-plus';
import { useDossierStore } from '../../stores/dossier';
import { useAuthStore } from '../../stores/auth';
import { useDossiersFilter } from '../../composable/useDossiersFilter';
import { formatDateTime, formatFullDateTime } from '../../utils/dateUtils';
import dayjs from 'dayjs';

const { t } = useI18n();
const router = useRouter();
const dossierStore = useDossierStore();
const authStore = useAuthStore();

const props = defineProps({
  initialSearch: { type: String, default: '' },
  initialStatus: { type: String, default: '' },
  initialPage: { type: Number, default: 1 },
  initialPageSize: { type: Number, default: 12 },
  initialSortFields: { type: Object, default: () => ({ createdAt: -1 }) }
});

const {
  dossiers,
  filterSearch,
  filterStatus,
  page,
  pageSize,
  sortFields,
  total,
  loading,
  error,
  fetchData,
  debouncedFetch
} = useDossiersFilter(
  props.initialSearch,
  props.initialStatus,
  props.initialPage,
  props.initialPageSize,
  props.initialSortFields
);

const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

// Sincronizzazione Prop -> Ref (per navigazione con tasti back/forward del browser)
watch(() => props.initialSearch, (newVal) => { filterSearch.value = newVal; });
watch(() => props.initialStatus, (newVal) => { filterStatus.value = newVal; });
watch(() => props.initialPage, (newVal) => { page.value = newVal; });
watch(() => props.initialSortFields, (newVal) => { sortFields.value = newVal; }, { deep: true });

// Sincronizzazione Ref -> URL query
watch(
  [filterSearch, filterStatus, page, sortFields],
  ([nSearch, nStatus, nPage, nSort]) => {
    router.replace({
      name: 'Dossiers',
      query: {
        search: nSearch || undefined,
        status: nStatus || undefined,
        page: nPage > 1 ? nPage : undefined,
        sortFields: nSort ? JSON.stringify(nSort) : undefined
      }
    });
  }
);

// Sincronizzazione automatica se viene salvato un dossier altrove
watch(() => dossierStore.lastSavedAt, (newVal) => {
  if (newVal) {
    fetchData();
  }
}, { immediate: true });

const handleSearchInput = () => {
  // debouncedFetch is handled by useSearchBase via watcher on filterSearch
};

const handleSortChange = (e) => {
  const [field, direction] = e.target.value.split(':');
  sortFields.value = { [field]: parseInt(direction) };
};

const changePage = (p) => {
  page.value = p;
};

const canDeleteDossier = (dossier) => {
  if (!authStore.user) return false;
  return authStore.isAdmin || dossier.owner === authStore.user.username;
};

const viewDetail = (id) => {
  router.push(`/dossiers/${id}`);
};

const goBack = () => {
  router.push('/');
};

const exportDossierPdf = async (id) => {
  try {
    await exportDossier(id, 'pdf', 'classic');
    ElMessage.success(t('common.downloadPdf'));
  } catch (err) {
    ElMessage.error(t('common.errorExporting'));
  }
};

const confirmDelete = (id) => {
  ElMessageBox.confirm(
    t('common.confirmDeleteDossier'),
    t('common.confirm'),
    { type: 'warning' }
  ).then(async () => {
    await deleteDossier(id);
    ElMessage.info(t('common.dossierDeleted'));
    fetchData();
  }).catch(() => { });
};

const formatDate = (date) => formatFullDateTime(date);

onMounted(() => {
  // fetchData() is already called immediately by useSearchBase watcher
});
</script>

<style scoped src="./Dossiers.css"></style>
<style scoped>
/* Additional specific utility classes for the view */
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

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-dot.finalized {
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

.status-dot.draft {
  background: #f59e0b;
  box-shadow: 0 0 8px #f59e0b;
}

.status-dot.archived {
  background: #64748b;
}

.description {
  font-size: 0.85rem;
  color: #94a3b8;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 15px;
}

.filter-select {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  padding: 10px;
  border-radius: 10px;
  outline: none;
  cursor: pointer;
}

.btn-refresh {
  background: transparent;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-refresh:hover {
  transform: scale(1.1);
}

.rotating {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-state,
.empty-state {
  padding: 100px;
  text-align: center;
  color: #475569;
}

.empty-icon {
  font-size: 4rem;
  display: block;
  margin-bottom: 20px;
}
</style>
