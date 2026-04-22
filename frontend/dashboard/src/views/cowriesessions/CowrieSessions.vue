<template>
    <div class="cowrie-sessions attacchi cyber-view" :class="'skin-' + dashboardSkin">
        <div class="header-top cyber-sticky-area cyber-sticky-top-0">
            <h1><span class="animated-icon pulse-jade">📟</span> {{ $t('cowrie.sessions.title') }}</h1>
            <div class="header-actions">
                <SkinSwitcher />
                <LanguageSwitcher />
            </div>
        </div>
        <div class="actions cyber-sticky-area cyber-sticky-top-1">
            <div class="nav-actions">
                <button @click="$router.push('/')" class="btn-action">{{ $t('cowrie.sessions.backToDashboard')
                }}</button>
            </div>
            <div class="view-controls">
                <ViewToggle v-model="showMap" :label="$t('common.showMap')" theme="jade" />
                <ViewToggle v-model="showChart" :label="$t('common.showChart')" theme="jade" />
                <!-- Reset Button -->
                <button class="reset-btn-mini reset-view-control" @click="handleReset" :title="$t('telemetry.reset_filters')">
                    <div class="reset-ascii">
                        <span></span>
                        <span></span>
                    </div>
                </button>
            </div>
        </div>

        <section class="filters-container cyber-sticky-area cyber-sticky-top-2">
            <div class="filter-row main-filters">
                <div class="filter-item">
                    <span class="cyber-label">CATEGORY</span>
                    <CowrieCategorySelector v-model="filterCategory" />
                </div>
                
                <div class="filter-item search-box">
                    <span class="cyber-label">IP ADDR</span>
                    <div class="ip-input-wrapper">
                        <input v-model="filterIp" :placeholder="$t('cowrie.sessions.filterByIp')"
                            class="input ip-input" type="text" />
                        <button v-if="filterIp" @click="clearIpFilter" class="clear-btn"
                            :title="$t('cowrie.sessions.clearIpFilter')" type="button"
                            :aria-label="$t('cowrie.sessions.clearIpFilter')">
                            ✕
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <!-- Sezione Mappa -->
        <transition name="fade">
            <div v-if="showMap" class="map-section">
                <!-- Mostriamo i dati basandoci sulle sessioni caricate nella tabella -->
                <AttackMap :attacks="mapSessions" :showLegend="false" />
            </div>
        </transition>
        <!-- Sezione Grafico Temporale -->
        <transition name="fade">
            <div v-if="showChart" class="chart-section">
                <!-- Mostriamo i dati basandoci sulle sessioni caricate nella tabella -->
                <SessionChart v-if="sessions && sessions.length > 0" :sessions="sessions" />
            </div>
        </transition>

        <!-- Pagination superiore -->
        <div class="pagination cyber-pagination" v-if="totalPages > 1">
            <button :disabled="page === 1" @click="changePage(page - 1)">◄ {{ $t('common.prev') }}</button>
            <span class="pagination-info cyber-pagination-info">
                {{ $t('common.page') }} {{ page }} {{ $t('common.of') }} {{ totalPages }}
            </span>
            <button :disabled="page === totalPages" @click="changePage(page + 1)">{{ $t('common.next') }} ►</button>

            <!-- Input per inserire pagina manualmente -->
            <div class="cyber-page-input-container">
                <label for="pageInput">{{ $t('common.goToPage') }}:</label>
                <input class="cyber-pagination-input" id="pageInput" type="number" v-model.number="inputPage" :min="1"
                    :max="totalPages" placeholder="1" />
            </div>

        </div>

        <div class="table-status-container cyber-table-status-container">
            <div v-if="loading" class="loading cyber-status-overlay cyber-loading-overlay">{{ $t('common.loading') }}
            </div>
            <div v-if="error" class="error cyber-status-overlay cyber-error-overlay">{{ $t('common.errorLoadingData') }}
            </div>

            <!-- Top Scrollbar Sync Wrapper -->
            <div class="top-scrollbar-wrapper cyber-scrollbar" ref="topScrollRef">
                <div class="top-scrollbar-content" :style="{ width: tableWidth + 'px' }"></div>
            </div>

            <section class="log-table cyber-scrollbar cyber-table-container" ref="tableScrollRef">

                <table ref="tableRef" class="cyber-table">
                    <thead>
                        <tr>
                            <th :data-sessions-tooltip="$t('cowrie.sessions.table.country')">{{ $t('cowrie.sessions.table.short.country') }}</th>
                            <th class="sortable-th" :data-sessions-tooltip="$t('cowrie.sessions.table.ip')">
                                <div class="sort-control">
                                    <span class="label">{{ $t('cowrie.sessions.table.short.ip') }}</span>
                                    <button @click="toggleSort('src_ip')" class="sort-button">
                                        <span v-if="getSortDirection('src_ip') === 1">▲</span>
                                        <span v-else-if="getSortDirection('src_ip') === -1">▼</span>
                                        <span v-else>⇵</span>
                                    </button>
                                </div>
                            </th>
                            <th class="sortable-th" :data-sessions-tooltip="$t('cowrie.sessions.table.startTime')">
                                <div class="sort-control">
                                    <span class="label">{{ $t('cowrie.sessions.table.short.startTime') }}</span>
                                    <button @click="toggleSort('timestamp')" class="sort-button">
                                        <span v-if="getSortDirection('timestamp') === 1">▲</span>
                                        <span v-else-if="getSortDirection('timestamp') === -1">▼</span>
                                        <span v-else>⇵</span>
                                    </button>
                                </div>
                            </th>
                            <th class="sortable-th" :data-sessions-tooltip="$t('cowrie.sessions.table.duration')">
                                <div class="sort-control">
                                    <span class="label">{{ $t('cowrie.sessions.table.short.duration') }}</span>
                                    <button @click="toggleSort('duration')" class="sort-button">
                                        <span v-if="getSortDirection('duration') === 1">▲</span>
                                        <span v-else-if="getSortDirection('duration') === -1">▼</span>
                                        <span v-else>⇵</span>
                                    </button>
                                </div>
                            </th>
                            <th class="sortable-th" :data-sessions-tooltip="$t('cowrie.sessions.table.events')">
                                <template v-if="filterCategory === 'scanner'">
                                    <div class="sort-control">
                                        <span class="label">{{ $t('cowrie.sessions.table.short.occurrences') }}</span>
                                        <button @click="toggleSort('occurrenceCount')" class="sort-button">
                                            <span v-if="getSortDirection('occurrenceCount') === 1">▲</span>
                                            <span v-else-if="getSortDirection('occurrenceCount') === -1">▼</span>
                                            <span v-else>⇵</span>
                                        </button>
                                    </div>
                                </template>
                                <template v-else>
                                    <div class="sort-control">
                                        <span class="label">{{ $t('cowrie.sessions.table.short.events') }}</span>
                                        <button @click="toggleSort('eventCount')" class="sort-button">
                                            <span v-if="getSortDirection('eventCount') === 1">▲</span>
                                            <span v-else-if="getSortDirection('eventCount') === -1">▼</span>
                                            <span v-else>⇵</span>
                                        </button>
                                    </div>
                                </template>
                            </th>
                            <th :data-sessions-tooltip="$t('cowrie.sessions.table.exploration')">{{ $t('cowrie.sessions.table.short.exploration') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="session in sessions" :key="session.session" class="cyber-row">
                            <td>
                                <CountryFlag :countryCode="session.ipDetailsId?.ipinfo?.country"
                                    :tooltip="session.ipDetailsId?.ipinfo ? `${session.ipDetailsId.ipinfo.country} - ${session.ipDetailsId.ipinfo.org || t('common.notAvailable')}` : t('common.notAvailable')"
                                    size="small" />
                            </td>
                            <td class="ip-cell">
                                <span class="ip-container">
                                    <span class="ip-link" @click="goToIpDetails(session.src_ip)"
                                        :title="$t('common.infoIp')">
                                        {{ session.src_ip }}
                                    </span>
                                    <button @click.stop="copyFormatted('clipboard.ip', { ip: session.src_ip })" class="btn-copy-mini"
                                        :title="$t('common.copyToClipboard')">📋</button>
                                    <button @click.stop="setIpFilter(session.src_ip)" class="btn-copy-mini"
                                        :title="$t('common.copyToFilter')">⬇️</button>
                                </span>
                            </td>
                            <td class="time-cell">
                                <div class="time-display">
                                    <span class="time-hour">{{ formatDateTime(session.starttime) }}</span>
                                </div>
                            </td>
                            <td class="duration-cell">{{ formatAggregatedDuration(session) }}</td>
                            <td class="events-cell">
                                <span v-if="session.isAggregated" class="occurrence-badge">
                                    {{ session.occurrenceCount }}
                                </span>
                                <span v-else>
                                    {{ session.eventCount || 0 }}
                                </span>
                            </td>
                            <td>
                                <router-link :to="{ name: 'CowrieAttackDetail', params: { id: session.session } }"
                                    class="detail-btn" :title="$t('cowrie.sessions.table.viewTimeline')">
                                    👁️
                                </router-link>
                            </td>
                        </tr>
                        <tr v-if="sessions.length === 0 && !loading && !error">
                            <td colspan="6" class="empty-state">{{ $t('cowrie.sessions.emptyState') }}</td>
                        </tr>
                    </tbody>
                </table>
            </section>
        </div>

        <div class="pagination cyber-pagination" v-if="totalPages > 1">
            <button :disabled="page === 1" @click="changePage(page - 1)">◄ {{ $t('common.prev') }}</button>
            <span class="pagination-info cyber-pagination-info">
                {{ $t('common.page') }} {{ page }} {{ $t('common.of') }} {{ totalPages }}
            </span>
            <button :disabled="page === totalPages" @click="changePage(page + 1)">{{ $t('common.next') }} ►</button>

            <!-- Input per inserire pagina manualmente -->
            <div class="cyber-page-input-container">
                <label for="pageInput">{{ $t('common.goToPage') }}:</label>
                <input class="cyber-pagination-input" id="pageInput" type="number" v-model.number="inputPage" :min="1"
                    :max="totalPages" placeholder="1" />
            </div>

        </div>
    </div>
</template>

<script setup>
import { onMounted, watch, ref, computed, nextTick, onUnmounted, toRef } from 'vue';
import { useRouter } from 'vue-router';
import dayjs from 'dayjs';
import { useI18n } from '../../composable/useI18n';
import { useCowrieSessions } from '../../composable/useCowrieSessions';
import { useClipboard } from '../../composable/useClipboard';
import CountryFlag from '../../components/CountryFlag.vue';
import LanguageSwitcher from '../../components/LanguageSwitcher.vue';
import SkinSwitcher from '../../components/SkinSwitcher.vue';
import SessionChart from '../../components/SessionChart.vue';
import AttackMap from '../../components/AttackMap.vue';
import CowrieCategorySelector from '../../components/common/CowrieCategorySelector.vue';
import ViewToggle from '../../components/common/ViewToggle.vue';
import { formatDateTime, formatHumanDuration, formatFullDateTime } from '../../utils/dateUtils';

const props = defineProps({
    initialPage: { type: Number, default: 1 },
    initialPageSize: { type: Number, default: 20 },
    initialSortFields: { type: Object, default: () => ({}) },
    initialIp: { type: String, default: '' },
    initialCategory: { type: String, default: 'interaction' }
});

const { t } = useI18n();
const { copyToClipboard, copyFormatted } = useClipboard();
const router = useRouter();

import { useViewSettingsStore } from '../../stores/viewSettings';
import { useCowrieSessionsStore } from '../../stores/cowriesessions';
import { storeToRefs } from 'pinia';
const viewStore = useViewSettingsStore();
const cowrieStore = useCowrieSessionsStore();
const { state: cowrieState } = cowrieStore;

const { dashboardSkin } = storeToRefs(viewStore);
const showMap = toRef(cowrieState.view, 'showMap');
const showChart = toRef(cowrieState.view, 'showChart');
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


// Variabile per salvare pagina precedente al filtro IP
const previousPageBeforeIpFilter = ref(null);

const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1);

// Trasformazione dei dati per il componente AttackMap
// Ora usa le sessioni rettive che cambiano ad ogni cambio di pagina/filtri
const mapSessions = computed(() => {
    return sessions.value.map(s => ({
        id: s._id,
        request: { ip: s.src_ip },
        ipDetails: {
            ipinfo: {
                loc: s.ipDetailsId?.ipinfo?.loc || "0,0",
                city: s.ipDetailsId?.ipinfo?.city || "",
                country: s.ipDetailsId?.ipinfo?.country || ""
            }
        },
        dangerLevel: 2, // Always red for Telnet sessions as requested
        dangerScore: s.isAggregated ? (s.occurrenceCount || 0) : (s.eventCount || 0),
        rps: 0,
        totaleLogs: s.isAggregated ? (s.occurrenceCount || 0) : (s.eventCount || 0)
    }));
});

function toggleChart() {
    showChart.value = !showChart.value;
}

function toggleMap() {
    showMap.value = !showMap.value;
}

// Sincronizzazione Props -> Store (Priorità all'URL)
onMounted(() => {
  if (props.initialIp !== undefined) cowrieState.filters.ip = props.initialIp || '';
  if (props.initialCategory !== undefined) cowrieState.filters.category = props.initialCategory || 'interaction';
  if (props.initialPage !== undefined) cowrieState.pagination.page = props.initialPage || 1;
  if (props.initialPageSize !== undefined) cowrieState.pagination.pageSize = props.initialPageSize || 20;
  if (props.initialSortFields !== undefined) cowrieState.sort.fields = props.initialSortFields || { starttime: -1 };
});

const {
    sessions,
    page,
    pageSize,
    sortFields,
    filterIp,
    filterCategory,
    total,
    loading,
    error,
    fetchData,
    onFilterChanged,
    toggleSort,
    getSortDirection
} = useCowrieSessions(
    toRef(cowrieState.pagination, 'page'),
    toRef(cowrieState.pagination, 'pageSize'),
    toRef(cowrieState.sort, 'fields'),
    toRef(cowrieState.filters, 'ip'),
    toRef(cowrieState.filters, 'category')
);


// Sincronizzazione Prop -> Ref (per back/forward browser)
watch(() => props.initialPage,     (v) => { page.value           = v ?? 1; });
watch(() => props.initialPageSize, (v) => { pageSize.value        = v ?? 20; });
watch(() => props.initialSortFields,(v) => { sortFields.value     = v ?? {}; }, { deep: true });
watch(() => props.initialIp,       (v) => { filterIp.value        = v ?? ''; });
watch(() => props.initialCategory, (v) => { filterCategory.value  = v ?? 'interaction'; });

// Sincronizzazione Ref -> URL query
watch([page, pageSize, sortFields, filterIp, filterCategory], ([newPage, newPageSize, newSort, newIp, newCat]) => {
    router.replace({
        name: 'CowrieSessions',
        query: {
            page: newPage > 1 ? newPage : undefined,
            pageSize: newPageSize !== 20 ? newPageSize : undefined,
            sortFields: newSort && Object.keys(newSort).length > 0 ? JSON.stringify(newSort) : undefined,
            ip: newIp || undefined,
            category: newCat !== 'interaction' ? newCat : undefined
        }
    });
});

function setIpFilter(ip) {
    if (!filterIp.value) {
        previousPageBeforeIpFilter.value = page.value;
    }
    filterIp.value = ip;
}

function clearIpFilter() {
    filterIp.value = '';
    if (previousPageBeforeIpFilter.value !== null) {
        page.value = previousPageBeforeIpFilter.value;
        previousPageBeforeIpFilter.value = null;
    }
}

const changePage = (p) => {
    if (p >= 1 && p <= totalPages.value) {
        page.value = p;
    }
};

const formatAggregatedDuration = (session) => {
    if (session.isAggregated && session.duration !== undefined) {
        return formatHumanDuration(session.duration, t);
    }
    return computeDuration(session.starttime, session.endtime);
};

const goToIpDetails = (ip) => {
    router.push({
        name: 'IpDetails',
        params: { ip },
        query: {
            // Passiamo lo stato per poter tornare indietro (anche se IpDetails usa router.back)
            returnPage: page.value,
            returnLimit: pageSize.value
        }
    });
};

const formatDate = (dateStr) => {
    return formatFullDateTime(dateStr);
};

function computeDuration(start, end) {
    if (!start || !end) return '-';
    const s = dayjs(start);
    const e = dayjs(end);
    const diffSeconds = e.diff(s, 'second');
    return formatHumanDuration(diffSeconds, t);
};

// Sincronizza inputPage con page esternamente modificato (es. bottoni Prev/Next)
const inputPage = ref(page.value);
watch(page, (newPage) => {
    inputPage.value = newPage;
});

// Debounce semplice per evitare troppe chiamate immediate mentre l'utente scrive
let debounceTimer = null;
watch(inputPage, (newPage) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        goToInputPage();
    }, 500);
});

function goToInputPage() {
    let targetPage = inputPage.value;
    if (!targetPage) return;

    // Validazione: assicurati che sia tra 1 e totalPages
    if (targetPage < 1) targetPage = 1;
    if (targetPage > totalPages.value) targetPage = totalPages.value;

    changePage(targetPage);
}

const handleReset = () => {
  cowrieStore.resetToDefaults();
  nextTick(() => {
    fetchData();
  });
};

onMounted(() => {
    if (topScrollRef.value && tableScrollRef.value) {
        topScrollRef.value.addEventListener('scroll', handleTopScroll);
        tableScrollRef.value.addEventListener('scroll', handleTableScroll);
    }
    updateTableWidth();

    // Resize periodic check
    const interval = setInterval(updateTableWidth, 1000);
    onUnmounted(() => clearInterval(interval));
});

onUnmounted(() => {
    if (topScrollRef.value) topScrollRef.value.removeEventListener('scroll', handleTopScroll);
    if (tableScrollRef.value) tableScrollRef.value.removeEventListener('scroll', handleTableScroll);
});

// Watch data changes
watch(() => sessions.value, () => {
    setTimeout(updateTableWidth, 200);
}, { deep: true });
</script>

<style scoped src="./CowrieSessions.css"></style>
<style scoped>
@import "./CowrieSessionsCyber.css";

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

/* Tooltip alignment for view controls */
.reset-view-control[data-noc-tooltip]::after {
    left: auto !important;
    right: calc(100% + 10px) !important;
}

/* === CYBER LABELS === */
.cyber-label {
    font-size: 0.65rem;
    color: var(--theme-primary, var(--neon-jade));
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
    min-width: 220px;
    font-family: 'JetBrains Mono', monospace !important;
}
</style>

