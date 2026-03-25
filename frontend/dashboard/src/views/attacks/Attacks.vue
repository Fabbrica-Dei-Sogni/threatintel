<template>
    <div class="attacchi">
        <div class="header-top">
            <h1><span class="animated-icon pulse-radar">📡</span> {{ t('attacks.title') }}</h1>
            <LanguageSwitcher />
        </div>
        <!-- Pulsante per tornare alla Home principale -->
        <div class="actions">
            <button @click="goToHome" class="btn-action">
                {{ t('attacks.dashboard') }}
            </button>
            <button @click="goToLogs" class="btn-action">
                {{ t('attacks.logRequests') }}
            </button>
        </div>

        <!-- Filtri Combinati -->
        <section class="filters-container">
            <div class="filter-row main-filters">
                <ProtocolSelector v-model="filterProtocol" :options="['http', 'https', 'ssh']" />
                
                <div class="filter-item min-logs">
                    <label class="min-logs-label" for="minLogsForAttack">{{ t('attacks.minLogsLabel') }}</label>
                    <el-input-number id="minLogsForAttack" v-model="minLogsForAttack" :min="1" :step="1" class="min-logs-input" size="small" @input="onFilterChanged" />
                </div>

                <div class="filter-item search-box">
                    <input type="text" v-model="filterIp" :placeholder="t('attacks.filterByIp')" class="ip-input" @input="onFilterChanged" />
                    <button v-if="filterIp" @click="clearIpFilter" class="clear-btn" :aria-label="t('attacks.clearIpFilter')">×</button>
                </div>
            </div>

            <div class="filter-row secondary-filters">
                <div class="time-filter-group">
                    <label>{{ t('attacks.timeFilter') }}</label>
                    <el-radio-group v-model="timeMode" size="small" @change="onFilterChanged">
                        <el-radio-button label="ago">{{ t('attacks.last') }}</el-radio-button>
                        <el-radio-button label="range">{{ t('attacks.range') }}</el-radio-button>
                    </el-radio-group>

                    <div v-if="timeMode === 'ago'" class="time-ago-wrapper">
                        <el-input-number v-model="agoValue" :min="1" size="small" @input="onFilterChanged" />
                        <el-select v-model="agoUnit" size="small" :placeholder="t('attacks.unit')" @change="onFilterChanged">
                            <el-option :label="t('attacks.minutes')" value="minutes" />
                            <el-option :label="t('attacks.hours')" value="hours" />
                            <el-option :label="t('attacks.days')" value="days" />
                            <el-option :label="t('attacks.months')" value="months" />
                            <el-option :label="t('attacks.years')" value="years" />
                        </el-select>
                    </div>

                    <div v-else class="time-range-wrapper">
                        <el-date-picker v-model="dateRange" type="daterange" :start-placeholder="t('attacks.startDate')"
                            :end-placeholder="t('attacks.endDate')" value-format="YYYY-MM-DD" format="DD/MM/YYYY"
                            @change="onFilterChanged" unlink-panels size="small" :teleported="true" />
                    </div>
                </div>
            </div>
        </section>
        <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
        <div v-if="error" class="error">{{ t('attacks.errorLoadingData') }}</div>

        <div class="pagination cyber-pagination" v-if="total > pageSize">
            <button :disabled="page === 1" @click="changePage(page - 1)">◄ {{ t('common.prev') }}</button>
            <span class="pagination-info">{{ t('common.page') }} {{ page }} {{ t('common.of') }} {{ totalPages }}</span>
            <button :disabled="page === totalPages" @click="changePage(page + 1)">{{ t('common.next') }} ►</button>

            <!-- Input per inserire pagina manualmente -->
            <div class="page-input-container">
                <label for="pageInput">{{ t('common.goToPage') }}:</label>
                <input class="pagination-input" id="pageInput" type="number" v-model.number="inputPage" :min="1"
                    :max="totalPages" placeholder="1" />
            </div>
        </div>
        <section class="chart-controls" style="margin-bottom: 20px;">
            <button class="btn-action" @click="showMap = !showMap">
                {{ showMap ? t('common.hideMap') : t('common.showMap') }}
            </button>
            <button class="btn-action" @click="showChart = !showChart">
                {{ showChart ? t('common.hideChart') : t('common.showChart') }}
            </button>
        </section>

        <section class="map-controls" style="margin-bottom: 20px;">
            <transition name="fade">
                <div v-if="showMap" class="map-section" style="margin-top: 10px;">
                    <AttackMap :attacks="attacks" />
                </div>
            </transition>
        </section>

        <transition name="fade">
            <div v-if="showChart">
                <AttackChart v-if="attacks && attacks.length > 0" :attacks="attacks" />
            </div>
        </transition>

        <!-- Top Scrollbar Sync Wrapper -->
        <div class="top-scrollbar-wrapper" ref="topScrollRef">
            <div class="top-scrollbar-content" :style="{ width: tableWidth + 'px' }"></div>
        </div>

        <section class="log-table" ref="tableScrollRef">
            <table ref="tableRef">
                <thead>
                    <tr>
                        <th>
                            <span class="label">{{ t('attacks.table.countryOrg') }}</span>
                        </th>
                        <th class="sortable-th">
                            <div class="sort-control">
                                <span class="label">{{ t('attacks.table.defcon') }}</span>
                                <button @click="toggleSort('dangerScore')" :aria-label="t('sorting.sortDanger')" class="sort-button">
                                    <span v-if="getSortDirection('dangerScore') === 1">▲</span>
                                    <span v-else-if="getSortDirection('dangerScore') === -1">▼</span>
                                    <span v-else>⇵</span>
                                </button>
                            </div>
                        </th>
                        <th>{{ t('attacks.table.techniques') }}</th>
                        <th>
                            <div class="sort-control">
                                <span class="label">{{ t('attacks.table.attacker') }}</span>
                                <button @click="toggleSort('request.ip')" aria-label="Ordina IP" class="sort-button">
                                    <span v-if="getSortDirection('request.ip') === 1">▲</span>
                                    <span v-else-if="getSortDirection('request.ip') === -1">▼</span>
                                    <span v-else>⇵</span>
                                </button>
                            </div>
                        </th>
                        <th>{{ t('attacks.table.details') }}</th>


                        <!--
                        <th>
                            <div class="org-info">
                    <span class="org-name">{{ attacker.org || t('common.notAvailable') }}</span>
                  </div>
              <button @click="toggleSort('intensityAttack')" aria-label="Ordina Stile"
                                    class="sort-button">
                                    <span v-if="getSortDirection('intensityAttack') === 1">▲</span>
                                    <span v-else-if="getSortDirection('intensityAttack') === -1">▼</span>
                                    <span v-else>⇵</span>
                                </button>
                            </div>
                        </th>
                    -->
                        <!--
                        <th>
                            <div class="sort-control">
                                <span class="label">{{ t('attacks.table.frequency') }}</span>
                                <button @click="toggleSort('rpsStyle')" aria-label="Ordina Frequenza"
                                    class="sort-button">
                                    <span v-if="getSortDirection('rpsStyle') === 1">▲</span>
                                    <span v-else-if="getSortDirection('rpsStyle') === -1">▼</span>
                                    <span v-else>⇵</span>
                                </button>
                            </div>
                        </th>
                    -->
                                    <th class="sortable-th">
                            <div class="sort-control">
                                <span class="label">{{ t('attacks.table.avgScore') }}</span>
                                <button @click="toggleSort('averageScore')" :aria-label="t('sorting.sortAvgScore')" class="sort-button">
                                    <span v-if="getSortDirection('averageScore') === 1">▲</span>
                                    <span v-else-if="getSortDirection('averageScore') === -1">▼</span>
                                    <span v-else>⇵</span>
                                </button>
                            </div>
                        </th>
                        <th class="sortable-th">
                            <div class="sort-control">
                                <span class="label">{{ t('attacks.table.rateBreach') }}</span>
                                <button @click="toggleSort('countRateLimit')" :aria-label="t('sorting.sortRateBreach')" class="sort-button">
                                    <span v-if="getSortDirection('countRateLimit') === 1">▲</span>
                                    <span v-else-if="getSortDirection('countRateLimit') === -1">▼</span>
                                    <span v-else>⇵</span>
                                </button>
                            </div>
                        </th>
                        <th class="sortable-th">
                            <div class="sort-control">
                                <span class="label">{{ t('attacks.table.rps') }}</span>
                                <button @click="toggleSort('rps')" :aria-label="t('sorting.sortRPS')" class="sort-button">
                                    <span v-if="getSortDirection('rps') === 1">▲</span>
                                    <span v-else-if="getSortDirection('rps') === -1">▼</span>
                                    <span v-else>⇵</span>
                                </button>
                            </div>
                        </th>
                        <th class="sortable-th">
                            <div class="sort-control">
                                <span class="label">{{ t('attacks.table.totalLogs') }}</span>
                                <button @click="toggleSort('totaleLogs')" :aria-label="t('sorting.sortTotalLogs')" class="sort-button">
                                    <span v-if="getSortDirection('totaleLogs') === 1">▲</span>
                                    <span v-else-if="getSortDirection('totaleLogs') === -1">▼</span>
                                    <span v-else>⇵</span>
                                </button>
                            </div>
                        </th>
                        <th class="sortable-th">
                            <div class="sort-control">
                                <span class="label">{{ t('attacks.table.attackDuration') }}</span>
                                <button @click="toggleSort('durataAttacco.human')" :aria-label="t('sorting.sortDuration')" class="sort-button">
                                    <span v-if="getSortDirection('durataAttacco.human') === 1">▲</span>
                                    <span v-else-if="getSortDirection('durataAttacco.human') === -1">▼</span>
                                    <span v-else>⇵</span>
                                </button>
                            </div>
                        </th>
                        <th class="sortable-th">
                            <div class="sort-control">
                                <span class="label">{{ t('attacks.table.firstSeen') }}</span>
                                <button @click="toggleSort('firstSeen')" :aria-label="t('sorting.sortFirstSeen')" class="sort-button">
                                    <span v-if="getSortDirection('firstSeen') === 1">▲</span>
                                    <span v-else-if="getSortDirection('firstSeen') === -1">▼</span>
                                    <span v-else>⇵</span>
                                </button>
                            </div>
                        </th>
                        <th class="sortable-th">
                            <div class="sort-control">
                                <span class="label">{{ t('attacks.table.lastSeen') }}</span>
                                <button @click="toggleSort('lastSeen')" :aria-label="t('sorting.sortLastSeen')" class="sort-button">
                                    <span v-if="getSortDirection('lastSeen') === 1">▲</span>
                                    <span v-else-if="getSortDirection('lastSeen') === -1">▼</span>
                                    <span v-else>⇵</span>
                                </button>
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="attack in attacks" :key="attack.id">
                        <td>
                            <div style="display: flex; align-items: center; justify-content: center;">
                                <CountryFlag
                                    :countryCode="attack.ipDetails?.ipinfo?.country" 
                                    :tooltip="attack.ipDetails?.ipinfo ? `${attack.ipDetails.ipinfo.country} - ${attack.ipDetails.ipinfo.org || t('common.notAvailable')}` : t('common.notAvailable')" />
                            </div>
                        </td>

                        <td class="defcon-cell" :title="attack.dangerScore">
                        <td>
                            <DefconIndicator :level="attack.dangerLevel" :dangerScore="attack.dangerScore" />
                        </td>
                        </td>
                        <td class="tecniche-cell">{{ attack.attackPatterns.join(', ') }}</td>
                        <td>
                            <span style="display:inline-flex;align-items:center;">
                                <span class="detail-link" @click="goToIpDetails(attack.request.ip)"
                                    style="cursor:pointer;" :title="t('common.infoIp')">{{ attack.request.ip }}</span>
                                <button @click.stop="copyToClipboard(attack.request.ip)" class="btn-copy-ip"
                                    :title="t('common.copyToClipboard')">📋</button>
                                <button @click.stop="setIpFilter(attack.request.ip)" class="btn-copy-ip"
                                    :title="t('common.copyToFilter')">⬇️</button>
                            </span>
                        </td>
                        <td>
                            <router-link :to="{
                                name: 'AttackDetail',
                                params: { ip: attack.request.ip },
                                query: {
                                    minLogsForAttack: minLogsForAttack,
                                    timeMode: timeMode,
                                    agoValue: agoValue,
                                    agoUnit: agoUnit,
                                    dateRange: dateRange
                                }
                            }" class="detail-link">
                                {{ t('common.detail') }}
                            </router-link>
                        </td>
                        <!--    
                        <td>{{ attack.intensityAttack }}</td>
                        <td>{{ attack.rpsStyle }}</td>
                    -->
                        <td>{{ attack.averageScore }}</td>
                        <td>{{ attack.countRateLimit }}</td>
                        <td>{{ attack.rps }}</td>
                        <td>{{ attack.totaleLogs }}</td>
                        <td>{{ attack.durataAttacco.human }}</td>
                        <td>{{ formatDate(attack.firstSeen) }}</td>
                        <td>{{ formatDate(attack.lastSeen) }}</td>
                    </tr>
                    <tr v-if="attacks.length === 0 && !loading">
                        <td colspan="6" style="text-align:center;">
                            {{ t('attacks.noAttacksFound') }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </section>
    </div>
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
</template>

<script setup>
import { computed, watch, ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import dayjs from 'dayjs';
import { useAttacksFilter } from '../../composable/useAttacksFilter';
import { useClipboard } from '../../composable/useClipboard';
import { useI18n } from 'vue-i18n';

const { copyToClipboard } = useClipboard();
const { t } = useI18n();
import ProtocolSelector from '../../components/common/ProtocolSelector.vue';
import DefconIndicator from '../../components/DefconIndicator.vue';
import CountryFlag from '../../components/CountryFlag.vue';
import AttackChart from '../../components/AttackChart.vue';
import AttackMap from '../../components/AttackMap.vue';
import LanguageSwitcher from '../../components/LanguageSwitcher.vue';




const props = defineProps({
    initialIp: String,
    initialProtocol: { type: String, default: 'http' },
    initialPage: Number,
    initialMinLogsForAttack: Number,
    initTimeMode: String,
    initAgoValue: Number,
    initAgoUnit: String,
    initDateRange: { type: Array, default: () => [null, null] },
    initFromValue: Number,
    initFromUnit: String,
    initToValue: Number,
    initToUnit: String,
    initialSortFields: {
        type: Object,
        default: () => ({}),  // default ordinamento
    }
});

const router = useRouter();


// Variabile per salvare pagina precedente al filtro IP
const previousPageBeforeIpFilter = ref(null);
const showMap = ref(false);
const showChart = ref(true); // Default visible

const {
    attacks,
    filterIp,
    filterProtocol,
    sortFields,
    minLogsForAttack,
    page,
    timeMode,
    agoValue,
    agoUnit,
    dateRange,
    fromValue,
    fromUnit,
    toValue,
    toUnit,
    loading,
    error,
    pageSize,
    total,
    fetchData,
    onFilterChanged,
    toggleSort,
    getSortDirection,
    getSortClass
} = useAttacksFilter(
    props.initialIp,
    props.initialProtocol,
    props.initialPage,
    props.initialMinLogsForAttack,
    props.initTimeMode,
    props.initAgoValue,
    props.initAgoUnit,
    props.initDateRange,
    props.initFromValue,
    props.initFromUnit,
    props.initToValue,
    props.initToUnit,
    props.initialSortFields,
);

const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

// Aggiorna URL query con router.replace al cambiamento dei filtri
// Aggiorna URL query con router.replace al cambiamento dei filtri
watch(
    [filterIp, filterProtocol, minLogsForAttack, timeMode, agoValue, agoUnit, dateRange, fromValue, fromUnit, toValue, toUnit, page, sortFields],
    ([nip, nproto, nmin, ntMode, ngaoVal, ngaoUnit, ndRange, nFromVal, nFromUnit, nToVal, nToUnit, nPage, newSortFields]) => {
        router.replace({
            name: 'Attacks',
            query: {
                ip: nip,
                protocol: nproto !== 'http' ? nproto : undefined,
                page: nPage > 1 ? nPage : undefined,
                minLogsForAttack: nmin !== 2 ? nmin : 10,
                timeMode: ntMode,
                agoValue: ngaoVal,
                agoUnit: ngaoUnit,
                dateRange: ndRange,
                fromValue: nFromVal,
                fromUnit: nFromUnit,
                toValue: nToVal,
                toUnit: nToUnit,
                sortFields: newSortFields ? JSON.stringify(newSortFields) : undefined
            }
        });
    });

const inputPage = ref(page.value);

// Sincronizza inputPage con page esternamente modificato
watch(page, (newPage) => {
    inputPage.value = newPage;
});

// Debounce semplice per evitare troppe chiamate immediate
let debounceTimer = null;
watch(inputPage, (newPage) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        goToInputPage();
    }, 300);
});

// Funzioni per template
function formatDate(timestamp) {
    return dayjs(timestamp).format('DD/MM/YYYY HH:mm:ss');
};

function goToInputPage() {
    let targetPage = inputPage.value;

    // Validazione: assicurati che sia tra 1 e totalPages
    if (targetPage < 1) targetPage = 1;
    if (targetPage > totalPages.value) targetPage = totalPages.value;

    changePage(targetPage);
}

function goToIpDetails(ip) {
    router.push({
        name: 'IpDetails',
        params: { ip },
        query: {
            ip: filterIp.value,
            page: page.value,
            minLogsForAttack: minLogsForAttack.value,
            timeConfig: timeMode.value,
            sortFields: sortFields.value
        },
    });
}

function setIpFilter(ip) {

    // Salva la pagina corrente solo se il filtro IP si applica per la prima volta
    if (!filterIp.value) {
        previousPageBeforeIpFilter.value = page.value;
    }

    filterIp.value = ip;        // Imposta il filtro
    page.value = 1;             // Torna alla pagina 1 se serve
    onFilterChanged();          // Applica il filtro
}

function clearIpFilter() {
    filterIp.value = '';

    // Se c’è una pagina salvata, ripristinala
    if (previousPageBeforeIpFilter.value !== null) {
        page.value = previousPageBeforeIpFilter.value;
        previousPageBeforeIpFilter.value = null;  // reset dopo uso
    }

    onFilterChanged(false);
}

function goToLogs() {
    router.push('/threatlogs');
}

function goToHome() {
    router.push('/');
}

function changePage(newPage) {
    if (newPage >= 1 && newPage <= totalPages.value) {
        page.value = newPage;
    }
}


// Dual Scrollbar Localization Support
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

onMounted(() => {
    if (topScrollRef.value && tableScrollRef.value) {
        topScrollRef.value.addEventListener('scroll', handleTopScroll);
        tableScrollRef.value.addEventListener('scroll', handleTableScroll);
    }
    updateTableWidth();
    
    // Resize periodic check to handle dynamic content
    const interval = setInterval(updateTableWidth, 1000);
    onUnmounted(() => clearInterval(interval));
});

onUnmounted(() => {
    if (topScrollRef.value) topScrollRef.value.removeEventListener('scroll', handleTopScroll);
    if (tableScrollRef.value) tableScrollRef.value.removeEventListener('scroll', handleTableScroll);
});

// Watch data changes (safely at the end)
watch(() => attacks.value, () => {
    setTimeout(updateTableWidth, 200);
}, { deep: true });

// Fetch iniziale
fetchData();
</script>

<style scoped src="./Attacks.css"></style>
