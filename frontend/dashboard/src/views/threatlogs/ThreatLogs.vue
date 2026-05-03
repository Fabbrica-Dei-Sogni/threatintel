<!--
  ThreatIntel - Reference Implementation Dashboard
  
  This frontend application is provided as a reference implementation of the 
  ThreatIntel Distributed Forensics Engine. 
  
  Copyright (C) 2026 Alessandro Modica. All rights reserved.
  
  Use of this frontend for educational, research, and non-commercial purposes 
  is permitted. Production or commercial use of this specific dashboard 
  interface requires a valid commercial license from the author.
  
  See root LICENSE.md for core engine licensing details.
-->
<template>
  <div class="threatlogs cyber-view" :class="'skin-' + dashboardSkin">
    <GlobalHeader context="threatlogs" extraClass="cyber-sticky-area cyber-sticky-top-0">
      <template #title>
        <h1><span class="animated-icon pulse-log">🗄️</span> {{ t('threatLogs.title') }}</h1>
      </template>
    </GlobalHeader>
    <!-- Pulsante per navigare alla Home -->
    <div class="actions cyber-sticky-area cyber-sticky-top-1">
      <div class="nav-actions">
        <button @click="goToHome" class="btn-action">
          {{ t('threatLogs.dashboard') }}
        </button>
        <button @click="goToAttacks" class="btn-action">
          {{ t('threatLogs.attacks') }}
        </button>
        <button @click="goToCampaigns" class="btn-action">
          {{ t('campaigns.title').toUpperCase() }}
        </button>
      </div>
      <div class="view-controls">
        <ViewToggle v-model="showChart" :label="t('common.showChart')" theme="amber" compact />
      </div>
    </div>

    <section class="filters-container cyber-sticky-area cyber-sticky-top-2">
      <div class="filter-row main-filters">
        <div class="filter-item">
          <span class="cyber-label">PROT</span>
          <div class="protocol-reset-group">
            <ProtocolSelector v-model="filterProtocol" theme="amber" />
            <button class="reset-btn-mini filter-reset-btn" @click="handleReset" :title="t('telemetry.reset_filters')">
              <div class="reset-ascii">
                <span></span>
                <span></span>
              </div>
            </button>
          </div>
        </div>

        <div class="filter-item search-box">
          <span class="cyber-label">IP ADDR</span>
          <div class="ip-input-wrapper">
            <input type="text" v-model="filterIp" :placeholder="t('threatLogs.filterByIp')" class="ip-input" />
            <button v-if="filterIp" @click="clearIpFilter" class="clear-btn" :aria-label="t('threatLogs.clearIpFilter')">
              ×
            </button>
          </div>
        </div>

        <div class="filter-item search-box url-search">
          <span class="cyber-label">URL PATH</span>
          <div class="ip-input-wrapper">
            <input v-model="filterUrl" :placeholder="t('threatLogs.filterByUrl')" class="ip-input" type="text" />
            <button v-if="filterUrl" @click="clearUrlFilter" class="clear-btn" :title="t('threatLogs.clearUrlFilter')"
              type="button" aria-label="Clear URL filter">
              ✕
            </button>
          </div>
        </div>
      </div>
    </section>

    <transition name="fade">
      <div v-if="showChart">
        <ThreadLogChart v-if="logs && logs.length > 0" :logs="logs" />
      </div>
    </transition>

    <div class="pagination-wrapper" v-if="total > 0">
      <CyberPager v-model:page="page" v-model:pageSize="pageSize" :total="total" @change="fetchData" />
    </div>

    <div class="table-status-container cyber-table-status-container">
      <div v-if="loading" class="loading cyber-status-overlay cyber-loading-overlay">{{ t('common.loading') }}</div>
      <div v-if="error" class="error cyber-status-overlay cyber-error-overlay">{{ t('common.errorLoadingData') }}
      </div>

      <!-- Scanning Line -->
      <div class="scanning-line"></div>

      <!-- Top Scrollbar Sync Wrapper -->
      <div class="top-scrollbar-wrapper cyber-scrollbar" ref="topScrollRef">
        <div class="top-scrollbar-content" :style="{ width: tableWidth + 'px' }"></div>
      </div>

      <section class="log-table cyber-scrollbar cyber-table-container" ref="tableScrollRef">

        <table ref="tableRef" class="cyber-table">
          <thead>
            <tr>
              <th :data-logs-tooltip="t('threatLogs.table.countryOrg')">
                <span class="label">{{ t('threatLogs.table.short.origin') }}</span>
              </th>
              <th :data-logs-tooltip="t('threatLogs.table.details')">{{ t('threatLogs.table.short.details') }}</th>
              <th class="sortable-th" :data-logs-tooltip="t('threatLogs.table.ip')">
                <div class="sort-control">
                  <span class="label">{{ t('threatLogs.table.short.ip') }}</span>
                  <button @click="toggleSort('request.ip')" :aria-label="t('sorting.sortIp')" class="sort-button">
                    <span v-if="getSortDirection('request.ip') === 1">▲</span>
                    <span v-else-if="getSortDirection('request.ip') === -1">▼</span>
                    <span v-else>⇵</span>
                  </button>
                </div>
              </th>
              <th class="sortable-th" :data-logs-tooltip="t('threatLogs.table.url')">
                <div class="sort-control">
                  <span class="label">{{ t('threatLogs.table.short.url') }}</span>
                  <button @click="toggleSort('request.url')" :aria-label="t('sorting.sortUrl')" class="sort-button">
                    <span v-if="getSortDirection('request.url') === 1">▲</span>
                    <span v-else-if="getSortDirection('request.url') === -1">▼</span>
                    <span v-else>⇵</span>
                  </button>
                </div>
              </th>
              <th class="sortable-th" :data-logs-tooltip="t('threatLogs.table.dangerScore')">
                <div class="sort-control">
                  <span class="label">{{ t('threatLogs.table.short.dangerScore') }}</span>
                  <button @click="toggleSort('fingerprint.score')" :aria-label="t('sorting.sortScore')"
                    class="sort-button">
                    <span v-if="getSortDirection('fingerprint.score') === 1">▲</span>
                    <span v-else-if="getSortDirection('fingerprint.score') === -1">▼</span>
                    <span v-else>⇵</span>
                  </button>
                </div>
              </th>
              <th class="sortable-th" :data-logs-tooltip="t('threatLogs.table.method')">
                <div class="sort-control">
                  <span class="label">{{ t('threatLogs.table.short.method') }}</span>
                  <button @click="toggleSort('request.method')" :aria-label="t('sorting.sortMethod')"
                    class="sort-button">
                    <span v-if="getSortDirection('request.method') === 1">▲</span>
                    <span v-else-if="getSortDirection('request.method') === -1">▼</span>
                    <span v-else>⇵</span>
                  </button>
                </div>
              </th>
              <th class="sortable-th" :data-logs-tooltip="t('threatLogs.table.timestamp')">
                <div class="sort-control">
                  <span class="label">{{ t('threatLogs.table.short.timestamp') }}</span>
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
                  <button @click.stop="copyFormatted('clipboard.ip', { ip: log.request.ip })" class="btn-copy-ip"
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
                <span v-if="log.metadata?.eventCount > 1" class="event-count-badge">
                  (x{{ log.metadata.eventCount }})
                </span>
              </td>
              <td class="time-cell">
                <div class="time-display">
                  <span class="time-hour">{{ formatDateTime(log.timestamp) }}</span>
                </div>
              </td>
            </tr>
            <tr v-if="logs.length === 0 && !loading">
              <td colspan="7" style="text-align:center;">{{ t('threatLogs.noLogsFound') }}</td>
            </tr>
          </tbody>
        </table>

        <div class="pagination-wrapper" v-if="total > 0">
          <CyberPager v-model:page="page" v-model:pageSize="pageSize" :total="total" @change="fetchData" />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, ref, onMounted, onUnmounted, nextTick, toRef } from 'vue';
import { useRouter } from 'vue-router';
import { useLogsFilter } from '../../composable/useLogsFilter';
import { useClipboard } from '../../composable/useClipboard';
import { useI18n } from 'vue-i18n';
import ProtocolSelector from '../../components/common/ProtocolSelector.vue';
import ViewToggle from '../../components/common/ViewToggle.vue';
import dayjs from 'dayjs';
import CountryFlag from '../../components/CountryFlag.vue';
import CyberPager from '../../components/common/CyberPager.vue';
import ThreadLogChart from '../../components/ThreadLogChart.vue';
import GlobalHeader from '../../components/GlobalHeader.vue';
import { formatDateTime, formatFullDateTime } from '../../utils/dateUtils';

const { t } = useI18n();
const { copyToClipboard, copyFormatted } = useClipboard();
const router = useRouter();

// Props iniziali
const props = defineProps({
  initialIp: String,
  initialUrl: String,
  initialProtocol: String,
  initialPage: Number,
  initialSortFields: Object
});

// State
import { useThreatLogsStore } from '../../stores/threatlogs';

const threatLogsStore = useThreatLogsStore();
const { state: logsState } = threatLogsStore;

// Sincronizzazione Props -> Store (Priorità all'URL)
onMounted(() => {
  if (props.initialIp !== undefined) logsState.filters.ip = props.initialIp || '';
  if (props.initialUrl !== undefined) logsState.filters.url = props.initialUrl || '';
  if (props.initialProtocol !== undefined) logsState.filters.protocol = props.initialProtocol || 'http';
  if (props.initialPage !== undefined) logsState.pagination.page = props.initialPage || 1;
  if (props.initialSortFields !== undefined) logsState.sort.fields = props.initialSortFields || { timestamp: -1 };
});

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
} = useLogsFilter(
  toRef(logsState.filters, 'ip'),
  toRef(logsState.filters, 'url'),
  toRef(logsState.filters, 'protocol'),
  toRef(logsState.pagination, 'page'),
  toRef(logsState.sort, 'fields'),
  toRef(logsState.pagination, 'pageSize')
);

const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1);
const previousPageBeforeIpFilter = ref(null);

import { useViewSettingsStore } from '../../stores/viewSettings';
import { storeToRefs } from 'pinia';
const viewStore = useViewSettingsStore();
const { dashboardSkin } = storeToRefs(viewStore);
const showChart = toRef(logsState.view, 'showChart');
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
});

onUnmounted(() => {
  if (topScrollRef.value) topScrollRef.value.removeEventListener('scroll', handleTopScroll);
  if (tableScrollRef.value) tableScrollRef.value.removeEventListener('scroll', handleTableScroll);
});

// Sincronizzazione Prop -> Ref (per back/forward browser)
watch(() => props.initialIp,         (v) => { filterIp.value       = v ?? ''; });
watch(() => props.initialUrl,        (v) => { filterUrl.value      = v ?? ''; });
watch(() => props.initialProtocol,   (v) => { filterProtocol.value = v ?? 'http'; });
watch(() => props.initialPage,       (v) => { page.value           = v ?? 1; });
watch(() => props.initialSortFields, (v) => { sortFields.value     = v ?? {}; }, { deep: true });

// Sincronizzazione Ref -> URL query
watch([filterIp, filterUrl, filterProtocol, page, sortFields], ([newIp, newUrl, newProto, newPage, newSortFields]) => {
  router.replace({
    name: 'ThreatLogs',
    query: {
      ip: newIp || undefined,
      url: newUrl || undefined,
      protocol: newProto !== 'http' ? newProto : undefined,
      page: newPage > 1 ? newPage : undefined,
      sortFields: newSortFields && Object.keys(newSortFields).length > 0 ? JSON.stringify(newSortFields) : undefined
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

function goToCampaigns() {
  router.push('/campaigns');
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
  return formatFullDateTime(date);
}

function changePage(newPage) {
  if (newPage >= 1 && newPage <= totalPages.value) {
    page.value = newPage;
  }
}

const handleReset = () => {
  threatLogsStore.resetToDefaults();
  nextTick(() => {
    fetchData();
  });
};

// Fetch iniziale rimosso in favore del watcher immediato nel composable
</script>

<style scoped src="./ThreatLogs.css"></style>
<style scoped>
@import "./ThreatLogsCyber.css";

/* Stunning Cyber-Red Reset Button with ASCII Lines */
.reset-btn-mini {
    background: transparent;
    border: 1px solid rgba(255, 51, 102, 0.4);
    color: #ff3366;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    position: relative;
    clip-path: polygon(15% 0%, 100% 0, 100% 85%, 85% 100%, 0 100%, 0% 15%);
    padding: 0;
    overflow: hidden;
}

.reset-ascii {
    display: flex;
    flex-direction: column;
    gap: 3px;
    align-items: center;
    transition: all 0.3s ease;
}

.reset-ascii span {
    display: block;
    width: 12px;
    height: 2px;
    background: #ff3366;
    box-shadow: 0 0 5px rgba(255, 51, 102, 0.6);
    transition: all 0.3s ease;
}

.reset-ascii span:nth-child(1) { transform: translateX(-3px); }
.reset-ascii span:nth-child(2) { transform: translateX(3px); }

.reset-btn-mini:hover {
    background: rgba(255, 51, 102, 0.1);
    border-color: #ff3366;
    box-shadow: 0 0 15px rgba(255, 51, 102, 0.4);
}

.reset-btn-mini:hover .reset-ascii { transform: rotate(180deg); }

.reset-btn-mini:hover .reset-ascii span {
    transform: translateX(0);
    background: #fff;
    box-shadow: 0 0 10px #fff;
    width: 14px;
}

.reset-btn-mini:active {
    transform: scale(0.8);
    background: #ff3366;
}

.view-controls {
    display: flex;
    align-items: center;
    gap: 15px;
}

.reset-view-control {
    margin-left: 15px;
}

.protocol-reset-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.filter-reset-btn {
    margin-left: 4px;
}

/* Tooltip alignment for view controls */
.reset-view-control[data-noc-tooltip]::after {
    left: auto !important;
    right: calc(100% + 10px) !important;
}

/* === CYBER LABELS === */
.cyber-label {
    font-size: 0.65rem;
    color: var(--theme-primary, #ffb300);
    opacity: 0.6;
    font-family: 'JetBrains Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-weight: 700;
    white-space: nowrap;
}

.filter-item {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 15px;
}

.ip-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.ip-input {
    font-family: 'JetBrains Mono', monospace !important;
}

/* Scanning Line Animation */
.cyber-table-status-container {
    position: relative;
    overflow: hidden;
}

.scanning-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(to right, transparent, var(--theme-primary, #ffb300), transparent);
  box-shadow: 0 0 15px var(--theme-primary, #ffb300);
  animation: scan-table 8s linear infinite;
  z-index: 5;
  opacity: 0.15;
  pointer-events: none;
}

@keyframes scan-table {
  0% { top: 0; }
  100% { top: 100%; }
}
</style>

