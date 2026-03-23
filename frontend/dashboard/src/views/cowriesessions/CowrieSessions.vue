<template>
    <div class="cowrie-sessions attacchi">
        <div class="header-top">
            <h1><span class="animated-icon pulse-shield">🛡️</span> {{ $t('cowrie.sessions.title') }}</h1>
            <LanguageSwitcher />
        </div>
        <div class="actions chart-actions">
            <button @click="$router.push('/')" class="btn-action">{{ $t('cowrie.sessions.backToDashboard') }}</button>
            <button @click="toggleMap" class="btn-action">
                {{ showMap ? $t('common.hideMap') : $t('common.showMap') }}
            </button>
            <button @click="toggleChart" class="btn-action">
                {{ showChart ? $t('common.hideChart') : $t('common.showChart') }}
            </button>
        </div>

        <section class="filters">
            <div class="input-wrapper">
                <input v-model="filterIp" :placeholder="$t('cowrie.sessions.filterByIp')" @input="onFilterChanged" 
                    class="input" type="text" />
                <button v-if="filterIp" @click="clearIpFilter" class="clear-button"
                    :title="$t('cowrie.sessions.clearIpFilter')" type="button" aria-label="Clear IP filter">
                    ✕
                </button>
            </div>
        </section>

        <!-- Sezione Mappa -->
        <transition name="fade">
            <div v-if="showMap" class="map-section">
                <div v-if="loadingChart" class="loading-mini">{{ $t('common.loading') }}</div>
                <AttackMap v-else :attacks="mapSessions" />
            </div>
        </transition>

        <!-- Sezione Grafico Temporale -->
        <transition name="fade">
            <div v-if="showChart" class="chart-section">
                <div v-if="loadingChart" class="loading-mini">{{ $t('common.loading') }}</div>
                <SessionChart v-else :sessions="chartSessions" />
            </div>
        </transition>

        <div v-if="loading" class="loading">{{ $t('cowrie.sessions.loading') }}</div>
        <div v-if="error" class="error">{{ error }}</div>

        <!-- Pagination superiore -->
        <div class="pagination" v-if="totalPages > 1 && !loading && !error">
            <button :disabled="page === 1" @click="changePage(page - 1)">{{ $t('common.prev') }}</button>
            <span>{{ $t('common.page') }} {{ page }} {{ $t('common.of') }} {{ totalPages }}</span>
            <button :disabled="page === totalPages" @click="changePage(page + 1)">{{ $t('common.next') }}</button>
        </div>

        <section class="log-table" v-if="!loading && !error">
            <table>
                <thead>
                    <tr>
                        <th class="sortable-th">
                            <div class="sort-control">
                                <span class="label">{{ $t('cowrie.sessions.table.ip') }}</span>
                                <button @click="toggleSort('src_ip')" class="sort-button">
                                    <span v-if="getSortDirection('src_ip') === 1">▲</span>
                                    <span v-else-if="getSortDirection('src_ip') === -1">▼</span>
                                    <span v-else>⇵</span>
                                </button>
                            </div>
                        </th>
                        <th>{{ $t('cowrie.sessions.table.country') }}</th>
                        <th class="sortable-th">
                            <div class="sort-control">
                                <span class="label">{{ $t('cowrie.sessions.table.startTime') }}</span>
                                <button @click="toggleSort('timestamp')" class="sort-button">
                                    <span v-if="getSortDirection('timestamp') === 1">▲</span>
                                    <span v-else-if="getSortDirection('timestamp') === -1">▼</span>
                                    <span v-else>⇵</span>
                                </button>
                            </div>
                        </th>
                        <th class="sortable-th">
                            <div class="sort-control">
                                <span class="label">{{ $t('cowrie.sessions.table.duration') }}</span>
                                <button @click="toggleSort('time')" class="sort-button">
                                    <span v-if="getSortDirection('time') === 1">▲</span>
                                    <span v-else-if="getSortDirection('time') === -1">▼</span>
                                    <span v-else>⇵</span>
                                </button>
                            </div>
                        </th>
                        <th class="sortable-th">
                            <div class="sort-control">
                                <span class="label">{{ $t('cowrie.sessions.table.events') }}</span>
                                <button @click="toggleSort('eventCount')" class="sort-button">
                                    <span v-if="getSortDirection('eventCount') === 1">▲</span>
                                    <span v-else-if="getSortDirection('eventCount') === -1">▼</span>
                                    <span v-else>⇵</span>
                                </button>
                            </div>
                        </th>
                        <th>{{ $t('cowrie.sessions.table.exploration') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="session in sessions" :key="session.session" class="cyber-row">
                        <td class="ip-cell">
                            <span class="ip-container">
                                <span class="ip-link" @click="goToIpDetails(session.src_ip)" title="Info IP">
                                    {{ session.src_ip }}
                                </span>
                                <button @click.stop="copyToClipboard(session.src_ip)" class="btn-copy-mini"
                                    :title="$t('common.copyToClipboard')">📋</button>
                                <button @click.stop="setIpFilter(session.src_ip)" class="btn-copy-mini"
                                    :title="$t('common.copyToFilter')">⬇️</button>
                            </span>
                        </td>
                        <td>
                            <CountryFlag v-if="session.ipDetailsId?.ipinfo?.country"
                                :countryCode="session.ipDetailsId.ipinfo.country" />
                            <span v-else class="dimmed">-</span>
                        </td>
                        <td class="time-cell">{{ formatDate(session.starttime) }}</td>
                        <td class="duration-cell">{{ computeDuration(session.starttime, session.endtime) }}</td>
                        <td class="events-cell">
                             {{ session.eventCount || 0 }}
                        </td>
                        <td>
                            <router-link :to="{ name: 'CowrieAttackDetail', params: { id: session.session } }"
                                class="detail-btn">
                                {{ $t('cowrie.sessions.table.viewTimeline') }}
                            </router-link>
                        </td>
                    </tr>
                    <tr v-if="sessions.length === 0">
                        <td colspan="6" class="empty-state">{{ $t('cowrie.sessions.emptyState') }}</td>
                    </tr>
                </tbody>
            </table>
        </section>

        <div class="pagination cyber-pagination" v-if="totalPages > 1">
            <button :disabled="page === 1" @click="changePage(page - 1)">◄ {{ $t('common.prev') }}</button>
            <span class="page-indicator">{{ $t('common.page') }} <span class="highlight">{{ page }}</span> {{
                $t('common.of') }} {{ totalPages }}</span>
            <button :disabled="page === totalPages" @click="changePage(page + 1)">{{ $t('common.next') }} ►</button>
        </div>
    </div>
</template>

<script setup>
import { onMounted, watch, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import dayjs from 'dayjs';
import { useI18n } from '../../composable/useI18n';
import { useCowrieSessions } from '../../composable/useCowrieSessions';
import { useClipboard } from '../../composable/useClipboard';
import { fetchCowrieSessions } from '../../api';
import CountryFlag from '../../components/CountryFlag.vue';
import LanguageSwitcher from '../../components/LanguageSwitcher.vue';
import SessionChart from '../../components/SessionChart.vue';
import AttackMap from '../../components/AttackMap.vue';

const props = defineProps({
    initialPage: { type: Number, default: 1 },
    initialPageSize: { type: Number, default: 20 },
    initialSortFields: { type: Object, default: () => ({ timestamp: -1 }) },
    initialIp: { type: String, default: '' }
});

const { t } = useI18n();
const { copyToClipboard } = useClipboard();
const router = useRouter();

// Variabile per salvare pagina precedente al filtro IP
const previousPageBeforeIpFilter = ref(null);
// Stato per le visualizzazioni
const showChart = ref(true);
const showMap = ref(false);
const chartSessions = ref([]);
const loadingChart = ref(false);

const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1);

// Trasformazione dei dati per il componente AttackMap
const mapSessions = computed(() => {
    return chartSessions.value.map(s => ({
        id: s._id,
        request: { ip: s.src_ip },
        ipDetails: {
            ipinfo: {
                // Leaflet si aspetta 'loc' come stringa "lat,lng"
                loc: s.ipDetailsId?.ipinfo?.loc || "0,0",
                city: s.ipDetailsId?.ipinfo?.city || "",
                country: s.ipDetailsId?.ipinfo?.country || ""
            }
        },
        // Mappiamo l'intensità della sessione su un livello di pericolo fittizio per la colorazione della mappa
        dangerLevel: (s.eventCount || 0) > 20 ? 2 : ((s.eventCount || 0) > 5 ? 3 : 5),
        dangerScore: s.eventCount || 0,
        rps: 0,
        totaleLogs: s.eventCount || 0
    }));
});

async function fetchChartData() {
    if (chartSessions.value.length > 0) return;
    loadingChart.value = true;
    try {
        // Recuperiamo un numero maggiore di sessioni (es. 100) per un grafico/mappa significativo
        const response = await fetchCowrieSessions(1, 100);
        chartSessions.value = response.sessions || [];
    } catch (err) {
        console.error('Errore durante il caricamento dei dati delle visualizzazioni:', err);
    } finally {
        loadingChart.value = false;
    }
}

function toggleChart() {
    showChart.value = !showChart.value;
    if (showChart.value) {
        fetchChartData();
    }
}

function toggleMap() {
    showMap.value = !showMap.value;
    if (showMap.value) {
        fetchChartData();
    }
}

const {
    sessions,
    page,
    pageSize,
    sortFields,
    filterIp,
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

// Sincronizza l'URL quando cambia lo stato
watch([page, pageSize, sortFields, filterIp], ([newPage, newPageSize, newSort, newIp]) => {
    router.replace({
        name: 'CowrieSessions',
        query: {
            page: newPage > 1 ? newPage : undefined,
            pageSize: newPageSize !== 20 ? newPageSize : undefined,
            sortFields: newSort ? JSON.stringify(newSort) : undefined,
            ip: newIp || undefined
        }
    });
});

function setIpFilter(ip) {
    if (!filterIp.value) {
        previousPageBeforeIpFilter.value = page.value;
    }
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

const changePage = (p) => {
    if (p >= 1 && p <= totalPages.value) {
        page.value = p;
    }
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
    if (!dateStr) return '-';
    return dayjs(dateStr).format('DD/MM/YYYY HH:mm:ss');
};

const computeDuration = (start, end) => {
    if (!start || !end) return '-';
    const s = dayjs(start);
    const e = dayjs(end);
    const diff = e.diff(s, 'second');
    return `${diff}s`;
};

onMounted(() => {
    fetchData();
    fetchChartData();
});
</script>

<style scoped src="./CowrieSessions.css"></style>
