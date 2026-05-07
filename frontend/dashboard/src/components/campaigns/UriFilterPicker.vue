<template>
  <div class="uri-filter-picker">
    <div class="picker-header" @click="isOpen = !isOpen">
      <div class="picker-label">
        <span class="cyber-icon">🔗</span>
        <span>{{ t('campaigns.filterByUri').toUpperCase() }}</span>
      </div>
      <div class="selected-count" v-if="selectedUris.length > 0">
        {{ selectedUris.length }}
      </div>
      <span class="chevron" :class="{ open: isOpen }">▼</span>
    </div>

    <!-- Overlay per chiudere il dropdown cliccando fuori -->
    <div v-if="isOpen" class="picker-overlay" @click="isOpen = false"></div>

    <transition name="slide-fade">
      <div v-if="isOpen" class="picker-dropdown">
        <!-- Search & Sorting -->
        <div class="picker-controls">
          <div class="search-wrapper">
            <span class="search-icon">🔍</span>
            <input 
              v-model="searchQuery" 
              :placeholder="t('common.search').toUpperCase() + '...'" 
              class="cyber-input-mini"
            />
          </div>
          <div class="sort-controls">
            <button 
                class="btn-sort" 
                :class="{ active: sortBy === 'count' }" 
                @click="sortBy = 'count'"
                title="Sort by Campaign Count"
            >
              📊
            </button>
            <button 
                class="btn-sort" 
                :class="{ active: sortBy === 'uri' }" 
                @click="sortBy = 'uri'"
                title="Sort by URI"
            >
              ABC
            </button>
          </div>
        </div>

        <!-- List -->
        <div class="uri-list" v-if="!loading">
          <div 
            v-for="item in uris" 
            :key="item.uri" 
            class="uri-item"
            :class="{ selected: selectedUris.includes(item.uri) }"
            @click="toggleUri(item.uri)"
          >
            <div class="uri-checkbox">
              <div class="check-box-inner" v-if="selectedUris.includes(item.uri)"></div>
            </div>
            <div class="uri-content">
              <span class="uri-text" :title="item.uri">{{ item.uri }}</span>
              <div class="uri-meta">
                <span class="meta-tag campaigns">{{ item.campaignCount }} {{ t('campaigns.title').toLowerCase() }}</span>
                <span class="meta-tag logs">{{ item.totaleLogs }} logs</span>
              </div>
            </div>
          </div>
          
          <div v-if="uris.length === 0" class="no-results">
            {{ t('common.noDataFound') }}
          </div>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="list-loading">
          <div class="spinner-cyber"></div>
        </div>

        <!-- Pager -->
        <div class="picker-footer">
          <div class="mini-pager">
            <button class="pager-btn" :disabled="page <= 1" @click="page--">◀</button>
            <span class="page-indicator">{{ page }} / {{ Math.ceil(total / pageSize) || 1 }}</span>
            <button class="pager-btn" :disabled="page >= Math.ceil(total / pageSize)" @click="page++">▶</button>
          </div>
          <button class="btn-clear-mini" v-if="selectedUris.length > 0" @click="clearUris">
            {{ t('common.clear').toUpperCase() }}
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { fetchUniqueUris } from '../../api';
import debounce from 'lodash/debounce';

const props = defineProps({
  selectedUris: { type: Array, default: () => [] },
  protocol: { type: String, default: 'http' },
  timeConfig: { type: Object, default: () => ({}) },
  minIps: { type: Number, default: 2 },
  minScore: { type: Number, default: 0 }
});

const emit = defineEmits(['update:selectedUris', 'toggle-uri', 'clear-uris']);

const { t } = useI18n();
const isOpen = ref(false);
const loading = ref(false);
const uris = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const searchQuery = ref('');
const sortBy = ref('count');
const order = ref(-1);

const loadUris = async () => {
  loading.value = true;
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value,
      sortBy: sortBy.value,
      order: order.value,
      protocol: props.protocol,
      minIps: props.minIps,
      minScore: props.minScore,
      search: searchQuery.value,
      ...props.timeConfig
    };
    
    const res = await fetchUniqueUris(params);
    uris.value = res.uris;
    total.value = res.total;
  } catch (e) {
    console.error('Error loading URIs:', e);
  } finally {
    loading.value = false;
  }
};

const debouncedLoad = debounce(loadUris, 300);

watch([page, sortBy, () => props.protocol, () => props.timeConfig, () => props.minIps, () => props.minScore], () => {
  loadUris();
});

watch(searchQuery, () => {
  page.value = 1;
  debouncedLoad();
});

onMounted(() => {
  loadUris();
});

function toggleUri(uri) {
  emit('toggle-uri', uri);
}

function clearUris() {
  emit('clear-uris');
}
</script>

<style scoped>
.uri-filter-picker {
  position: relative;
  min-width: 280px;
}

.picker-header {
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(0, 255, 65, 0.2);
  padding: 10px 14px;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.picker-header:hover {
  background: rgba(0, 255, 65, 0.05);
  border-color: rgba(0, 255, 65, 0.5);
  box-shadow: 0 0 15px rgba(0, 255, 65, 0.15);
}

.picker-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  color: #00FF41;
  letter-spacing: 1.5px;
  font-weight: 600;
}

.selected-count {
  background: #00FF41;
  color: #000;
  font-size: 0.6rem;
  font-weight: 900;
  padding: 1px 6px;
  border-radius: 2px;
  min-width: 20px;
  text-align: center;
}

.chevron {
  font-size: 0.6rem;
  color: rgba(0, 255, 65, 0.4);
  transition: transform 0.3s;
}

.chevron.open {
  transform: rotate(180deg);
}

.picker-overlay {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  z-index: 1000;
  background: transparent;
}

.picker-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 1001;
  background: #050a06;
  border: 1px solid #00FF41;
  border-radius: 2px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 255, 65, 0.1);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.picker-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.search-wrapper {
  position: relative;
  flex: 1;
}

.search-icon {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.7rem;
  opacity: 0.5;
}

.cyber-input-mini {
  width: 100%;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(0, 255, 65, 0.2);
  color: #00FF41;
  font-size: 0.65rem;
  padding: 6px 6px 6px 26px;
  outline: none;
  font-family: 'JetBrains Mono', monospace;
  transition: all 0.2s;
}

.cyber-input-mini:focus {
  border-color: #00FF41;
  background: rgba(0, 0, 0, 0.6);
}

.sort-controls {
  display: flex;
  gap: 4px;
}

.btn-sort {
  background: transparent;
  border: 1px solid rgba(0, 255, 65, 0.2);
  color: rgba(0, 255, 65, 0.4);
  font-size: 0.8rem;
  padding: 4px 8px;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-sort:hover {
  border-color: rgba(0, 255, 65, 0.6);
  color: #00FF41;
}

.btn-sort.active {
  background: rgba(0, 255, 65, 0.15);
  color: #00FF41;
  border-color: #00FF41;
  box-shadow: 0 0 10px rgba(0, 255, 65, 0.2);
}

.uri-list {
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-right: 4px;
}

/* Custom Scrollbar Cyber */
.uri-list::-webkit-scrollbar {
  width: 3px;
}
.uri-list::-webkit-scrollbar-track {
  background: rgba(0, 255, 65, 0.05);
}
.uri-list::-webkit-scrollbar-thumb {
  background: #00FF41;
}

.uri-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px;
  cursor: pointer;
  border-radius: 2px;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.uri-item:hover {
  background: rgba(0, 255, 65, 0.05);
  border-color: rgba(0, 255, 65, 0.1);
}

.uri-item.selected {
  background: rgba(0, 255, 65, 0.1);
  border-color: rgba(0, 255, 65, 0.3);
}

.uri-checkbox {
  width: 14px;
  height: 14px;
  margin-top: 2px;
  border: 1px solid rgba(0, 255, 65, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.check-box-inner {
  width: 8px;
  height: 8px;
  background: #00FF41;
  box-shadow: 0 0 8px #00FF41;
}

.uri-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 4px;
}

.uri-text {
  font-size: 0.75rem;
  color: #fff;
  font-family: 'JetBrains Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.5px;
}

.uri-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.meta-tag {
  font-size: 0.55rem;
  padding: 1px 6px;
  border-radius: 2px;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
}

.meta-tag.campaigns {
  background: rgba(0, 255, 65, 0.1);
  color: #00FF41;
}

.meta-tag.logs {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.5);
}

.picker-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid rgba(0, 255, 65, 0.1);
}

.mini-pager {
  display: flex;
  gap: 12px;
  align-items: center;
}

.pager-btn {
  background: transparent;
  border: 1px solid rgba(0, 255, 65, 0.2);
  color: #00FF41;
  cursor: pointer;
  font-size: 0.6rem;
  padding: 2px 6px;
  border-radius: 2px;
}

.pager-btn:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

.page-indicator {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.4);
  font-family: 'JetBrains Mono', monospace;
}

.btn-clear-mini {
  background: transparent;
  border: none;
  color: #ff4d4d;
  font-size: 0.6rem;
  cursor: pointer;
  font-weight: 800;
  letter-spacing: 1px;
}

.list-loading { height: 120px; display: flex; align-items: center; justify-content: center; }
.spinner-cyber {
  width: 24px; height: 24px;
  border: 2px solid rgba(0, 255, 65, 0.1);
  border-top-color: #00FF41;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.no-results {
  padding: 20px;
  text-align: center;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.3);
  font-style: italic;
}

.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-fade-enter-from, .slide-fade-leave-to { opacity: 0; transform: translateY(-10px); }
</style>
