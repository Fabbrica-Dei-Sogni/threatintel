<template>
  <div class="threatlogs">
    <div class="header-top">
      <h1><span class="animated-icon pulse-log">🗄️</span> {{ t('threatLogs.title') }}</h1>
      <LanguageSwitcher />
    </div>
    <!-- Pulsante per navigare alla Home -->
    <div class="actions">
      <div class="nav-actions">
        <button @click="goToHome" class="btn-action">
          {{ t('threatLogs.dashboard') }}
        </button>
        <button @click="goToAttacks" class="btn-action">
          {{ t('threatLogs.attacks') }}
        </button>
      </div>
      <div class="view-controls">
        <ViewToggle v-model="showChart" :label="t('common.showChart')" theme="amber" />
      </div>
    </div>

    <section class="filters-container">
      <div class="filter-row main-filters">
        <ProtocolSelector v-model="filterProtocol" :options="['http', 'https', 'ssh']" theme="amber" />
        <div class="filter-item search-box">
          <input type="text" v-model="filterIp" :placeholder="t('threatLogs.filterByIp')" @input="onFilterChanged"
            class="ip-input" />
          <button v-if="filterIp" @click="clearIpFilter" class="clear-btn" :aria-label="t('threatLogs.clearIpFilter')">
            ×
          </button>
        </div>
        <div class="filter-item search-box url-search">
          <input v-model="filterUrl" :placeholder="t('threatLogs.filterByUrl')" @input="onFilterChanged"
            class="ip-input" type="text" />
          <button v-if="filterUrl" @click="clearUrlFilter" class="clear-btn" :title="t('threatLogs.clearUrlFilter')"
            type="button" aria-label="Clear URL filter">
            ✕
          </button>
        </div>
      </div>
    </section>

    <transition name="fade">
      <div v-if="showChart">
        <ThreadLogChart v-if="logs && logs.length > 0" :logs="logs" />
      </div>
    </transition>

    <div class="pagination cyber-pagination" v-if="total > pageSize">
      <button :disabled="page === 1" @click="changePage(page - 1)">◄ {{ t('common.prev') }}</button>
      <span class="pagination-info">{{ t('common.page') }} {{ page }} {{ t('common.of') }} {{ totalPages }}</span>
      <button :disabled="page === totalPages" @click="changePage(page + 1)">{{ t('common.next') }} ►</button>

      <div class="page-input-container">
        <label for="pageInput">{{ t('common.goToPage') }}:</label>
        <input class="pagination-input" id="pageInput" type="number" v-model.number="inputPage" :min="1"
          :max="totalPages" placeholder="1" />
      </div>
    </div>

    <div class="table-status-container">
        <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
        <div v-if="error" class="error">{{ t('common.errorLoadingData') }}</div>

    <!-- Top Scrollbar Sync Wrapper -->
    <div class="top-scrollbar-wrapper" ref="topScrollRef">
      <div class="top-scrollbar-content" :style="{ width: tableWidth + 'px' }"></div>
    </div>

    <section class="log-table" ref="tableScrollRef">
      <table ref="tableRef">
        <thead>
          <tr>
            <th>
              <span class="label">{{ t('threatLogs.table.countryOrg') }}</span>
            </th>
            <th>{{ t('threatLogs.table.details') }}</th>
            <th class="sortable-th">
              <div class="sort-control">
                <span class="label">{{ t('threatLogs.table.ip') }}</span>
                <button @click="toggleSort('request.ip')" :aria-label="t('sorting.sortIp')" class="sort-button">
                  <span v-if="getSortDirection('request.ip') === 1">▲</span>
                  <span v-else-if="getSortDirection('request.ip') === -1">▼</span>
                  <span v-else>⇵</span>
                </button>
              </div>
            </th>
            <th class="sortable-th">
              <div class="sort-control">
                <span class="label">{{ t('threatLogs.table.url') }}</span>
                <button @click="toggleSort('request.url')" :aria-label="t('sorting.sortUrl')" class="sort-button">
                  <span v-if="getSortDirection('request.url') === 1">▲</span>
                  <span v-else-if="getSortDirection('request.url') === -1">▼</span>
                  <span v-else>⇵</span>
                </button>
              </div>
            </th>
            <th class="sortable-th">
              <div class="sort-control">
                <span class="label">{{ t('threatLogs.table.dangerScore') }}</span>
                <button @click="toggleSort('fingerprint.score')" :aria-label="t('sorting.sortScore')"
                  class="sort-button">
                  <span v-if="getSortDirection('fingerprint.score') === 1">▲</span>
                  <span v-else-if="getSortDirection('fingerprint.score') === -1">▼</span>
                  <span v-else>⇵</span>
                </button>
              </div>
            </th>
            <th class="sortable-th">
              <div class="sort-control">
                <span class="label">{{ t('threatLogs.table.method') }}</span>
                <button @click="toggleSort('request.method')" :aria-label="t('sorting.sortMethod')" class="sort-button">
                  <span v-if="getSortDirection('request.method') === 1">▲</span>
                  <span v-else-if="getSortDirection('request.method') === -1">▼</span>
                  <span v-else>⇵</span>
                </button>
              </div>
            </th>
            <th class="sortable-th">
              <div class="sort-control">
                <span class="label">{{ t('threatLogs.table.timestamp') }}</span>
                <button @click="toggleSort('timestamp')" :aria-label="t('sorting.sortTimestamp')" class="sort-button">
                  <span v-if="getSortDirection('timestamp') === 1">▲</span>
                  <span v-else-if="getSortDirection('timestamp') === -1">▼</span>
                  <span v-else>⇵</span>
                </button>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log._id">
            <td>
              <div style="display: flex; justify-content: center; align-items: center; min-width: 30px;">
                <CountryFlag :countryCode="log.ipDetailsId?.ipinfo?.country"
                  :tooltip="log.ipDetailsId?.ipinfo ? `${log.ipDetailsId.ipinfo.country} - ${log.ipDetailsId.ipinfo.org || t('common.notAvailable')}` : t('common.notAvailable')" />
              </div>
            </td>
            <td><button @click="goToThreatLogDetails(log.id)" style="cursor: pointer;" class="info-btn">{{
              t('common.detail') }}</button></td>
            <td>
              <span style="display:inline-flex;align-items:center;">
                <span class="info-btn" @click="goToIpDetails(log.request.ip)" style="cursor: pointer;"
                  :title="t('common.infoIp')">{{
                    log.request.ip }}</span>
                <button @click.stop="copyToClipboard(log.request.ip)" class="btn-copy-ip"
                  :title="t('common.copyToClipboard')">📋</button>
                <button @click.stop="setIpFilter(log.request.ip)" class="btn-copy-ip"
                  :title="t('common.copyToFilter')">⬇️</button>
              </span>
            </td>
            <td class="url-cell">
              <div class="url-badge">
                <span class="url-text">{{ log.request.url }}</span>
                <div class="url-actions">
                  <button @click.stop="copyToClipboard(log.request.url)" class="btn-copy-url"
                    :title="t('common.copyToClipboard')">📋</button>
                  <button @click.stop="setUrlFilter(log.request.url)" class="btn-copy-url"
                    :title="t('common.copyToFilter')">⬇️</button>
                </div>
              </div>
            </td>
            <td>{{ log.fingerprint.score }}</td>

            <td>
              {{ log.request.method }}
              <span v-if="log.metadata?.eventCount > 1" style="color: #ffb86c; font-size: 0.9em; margin-left: 5px;">
                (x{{ log.metadata.eventCount }})
              </span>
            </td>
            <td class="time-cell">
              <div class="time-display">
                <span class="time-date">{{ dayjs(log.timestamp).format('DD/MM/YYYY') }}</span>
                <span class="time-hour">{{ dayjs(log.timestamp).format('HH:mm:ss') }}</span>
              </div>
            </td>
          </tr>
          <tr v-if="logs.length === 0 && !loading">
            <td colspan="7" style="text-align:center;">{{ t('threatLogs.noLogsFound') }}</td>
          </tr>
        </tbody>
      </table>

      <div class="pagination cyber-pagination" v-if="total > pageSize">
        <button :disabled="page === 1" @click="changePage(page - 1)">◄ {{ t('common.prev') }}</button>
        <span class="pagination-info">{{ t('common.page') }} {{ page }} {{ t('common.of') }} {{ totalPages }}</span>
        <button :disabled="page === totalPages" @click="changePage(page + 1)">{{ t('common.next') }} ►</button>

        <div class="page-input-container">
          <label for="pageInputBottom">{{ t('common.goToPage') }}:</label>
          <input class="pagination-input" id="pageInputBottom" type="number" v-model.number="inputPage" :min="1"
            :max="totalPages" placeholder="1" />
        </div>
      </div>
    </section>
  </div>
  </div>
</template>

<script setup>
import { computed, watch, ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useLogsFilter } from '../../composable/useLogsFilter';
import { useClipboard } from '../../composable/useClipboard';
import { useI18n } from 'vue-i18n';
import ProtocolSelector from '../../components/common/ProtocolSelector.vue';
import ViewToggle from '../../components/common/ViewToggle.vue';
import dayjs from 'dayjs';
import CountryFlag from '../../components/CountryFlag.vue';
import ThreadLogChart from '../../components/ThreadLogChart.vue';
import LanguageSwitcher from '../../components/LanguageSwitcher.vue';

const { t } = useI18n();
const { copyToClipboard } = useClipboard();
const router = useRouter();

// Props iniziali
const props = defineProps({
  initialIp: String,
  initialUrl: String,
  initialProtocol: { type: String, default: 'http' },
  initialPage: { type: Number, default: 1 },
  initialSortFields: { type: Object, default: () => ({}) }
});

// State
const {
  filterIp,
  filterUrl,
  filterProtocol,
  sortFields,
  page,
  logs,
  total,
  loading,
  error,
  pageSize,
  fetchData,
  onFilterChanged,
  toggleSort,
  getSortDirection
} = useLogsFilter(props.initialIp, props.initialUrl, props.initialProtocol, props.initialPage, props.initialSortFields);

const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1);
const previousPageBeforeIpFilter = ref(null);

import { useViewSettingsStore } from '../../stores/viewSettings';
import { storeToRefs } from 'pinia';
const viewStore = useViewSettingsStore();
const { logsShowChart: showChart } = storeToRefs(viewStore);
const inputPage = ref(page.value);

// Dual Scrollbar Sync Support
const topScrollRef = ref(null);
const tableScrollRef = ref(null);
const tableRef = ref(null);
const tableWidth = ref(1400);

const syncScroll = (source, target) => {
  if (!source || !target) return;
  target.scrollLeft = source.scrollLeft;
};

const handleTopScroll = () => syncScroll(topScrollRef.value, tableScrollRef.value);
const handleTableScroll = () => syncScroll(tableScrollRef.value, topScrollRef.value);

const updateTableWidth = () => {
  nextTick(() => {
    if (tableRef.value) {
      tableWidth.value = tableRef.value.scrollWidth;
    }
  });
};

// Lifecycle
onMounted(() => {
  if (topScrollRef.value && tableScrollRef.value) {
    topScrollRef.value.addEventListener('scroll', handleTopScroll);
    tableScrollRef.value.addEventListener('scroll', handleTableScroll);
  }
  updateTableWidth();
  const interval = setInterval(updateTableWidth, 1000);
  onUnmounted(() => clearInterval(interval));
  fetchData();
});

onUnmounted(() => {
  if (topScrollRef.value) topScrollRef.value.removeEventListener('scroll', handleTopScroll);
  if (tableScrollRef.value) tableScrollRef.value.removeEventListener('scroll', handleTableScroll);
});

// Watches
watch([filterIp, filterUrl, filterProtocol, page, sortFields], ([newIp, newUrl, newProto, newPage, newSortFields]) => {
  router.replace({
    name: 'ThreatLogs',
    query: {
      ip: newIp || undefined,
      url: newUrl || undefined,
      protocol: newProto !== 'http' ? newProto : undefined,
      page: newPage > 1 ? newPage : undefined,
      sortFields: newSortFields ? JSON.stringify(newSortFields) : undefined
    },
  });
});

watch(page, (newPage) => {
  inputPage.value = newPage;
});

let debounceTimer = null;
watch(inputPage, (newPage) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    goToInputPage();
  }, 300);
});

watch(() => logs.value, () => {
  setTimeout(updateTableWidth, 200);
}, { deep: true });

// Methods
function goToInputPage() {
  let targetPage = inputPage.value;
  if (!targetPage) return;
  if (targetPage < 1) targetPage = 1;
  if (targetPage > totalPages.value) targetPage = totalPages.value;
  if (targetPage !== page.value) page.value = targetPage;
}

function goToHome() {
  router.push('/');
}

function goToAttacks() {
  router.push('/attacks');
}

function goToIpDetails(ip) {
  router.push({ name: 'IpDetails', params: { ip } });
}

function goToThreatLogDetails(id) {
  router.push({ name: 'ThreatLog', params: { id } });
}

function setIpFilter(ip) {
  if (!filterIp.value) previousPageBeforeIpFilter.value = page.value;
  filterIp.value = ip;
  page.value = 1;
  onFilterChanged();
}

function clearIpFilter() {
  filterIp.value = '';
  if (previousPageBeforeIpFilter.value !== null) {
    page.value = previousPageBeforeIpFilter.value;
    previousPageBeforeIpFilter.value = null;
  }
  onFilterChanged();
}

function clearUrlFilter() {
  filterUrl.value = '';
  onFilterChanged();
}

function setUrlFilter(url) {
  filterUrl.value = url;
  page.value = 1;
  onFilterChanged();
}

function formatDate(date) {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
}

function changePage(newPage) {
  if (newPage >= 1 && newPage <= totalPages.value) {
    page.value = newPage;
  }
}

// Fetch iniziale
fetchData();
</script>

<style scoped src="./ThreatLogs.css"></style>
