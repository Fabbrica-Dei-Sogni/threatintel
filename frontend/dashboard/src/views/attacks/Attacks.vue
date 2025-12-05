<template>
    <div class="attacchi">
        <h1>{{ t('attacks.title') }}</h1>
        <!-- Pulsante per tornare alla Home principale -->
        <div class="actions">
            <button @click="goToHome" class="btn-action">
                {{ t('attacks.dashboard') }}
            </button>
            <button @click="goToLogs" class="btn-action">
                {{ t('attacks.logRequests') }}
            </button>
        </div>

        <!-- Filtro avanzato: Minimo log per attacco -->
        <section class="filter-bar">
            <label class="min-logs-label" for="minLogsForAttack">
                {{ t('attacks.minLogsLabel') }}
            </label>
            <el-input-number id="minLogsForAttack" v-model="minLogsForAttack" :min="1" :step="1" class="min-logs-input"
                size="small" @input="onFilterChanged" />
        </section>

        <section class="time-filter">
            <label>{{ t('attacks.timeFilter') }}</label>

            <!-- Seleziona modalità -->
            <el-radio-group v-model="timeMode" size="small" @change="onFilterChanged">
                <el-radio-button label="ago">{{ t('attacks.last') }}</el-radio-button>
                <el-radio-button label="range">{{ t('attacks.range') }}</el-radio-button>
            </el-radio-group>

            <!-- Solo “Ultimi X” -->
            <div v-if="timeMode === 'ago'" class="time-ago">
                <el-input-number v-model="agoValue" :min="1" size="small" @input="onFilterChanged" />
                <el-select v-model="agoUnit" size="small" :placeholder="t('attacks.unit')" @change="onFilterChanged">
                    <el-option :label="t('attacks.minutes')" value="minutes" />
                    <el-option :label="t('attacks.hours')" value="hours" />
                    <el-option :label="t('attacks.days')" value="days" />
                </el-select>
            </div>

            <!-- Intervallo “From–To” -->
            <div v-else class="time-range">

                <!-- DatePicker intervallo -->
                <!--
                <section class="filter-bar">
                    <label>Seleziona intervallo data:</label>
                    <el-config-provider :locale="it">
                        <el-date-picker v-model="dateRange" type="daterange" start-placeholder="Data inizio"
                            end-placeholder="Data fine" value-format="yyyy-MM-dd" format="MMMM dd, yyyy"
                            popper-class="custom-date-picker" @change="onFilterChanged" unlink-panels
                            style="max-width: 360px;" />
                    </el-config-provider>

                </section>
                
                <span>Da</span>
                <el-input-number v-model="fromValue" :min="1" size="small" @input="onFilterChanged" />
                <el-select v-model="fromUnit" size="small" @change="onFilterChanged">
                    <el-option label="Minuti" value="minutes" />
                    <el-option label="Ore" value="hours" />
                    <el-option label="Giorni" value="days" />
                </el-select>
                <span>a</span>
                <el-input-number v-model="toValue" :min="1" size="small" @input="onFilterChanged" />
                <el-select v-model="toUnit" size="small" @change="onFilterChanged">
                    <el-option label="Minuti" value="minutes" />
                    <el-option label="Ore" value="hours" />
                    <el-option label="Giorni" value="days" />
                </el-select>
                -->

            </div>
        </section>

        <section class="filters">
            <div class="input-wrapper">
                <input v-model="filterIp" :placeholder="t('attacks.filterByIp')" @input="onFilterChanged" class="input"
                    type="text" />
                <button v-if="filterIp" @click="clearIpFilter" class="clear-button" :title="t('attacks.clearIpFilter')"
                    type="button" aria-label="Clear IP filter">
                    ✕
                </button>

            </div>
        </section>
        <div class="pagination" v-if="total > pageSize">
            <button :disabled="page === 1" @click="changePage(page - 1)">{{ t('common.prev') }}</button>
            <span>{{ t('common.page') }} {{ page }} {{ t('common.of') }} {{ totalPages }}</span>
            <button :disabled="page === totalPages" @click="changePage(page + 1)">{{ t('common.next') }}</button>

            <!-- Input per inserire pagina manualmente -->
            <label for="pageInput" style="margin-left: 10px;">{{ t('common.goToPage') }}:</label>
            <input class="pagination-input" id="pageInput" type="number" v-model.number="inputPage" :min="1"
                :max="totalPages" style="width: 60px; padding: 2px 5px;" placeholder="1" />

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

        <section class="log-table">
            <table>
                <thead>
                    <tr>
                        <th>
                            <span class="label">{{ t('attacks.table.countryOrg') }}</span>
                        </th>
                        <th>
                            <div class="sort-control">
                                <span class="label">{{ t('attacks.table.defcon') }}</span>
                                <button @click="toggleSort('dangerScore')" aria-label="Ordina Pericolosità"
                                    class="sort-button">
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
                            <div class="sort-control">
                                <span class="label">{{ t('attacks.table.style') }}</span>
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
                        <th>
                            <div class="sort-control">
                                <span class="label">{{ t('attacks.table.avgScore') }}</span>
                                <button @click="toggleSort('averageScore')" aria-label="Ordina Punteggio medio"
                                    class="sort-button">
                                    <span v-if="getSortDirection('averageScore') === 1">▲</span>
                                    <span v-else-if="getSortDirection('averageScore') === -1">▼</span>
                                    <span v-else>⇵</span>
                                </button>
                            </div>
                        </th>
                        <th>
                            <div class="sort-control">
                                <span class="label">{{ t('attacks.table.rateBreach') }}</span>
                                <button @click="toggleSort('countRateLimit')" aria-label="Ordina Rate breach"
                                    class="sort-button">
                                    <span v-if="getSortDirection('countRateLimit') === 1">▲</span>
                                    <span v-else-if="getSortDirection('countRateLimit') === -1">▼</span>
                                    <span v-else>⇵</span>
                                </button>
                            </div>
                        </th>
                        <th title="Richieste al secondo">
                            <div class="sort-control">
                                <span class="label">{{ t('attacks.table.rps') }}</span>
                                <button @click="toggleSort('rps')" aria-label="Ordina RPS" class="sort-button">
                                    <span v-if="getSortDirection('rps') === 1">▲</span>
                                    <span v-else-if="getSortDirection('rps') === -1">▼</span>
                                    <span v-else>⇵</span>
                                </button>
                            </div>
                        </th>
                        <th>
                            <div class="sort-control">
                                <span class="label">{{ t('attacks.table.totalLogs') }}</span>
                                <button @click="toggleSort('totaleLogs')" aria-label="Ordina Totale Log"
                                    class="sort-button">
                                    <span v-if="getSortDirection('totaleLogs') === 1">▲</span>
                                    <span v-else-if="getSortDirection('totaleLogs') === -1">▼</span>
                                    <span v-else>⇵</span>
                                </button>
                            </div>
                        </th>
                        <th>
                            <div class="sort-control">
                                <span class="label">{{ t('attacks.table.attackDuration') }}</span>
                                <button @click="toggleSort('durataAttacco.human')" aria-label="Ordina Durata Attacco"
                                    class="sort-button">
                                    <span v-if="getSortDirection('durataAttacco.human') === 1">▲</span>
                                    <span v-else-if="getSortDirection('durataAttacco.human') === -1">▼</span>
                                    <span v-else>⇵</span>
                                </button>
                            </div>
                        </th>

                        <th>
                            <div class="sort-control">
                                <span class="label">{{ t('attacks.table.firstSeen') }}</span>
                                <button @click="toggleSort('firstSeen')" aria-label="Ordina Primo avvistamento"
                                    class="sort-button">
                                    <span v-if="getSortDirection('firstSeen') === 1">▲</span>
                                    <span v-else-if="getSortDirection('firstSeen') === -1">▼</span>
                                    <span v-else>⇵</span>
                                </button>
                            </div>
                        </th>
                        <th>
                            <div class="sort-control">
                                <span class="label">{{ t('attacks.table.lastSeen') }}</span>
                                <button @click="toggleSort('lastSeen')" aria-label="Ordina Ultimo avvistamento"
                                    class="sort-button">
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
                            <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                                <CountryFlag v-if="attack.ipDetails.ipinfo.country"
                                    :countryCode="attack.ipDetails.ipinfo.country" />
                                <!--
                                <span>{{ attack.ipDetails.ipinfo.country || '-' }}</span>
                            -->
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
                                    style="cursor:pointer;" title="Info IP">{{ attack.request.ip }}</span>
                                <button @click.stop="copyToClipboard(attack.request.ip)" class="btn-copy-ip"
                                    title="Copia negli appunti">📋</button>
                                <button @click.stop="setIpFilter(attack.request.ip)" class="btn-copy-ip"
                                    title="Copia nel filtro IP ed esegui">⬇️</button>
                            </span>
                        </td>
                        <td>
                            <router-link :to="{
                                name: 'AttackDetail',
                                query: { attack: encodeURIComponent(JSON.stringify(attack)) }
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

            <div class="pagination" v-if="total > pageSize">
                <button :disabled="page === 1" @click="changePage(page - 1)">{{ t('common.prev') }}</button>
                <span>{{ t('common.page') }} {{ page }} {{ t('common.of') }} {{ totalPages }}</span>
                <button :disabled="page === totalPages" @click="changePage(page + 1)">{{ t('common.next') }}</button>

                <!-- Input per inserire pagina manualmente -->
                <label for="pageInput" style="margin-left: 10px;">{{ t('common.goToPage') }}:</label>
                <input class="pagination-input" id="pageInput" type="number" v-model.number="inputPage" :min="1"
                    :max="totalPages" style="width: 60px; padding: 2px 5px;" placeholder="1" />
            </div>

            <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
            <div v-if="error" class="error">{{ t('attacks.errorLoadingData') }}</div>
        </section>
    </div>
</template>

<script setup>
import { computed, watch, ref } from 'vue';
import { useRouter } from 'vue-router';
import dayjs from 'dayjs';
import { useAttacksFilter } from '../../composable/useAttacksFilter';
import { useClipboard } from '../../composable/useClipboard';
import { useI18n } from 'vue-i18n';

const { copyToClipboard } = useClipboard();
const { t } = useI18n();
import DefconIndicator from '../../components/DefconIndicator.vue';
import CountryFlag from '../../components/CountryFlag.vue';
import AttackChart from '../../components/AttackChart.vue';
import AttackMap from '../../components/AttackMap.vue';




const props = defineProps({
    initialIp: String,
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
    getSortDirection
} = useAttacksFilter(
    props.initialIp,
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
watch(
    [filterIp, minLogsForAttack, timeMode, agoValue, agoUnit, dateRange, fromValue, fromUnit, toValue, toUnit, page, sortFields],
    ([nip, nmin, ntMode, ngaoVal, ngaoUnit, ndRange, nFromVal, nFromUnit, nToVal, nToUnit, nPage, newSortFields]) => {
        router.replace({
            name: 'Attacks',
            query: {
                ip: nip,
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

// Fetch iniziale
fetchData();
</script>

<style scoped src="./Attacks.css"></style>
