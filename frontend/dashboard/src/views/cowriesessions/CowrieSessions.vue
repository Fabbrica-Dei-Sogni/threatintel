<template>
    <div class="cowrie-sessions attacchi cyber-view">
        <div class="header-top cyber-sticky-area cyber-sticky-top-0">
            <h1><span class="animated-icon pulse-jade">📟</span> {{ $t('cowrie.sessions.title') }}</h1>
            <LanguageSwitcher />
        </div>
        <div class="actions cyber-sticky-area cyber-sticky-top-1">
            <div class="nav-actions">
                <button @click="$router.push('/')" class="btn-action">{{ $t('cowrie.sessions.backToDashboard')
                }}</button>
            </div>
            <div class="view-controls">
                <ViewToggle v-model="showMap" :label="$t('common.showMap')" theme="jade" />
                <ViewToggle v-model="showChart" :label="$t('common.showChart')" theme="jade" />
            </div>
        </div>

        <section class="filters-container cyber-sticky-area cyber-sticky-top-2">
            <div class="filter-row main-filters">
                <div class="input-wrapper">
                    <input v-model="filterIp" :placeholder="$t('cowrie.sessions.filterByIp')"
                        class="input" type="text" />
                    <button v-if="filterIp" @click="clearIpFilter" class="clear-btn"
                        :title="$t('cowrie.sessions.clearIpFilter')" type="button"
                        :aria-label="$t('cowrie.sessions.clearIpFilter')">
                        ✕
                    </button>
                </div>
                <CowrieCategorySelector v-model="filterCategory" />
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
                                    class="detail-btn">
                                    {{ $t('cowrie.sessions.table.viewTimeline') }}
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
import { onMounted, watch, ref, computed, nextTick, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import dayjs from 'dayjs';
import { useI18n } from '../../composable/useI18n';
import { useCowrieSessions } from '../../composable/useCowrieSessions';
import { useClipboard } from '../../composable/useClipboard';
import CountryFlag from '../../components/CountryFlag.vue';
import LanguageSwitcher from '../../components/LanguageSwitcher.vue';
import SessionChart from '../../components/SessionChart.vue';
import AttackMap from '../../components/AttackMap.vue';
import CowrieCategorySelector from '../../components/common/CowrieCategorySelector.vue';
import ViewToggle from '../../components/common/ViewToggle.vue';
import { formatDateTime, formatHumanDuration, formatFullDateTime } from '../../utils/dateUtils';

const props = defineProps({
    initialPage: { type: Number, default: 1 },
    initialPageSize: { type: Number, default: 20 },
    initialSortFields: { type: Object, default: () => ({}) },
    initialIp: { type: String, default: '' }
});

const { t } = useI18n();
const { copyToClipboard, copyFormatted } = useClipboard();
const router = useRouter();

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

// Variabile per salvare pagina precedente al filtro IP
const previousPageBeforeIpFilter = ref(null);

import { useViewSettingsStore } from '../../stores/viewSettings';
import { storeToRefs } from 'pinia';
const viewStore = useViewSettingsStore();
const { sessionsShowMap: showMap, sessionsShowChart: showChart } = storeToRefs(viewStore);

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
    props.initialPage,
    props.initialPageSize,
    props.initialSortFields,
    props.initialIp
);

// Sincronizza lo stato iniziale con la query se presente
onMounted(() => {
    const query = router.currentRoute.value.query;
    if (query.category) {
        filterCategory.value = query.category;
    }
});

// Sincronizza l'URL quando cambia lo stato
watch([page, pageSize, sortFields, filterIp, filterCategory], ([newPage, newPageSize, newSort, newIp, newCat]) => {
    router.replace({
        name: 'CowrieSessions',
        query: {
            page: newPage > 1 ? newPage : undefined,
            pageSize: newPageSize !== 20 ? newPageSize : undefined,
            sortFields: newSort ? JSON.stringify(newSort) : undefined,
            ip: newIp || undefined,
            category: newCat || undefined
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
