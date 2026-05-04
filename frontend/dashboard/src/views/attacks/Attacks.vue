<template>
    <div class="attacchi cyber-view" :class="'skin-' + dashboardSkin">
        <GlobalHeader context="attacks" extraClass="cyber-sticky-area cyber-sticky-top-0">
            <template #title>
                <h1><span class="animated-icon pulse-magma">📡</span> {{ t('attacks.title') }}</h1>
            </template>
        </GlobalHeader>
        <!-- Pulsanti per tornare alla Home principale e View Controls -->
        <div class="actions cyber-sticky-area cyber-sticky-top-1">
            <div class="nav-actions">
                <button @click="goToHome" class="btn-action">
                    {{ t('attacks.dashboard') }}
                </button>
                <button @click="goToLogs" class="btn-action">
                    {{ t('attacks.logRequests') }}
                </button>
                <button @click="goToCampaigns" class="btn-action">
                    {{ t('campaigns.title').toUpperCase() }}
                </button>
            </div>
            <div class="view-controls">
                <div class="toggle-group-vertical">
                    <ViewToggle 
                        v-model="attacksState.view.showMap" 
                        :label="t('common.showMap')" 
                        theme="magma" 
                        compact 
                    />
                    <ViewToggle 
                        v-model="attacksState.view.showChart" 
                        :label="t('common.showChart')" 
                        theme="magma" 
                        compact 
                    />
                </div>
            </div>
        </div>

        <!-- Filtri Combinati -->
        <section class="filters-container cyber-sticky-area cyber-sticky-top-2">
            <div class="filter-row main-filters">
                <div class="filter-item">
                    <span class="cyber-label">PROT</span>
                    <div class="protocol-reset-group">
                        <ProtocolSelector v-model="attacksState.filters.protocol" theme="magma" />
                    </div>
                </div>

                <div class="filter-item">
                    <span class="cyber-label">{{ t('common.status').toUpperCase() }}</span>
                    <div class="protocol-reset-group">
                        <StatusSelector v-model="attacksState.filters.status" theme="magma" />
                        <button class="reset-btn-mini filter-reset-btn" @click="handleReset" :title="t('telemetry.reset_filters')">
                            <div class="reset-ascii">
                                <span></span>
                                <span></span>
                            </div>
                        </button>
                    </div>
                </div>

                <div class="filter-item min-logs">
                    <label class="cyber-label" for="minLogsForAttack">{{ t('attacks.minLogsLabel') }}</label>
                    <el-input-number id="minLogsForAttack" v-model="attacksState.filters.minLogs" :min="1" :step="1"
                        class="min-logs-input" size="small" />
                </div>

                <div class="filter-item search-box">
                    <span class="cyber-label">IP ADDR</span>
                    <div class="ip-input-wrapper">
                        <input type="text" v-model="attacksState.filters.ip" :placeholder="t('attacks.filterByIp')" class="ip-input" />
                        <button v-if="attacksState.filters.ip" @click="attacksState.filters.ip = ''" class="clear-btn">×</button>
                    </div>
                </div>

                <div class="filter-item search-box">
                    <span class="cyber-label">ANOMALY SEARCH</span>
                    <div class="ip-input-wrapper">
                        <input type="text" v-model="attacksState.filters.attackPatterns" placeholder="Search patterns..." class="ip-input" />
                        <button v-if="attacksState.filters.attackPatterns" @click="attacksState.filters.attackPatterns = ''" class="clear-btn">×</button>
                    </div>
                </div>
            </div>

            <div class="filter-row secondary-filters">
                <div class="time-filter-group">
                    <label class="cyber-label">{{ t('attacks.timeFilter') }}</label>
                    <div class="time-controls-row">
                        <el-radio-group v-model="attacksState.filters.timeMode" size="small">
                            <el-radio-button label="ago">{{ t('attacks.last') }}</el-radio-button>
                            <el-radio-button label="range">{{ t('attacks.range') }}</el-radio-button>
                        </el-radio-group>

                        <div v-if="attacksState.filters.timeMode === 'ago'" class="time-ago-wrapper">
                            <el-input-number v-model="attacksState.filters.agoValue" :min="1" size="small" />
                            <el-select v-model="attacksState.filters.agoUnit" size="small" :placeholder="t('attacks.unit')">
                                <el-option :label="t('attacks.minutes')" value="minutes" />
                                <el-option :label="t('attacks.hours')" value="hours" />
                                <el-option :label="t('attacks.days')" value="days" />
                                <el-option :label="t('attacks.months')" value="months" />
                                <el-option :label="t('attacks.years')" value="years" />
                            </el-select>
                        </div>
                        <div v-else class="time-range-wrapper">
                            <el-date-picker v-model="attacksState.filters.dateRange" type="daterange" :start-placeholder="t('attacks.startDate')"
                                :end-placeholder="t('attacks.endDate')" value-format="YYYY-MM-DD" format="DD/MM/YYYY"
                                unlink-panels size="small" :teleported="true" />
                        </div>
                    </div>
                </div>

                <!-- Defcon Filter -->
                <div class="filter-item defcon-filter">
                    <label class="cyber-label">DEFCON</label>
                    <div class="tabs-row">
                        <button 
                            v-for="lvl in [1, 2, 3, 4, 5]" 
                            :key="lvl"
                            class="tab-btn mini-defcon"
                            :class="['defcon-btn-' + lvl, { active: (attacksState.filters.dangerLevels || []).includes(lvl) }]"
                            @click="attacksStore.toggleDangerLevel(lvl)"
                        >
                            {{ lvl }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- View Mode Toggle Row -->
            <div class="filter-row view-mode-row">
                <div class="filter-item">
                    <span class="cyber-label">{{ t('common.view').toUpperCase() }}</span>
                    <div class="view-mode-pill">
                        <button 
                            class="mode-btn" 
                            :class="{ active: attacksState.view.viewMode === 'table' }"
                            @click="attacksState.view.viewMode = 'table'"
                            :title="t('common.view_list')"
                        >
                            ☰
                        </button>
                        <button 
                            class="mode-btn" 
                            :class="{ active: attacksState.view.viewMode === 'grid' }"
                            @click="attacksState.view.viewMode = 'grid'"
                            :title="t('common.view_grid')"
                        >
                            ▤
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <section class="map-controls" style="margin-bottom: 20px;">
            <transition name="fade">
                <div v-if="attacksState.view.showMap" class="map-section" style="margin-top: 10px;">
                    <AttackMap :attacks="attacks" />
                </div>
            </transition>
        </section>

        <transition name="fade">
            <div v-if="attacksState.view.showChart">
                <AttackChart v-if="attacks && attacks.length > 0" :attacks="attacks" />
            </div>
        </transition>

        <div class="pagination-wrapper" v-if="total > 0">
            <CyberPager v-model:page="page" v-model:pageSize="pageSize" :total="total" @change="fetchData" />
        </div>
        
        <div class="table-status-container cyber-table-status-container">
            <div v-if="loading" class="loading cyber-status-overlay cyber-loading-overlay">{{ t('common.loading') }}
            </div>
            <div v-if="error" class="error cyber-status-overlay cyber-error-overlay">{{ t('common.errorLoadingData') }}
            </div>

            <!-- Scanning Line -->
            <div class="scanning-line"></div>

            <!-- Switchable Content: Table vs Grid -->
            <template v-if="attacksState.view.viewMode === 'table'">
                <!-- Top Scrollbar Sync Wrapper -->
                <div class="top-scrollbar-wrapper cyber-scrollbar" ref="topScrollRef">
                    <div class="top-scrollbar-content" :style="{ width: tableWidth + 'px' }"></div>
                </div>

                <section class="log-table cyber-scrollbar cyber-table-container" ref="tableScrollRef">
                    <table ref="tableRef" class="cyber-table">
                        <thead>
                            <tr>
                                <th :data-attacks-tooltip="t('attacks.table.countryOrg')">
                                    <span class="label">{{ t('attacks.table.short.origin') }}</span>
                                </th>
                                <th class="sortable-th" :data-attacks-tooltip="t('attacks.table.defcon')">
                                    <div class="sort-control">
                                        <span class="label">{{ t('attacks.table.short.defcon') }}</span>
                                        <button @click="toggleSort('dangerScore')" :aria-label="t('sorting.sortDanger')"
                                            class="sort-button">
                                            <span v-if="getSortDirection('dangerScore') === 1">▲</span>
                                            <span v-else-if="getSortDirection('dangerScore') === -1">▼</span>
                                            <span v-else>⇵</span>
                                        </button>
                                    </div>
                                </th>
                                <th :data-attacks-tooltip="t('attacks.table.details')">
                                    {{ t('attacks.table.short.info') }}
                                </th>
                                <th :data-attacks-tooltip="t('attacks.table.techniques')">
                                    {{ t('attacks.table.short.tech') }}
                                </th>
                                <th :data-attacks-tooltip="t('attacks.table.attacker')">
                                    <div class="sort-control">
                                        <span class="label">{{ t('attacks.table.short.attacker') }}</span>
                                        <button @click="toggleSort('request.ip')" aria-label="Ordina IP"
                                            class="sort-button">
                                            <span v-if="getSortDirection('request.ip') === 1">▲</span>
                                            <span v-else-if="getSortDirection('request.ip') === -1">▼</span>
                                            <span v-else>⇵</span>
                                        </button>
                                    </div>
                                </th>
                                <th class="sortable-th" :data-attacks-tooltip="t('attacks.table.avgScore')">
                                    <div class="sort-control">
                                        <span class="label">{{ t('attacks.table.short.avg') }}</span>
                                        <button @click="toggleSort('averageScore')" :aria-label="t('sorting.sortAvgScore')"
                                            class="sort-button">
                                            <span v-if="getSortDirection('averageScore') === 1">▲</span>
                                            <span v-else-if="getSortDirection('averageScore') === -1">▼</span>
                                            <span v-else>⇵</span>
                                        </button>
                                    </div>
                                </th>
                                <th class="sortable-th" :data-attacks-tooltip="t('attacks.table.rateBreach')">
                                    <div class="sort-control">
                                        <span class="label">{{ t('attacks.table.short.breach') }}</span>
                                        <button @click="toggleSort('countRateLimit')"
                                            :aria-label="t('sorting.sortRateBreach')" class="sort-button">
                                            <span v-if="getSortDirection('countRateLimit') === 1">▲</span>
                                            <span v-else-if="getSortDirection('countRateLimit') === -1">▼</span>
                                            <span v-else>⇵</span>
                                        </button>
                                    </div>
                                </th>
                                <th class="sortable-th" :data-attacks-tooltip="t('attacks.table.rps')">
                                    <div class="sort-control">
                                        <span class="label">{{ t('attacks.table.short.rps') }}</span>
                                        <button @click="toggleSort('rps')" :aria-label="t('sorting.sortRPS')"
                                            class="sort-button">
                                            <span v-if="getSortDirection('rps') === 1">▲</span>
                                            <span v-else-if="getSortDirection('rps') === -1">▼</span>
                                            <span v-else>⇵</span>
                                        </button>
                                    </div>
                                </th>
                                <th class="sortable-th" :data-attacks-tooltip="t('attacks.table.totalLogs')">
                                    <div class="sort-control">
                                        <span class="label">{{ t('attacks.table.short.logs') }}</span>
                                        <button @click="toggleSort('totaleLogs')" :aria-label="t('sorting.sortTotalLogs')"
                                            class="sort-button">
                                            <span v-if="getSortDirection('totaleLogs') === 1">▲</span>
                                            <span v-else-if="getSortDirection('totaleLogs') === -1">▼</span>
                                            <span v-else>⇵</span>
                                        </button>
                                    </div>
                                </th>
                                <th class="sortable-th" :data-attacks-tooltip="t('attacks.table.attackDuration')">
                                    <div class="sort-control">
                                        <span class="label">{{ t('attacks.table.short.dur') }}</span>
                                        <button @click="toggleSort('durataAttacco.ms')"
                                            :aria-label="t('sorting.sortDuration')" class="sort-button">
                                            <span v-if="getSortDirection('durataAttacco.ms') === 1">▲</span>
                                            <span v-else-if="getSortDirection('durataAttacco.ms') === -1">▼</span>
                                            <span v-else>⇵</span>
                                        </button>
                                    </div>
                                </th>
                                <th class="sortable-th" :data-attacks-tooltip="t('attacks.table.firstSeen')">
                                    <div class="sort-control">
                                        <span class="label">{{ t('attacks.table.short.first') }}</span>
                                        <button @click="toggleSort('firstSeen')" :aria-label="t('sorting.sortFirstSeen')"
                                            class="sort-button">
                                            <span v-if="getSortDirection('firstSeen') === 1">▲</span>
                                            <span v-else-if="getSortDirection('firstSeen') === -1">▼</span>
                                            <span v-else>⇵</span>
                                        </button>
                                    </div>
                                </th>
                                <th class="sortable-th" :data-attacks-tooltip="t('attacks.table.lastSeen')">
                                    <div class="sort-control">
                                        <span class="label">{{ t('attacks.table.short.last') }}</span>
                                        <button @click="toggleSort('lastSeen')" :aria-label="t('sorting.sortLastSeen')"
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
                                    <div style="display: flex; align-items: center; justify-content: center;">
                                        <CountryFlag :countryCode="attack.ipDetails?.ipinfo?.country"
                                            :tooltip="attack.ipDetails?.ipinfo ? `${attack.ipDetails.ipinfo.country} - ${attack.ipDetails.ipinfo.org || t('common.notAvailable')}` : t('common.notAvailable')" />
                                    </div>
                                </td>

                                <td class="defcon-cell" :title="attack.dangerScore">
                                    <DefconIndicator :level="attack.dangerLevel" :dangerScore="attack.dangerScore"
                                        mode="dot" />
                                </td>
                                <td>
                                    <router-link :to="{
                                        name: 'AttackDetail',
                                        params: { ip: attack.request.ip },
                                        query: {
                                            timeMode: attacksState.filters.timeMode,
                                            agoValue: attacksState.filters.agoValue,
                                            agoUnit: attacksState.filters.agoUnit,
                                            minLogsForAttack: attacksState.filters.minLogs,
                                            protocol: attacksState.filters.protocol,
                                            dateRange: attacksState.filters.dateRange && (attacksState.filters.dateRange[0] || attacksState.filters.dateRange[1]) ? JSON.stringify(attacksState.filters.dateRange) : undefined
                                        }
                                    }" class="detail-link">
                                        {{ t('common.detail') }}
                                    </router-link>
                                </td>
                                <td class="tecniche-cell">
                                    <div class="tech-wrapper">
                                        <span v-for="tech in attack.attackPatterns" :key="tech" class="tech-chip">
                                            <span class="tech-name">{{ tech }}</span>
                                            <button @click.stop="copyFormatted('clipboard.attackTechnique', { tech: tech })"
                                                class="btn-copy-mini-tech" :title="t('common.copyToClipboard')">📋</button>
                                        </span>
                                    </div>
                                </td>
                                <td>
                                    <span style="display:inline-flex;align-items:center;">
                                        <span class="detail-link" @click="goToIpDetails(attack.request.ip)"
                                            style="cursor:pointer;" :title="t('common.infoIp')">{{ attack.request.ip
                                            }}</span>
                                        <button @click.stop="copyFormatted('clipboard.ip', { ip: attack.request.ip })"
                                            class="btn-copy-ip" :title="t('common.copyToClipboard')">📋</button>
                                        <button @click.stop="setIpFilter(attack.request.ip)" class="btn-copy-ip"
                                            :title="t('common.copyToFilter')">⬇️</button>
                                    </span>
                                </td>
                                <td>{{ attack.averageScore }}</td>
                                <td>{{ attack.countRateLimit }}</td>
                                <td>{{ attack.rps }}</td>
                                <td>{{ attack.totaleLogs }}</td>
                                <td>{{ getHumanDuration(attack.durataAttacco.ms / 1000) }}</td>
                                <td>
                                    <div class="time-display">
                                        <span class="time-hour">{{ formatDateTime(attack.firstSeen) }}</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="time-display">
                                        <span class="time-hour">{{ formatDateTime(attack.lastSeen) }}</span>
                                    </div>
                                </td>
                            </tr>
                            <tr v-if="attacks.length === 0 && !loading">
                                <td colspan="12" style="text-align:center;">
                                    {{ t('attacks.noAttacksFound') }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </section>
            </template>

            <!-- Grid View -->
            <template v-else>
                <section class="attacks-grid-view cyber-scrollbar">
                    <div v-for="attack in attacks" :key="attack.id" class="attack-card glass-card">
                        <div class="card-header">
                            <div class="origin-info">
                                <CountryFlag :countryCode="attack.ipDetails?.ipinfo?.country" size="small" />
                                <span class="ip-address" @click="goToIpDetails(attack.request.ip)">{{ attack.request.ip }}</span>
                            </div>
                            <DefconIndicator :level="attack.dangerLevel" :dangerScore="attack.dangerScore" mode="dot" />
                        </div>

                        <div class="card-body">
                            <div class="metrics-row">
                                <div class="metric">
                                    <span class="label">{{ t('attacks.table.short.logs') }}</span>
                                    <span class="value">{{ attack.totaleLogs }}</span>
                                </div>
                                <div class="metric">
                                    <span class="label">{{ t('attacks.table.short.avg') }}</span>
                                    <span class="value">{{ attack.averageScore }}</span>
                                </div>
                                <div class="metric">
                                    <span class="label">{{ t('attacks.table.short.rps') }}</span>
                                    <span class="value">{{ attack.rps }}</span>
                                </div>
                            </div>

                            <div class="techniques-area" v-if="attack.attackPatterns?.length">
                                <div class="tech-tags">
                                    <span v-for="tech in attack.attackPatterns" :key="tech" class="tech-tag">
                                        {{ tech }}
                                    </span>
                                </div>
                            </div>

                            <div class="timeline-area">
                                <div class="time-item">
                                    <span class="label">{{ t('attacks.table.short.first') }}:</span>
                                    <span class="value">{{ formatDateTime(attack.firstSeen) }}</span>
                                </div>
                                <div class="time-item">
                                    <span class="label">{{ t('attacks.table.short.dur') }}:</span>
                                    <span class="value">{{ getHumanDuration(attack.durataAttacco.ms / 1000) }}</span>
                                </div>
                            </div>
                        </div>

                        <div class="card-actions">
                            <router-link :to="{
                                name: 'AttackDetail',
                                params: { ip: attack.request.ip },
                                query: {
                                    timeMode: attacksState.filters.timeMode,
                                    agoValue: attacksState.filters.agoValue,
                                    agoUnit: attacksState.filters.agoUnit,
                                    minLogsForAttack: attacksState.filters.minLogs,
                                    dateRange: attacksState.filters.dateRange && (attacksState.filters.dateRange[0] || attacksState.filters.dateRange[1]) ? JSON.stringify(attacksState.filters.dateRange) : undefined
                                }
                            }" class="btn-detail">
                                {{ t('common.detail').toUpperCase() }}
                            </router-link>
                            <div class="mini-tools">
                                <button @click.stop="copyFormatted('clipboard.ip', { ip: attack.request.ip })" :title="t('common.copyToClipboard')">📋</button>
                                <button @click.stop="setIpFilter(attack.request.ip)" :title="t('common.copyToFilter')">⬇️</button>
                            </div>
                        </div>
                    </div>
                    <div v-if="attacks.length === 0 && !loading" class="no-results-grid">
                        {{ t('attacks.noAttacksFound') }}
                    </div>
                </section>
            </template>
        </div>
        <div class="pagination-wrapper" v-if="total > 0">
            <CyberPager v-model:page="page" v-model:pageSize="pageSize" :total="total" @change="fetchData" />
        </div>
    </div>
</template>

<script setup>
import { computed, watch, ref, onMounted, onUnmounted, nextTick, toRef } from 'vue';
import { useRouter } from 'vue-router';
import { useAttacksFilter } from '../../composable/useAttacksFilter';
import { useClipboard } from '../../composable/useClipboard';
import { useI18n } from 'vue-i18n';
import { formatDateTime, formatHumanDuration, formatFullDateTime } from '../../utils/dateUtils';
import { useAttacksStore } from '../../stores/attacks';
import { useViewSettingsStore } from '../../stores/viewSettings';
import { storeToRefs } from 'pinia';

const { copyFormatted } = useClipboard();
const { t } = useI18n();
import ProtocolSelector from '../../components/common/ProtocolSelector.vue';
import StatusSelector from '../../components/common/StatusSelector.vue';
import ViewToggle from '../../components/common/ViewToggle.vue';
import CyberPager from '../../components/common/CyberPager.vue';
import DefconIndicator from '../../components/DefconIndicator.vue';
import CountryFlag from '../../components/CountryFlag.vue';
import AttackChart from '../../components/AttackChart.vue';
import AttackMap from '../../components/AttackMap.vue';
import GlobalHeader from '../../components/GlobalHeader.vue';

const props = defineProps({
    initialIp: String,
    initialProtocol: String,
    initialPage: Number,
    initialMinLogsForAttack: Number,
    initTimeMode: String,
    initAgoValue: Number,
    initAgoUnit: String,
    initDateRange: Array,
    initialSortFields: Object
});

const router = useRouter();
const attacksStore = useAttacksStore();
const { state: attacksState } = attacksStore;
const viewStore = useViewSettingsStore();
const { dashboardSkin } = storeToRefs(viewStore);

// Sincronizzazione Props -> Store (Priorità all'URL)
onMounted(() => {
    if (props.initialIp !== undefined) attacksState.filters.ip = props.initialIp || '';
    if (props.initialProtocol !== undefined) attacksState.filters.protocol = props.initialProtocol || 'http';
    if (props.initialPage !== undefined) attacksState.pagination.page = props.initialPage || 1;
    if (props.initialMinLogsForAttack !== undefined) attacksState.filters.minLogs = props.initialMinLogsForAttack || 10;
    if (props.initTimeMode !== undefined) attacksState.filters.timeMode = props.initTimeMode || 'ago';
    if (props.initAgoValue !== undefined) attacksState.filters.agoValue = props.initAgoValue || 10;
    if (props.initAgoUnit !== undefined) attacksState.filters.agoUnit = props.initAgoUnit || 'days';
    if (props.initDateRange !== undefined) attacksState.filters.dateRange = props.initDateRange || [null, null];
    if (props.initialSortFields !== undefined) attacksState.sort.fields = props.initialSortFields || { firstSeen: -1 };
    if (router.currentRoute.value.query.attackPatterns) {
        attacksState.filters.attackPatterns = router.currentRoute.value.query.attackPatterns;
    }
});

// Watcher per i bottoni browser (Back/Forward)
watch(() => props.initialIp, (v) => { attacksState.filters.ip = v ?? ''; });
watch(() => props.initialProtocol, (v) => { attacksState.filters.protocol = v ?? 'http'; });
watch(() => props.initialPage, (v) => { attacksState.pagination.page = v ?? 1; });
watch(() => props.initialMinLogsForAttack, (v) => { attacksState.filters.minLogs = v ?? 10; });

const {
    attacks,
    loading,
    error,
    pageSize,
    total,
    page,
    sortFields,
    toggleSort,
    getSortDirection,
    fetchData
} = useAttacksFilter(
    toRef(attacksState.filters, 'ip'),
    toRef(attacksState.filters, 'protocol'),
    toRef(attacksState.pagination, 'page'),
    toRef(attacksState.filters, 'minLogs'),
    toRef(attacksState.filters, 'timeMode'),
    toRef(attacksState.filters, 'agoValue'),
    toRef(attacksState.filters, 'agoUnit'),
    toRef(attacksState.filters, 'dateRange'),
    toRef(attacksState.filters, 'fromValue'),
    toRef(attacksState.filters, 'fromUnit'),
    toRef(attacksState.filters, 'toValue'),
    toRef(attacksState.filters, 'toUnit'),
    toRef(attacksState.filters, 'status'),
    toRef(attacksState.sort, 'fields'),
    toRef(attacksState.pagination, 'pageSize'),
    toRef(attacksState.filters, 'dangerLevels'),
    toRef(attacksState.filters, 'attackPatterns')
);

const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

// Sincronizzazione Store -> URL query
watch(
    [
        () => attacksState.filters.ip, 
        () => attacksState.filters.protocol, 
        () => attacksState.filters.minLogs, 
        () => attacksState.filters.timeMode, 
        () => attacksState.filters.agoValue, 
        () => attacksState.filters.agoUnit, 
        () => attacksState.filters.dateRange, 
        () => attacksState.filters.dangerLevels, 
        () => attacksState.filters.status,
        () => attacksState.pagination.page, 
        () => attacksState.sort.fields,
        () => attacksState.filters.attackPatterns
    ],
    ([nip, nproto, nmin, ntMode, nAgoVal, nAgoUnit, ndRange, nDanger, nStatus, nPage, nSort, nPatterns]) => {
        router.replace({
            name: 'Attacks',
            query: {
                ip: nip || undefined,
                protocol: nproto !== 'http' ? nproto : undefined,
                page: nPage > 1 ? nPage : undefined,
                minLogsForAttack: nmin !== 10 ? nmin : undefined,
                timeMode: ntMode !== 'ago' ? ntMode : undefined,
                agoValue: nAgoVal !== 10 ? nAgoVal : undefined,
                agoUnit: nAgoUnit !== 'days' ? nAgoUnit : undefined,
                dateRange: ndRange && (ndRange[0] || ndRange[1]) ? JSON.stringify(ndRange) : undefined,
                dangerLevels: nDanger && nDanger.length > 0 ? nDanger.join(',') : undefined,
                status: nStatus !== 'active' ? nStatus : undefined,
                sortFields: nSort && Object.keys(nSort).length > 0 ? JSON.stringify(nSort) : undefined,
                attackPatterns: nPatterns || undefined
            }
        });
    }, { deep: true });

const handleReset = () => {
    attacksStore.resetToDefaults();
    nextTick(() => {
        fetchData();
    });
};

const inputPage = ref(page.value);
watch(page, (newPage) => { inputPage.value = newPage; });

let debounceTimer = null;
watch(inputPage, (newPage) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        if (newPage >= 1 && (totalPages.value === 0 || newPage <= totalPages.value)) {
            page.value = newPage;
        }
    }, 300);
});

const getHumanDuration = (seconds) => formatHumanDuration(seconds, t);
function formatDate(timestamp) { return formatFullDateTime(timestamp); }

function goToIpDetails(ip) {
    router.push({ name: 'IpDetails', params: { ip } });
}

function setIpFilter(ip) {
    attacksState.filters.ip = ip;
    attacksState.pagination.page = 1;
}

function goToLogs() { router.push('/threatlogs'); }
function goToCampaigns() { router.push('/campaigns'); }
function goToHome() { router.push('/'); }

function changePage(newPage) {
    if (newPage >= 1 && (totalPages.value === 0 || newPage <= totalPages.value)) {
        page.value = newPage;
    }
}

// Dual Scrollbar Logic
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
        if (tableRef.value) tableWidth.value = tableRef.value.scrollWidth;
    });
};

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

watch(() => attacks.value, () => {
    setTimeout(updateTableWidth, 200);
}, { deep: true });
</script>

<style scoped src="./Attacks.css"></style>
<style scoped>
@import "./AttacksCyber.css";

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

/* === FILTERS LAYOUT REFINEMENT === */
.filters-container {
    background: rgba(0, 0, 0, 0.25);
    padding: 20px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 25px;
}

.filter-row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 35px;
}

.filter-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

/* === CYBER LABELS === */
.cyber-label {
    font-size: 0.65rem;
    color: var(--theme-primary, var(--neon-cyan));
    opacity: 0.6;
    font-family: 'JetBrains Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-weight: 700;
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

.time-filter-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.time-controls-row {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(255, 255, 255, 0.03);
    padding: 4px;
    border-radius: 6px;
}

.defcon-filter {
    background: transparent;
    padding: 0;
    border: none;
}

/* Colorazione coerente dei pulsanti Defcon */
.defcon-btn-5.active { background-color: #1e88e5 !important; border-color: #1e88e5 !important; box-shadow: 0 0 10px rgba(30, 136, 229, 0.5); color: #fff; }
.defcon-btn-4.active { background-color: #43a047 !important; border-color: #43a047 !important; box-shadow: 0 0 10px rgba(67, 160, 71, 0.5); color: #fff; }
.defcon-btn-3.active { background-color: #fdd835 !important; border-color: #fdd835 !important; box-shadow: 0 0 10px rgba(253, 216, 53, 0.5); color: #000 !important; }
.defcon-btn-2.active { background-color: #e53935 !important; border-color: #e53935 !important; box-shadow: 0 0 10px rgba(229, 57, 53, 0.5); color: #fff; }
.defcon-btn-1.active { background-color: #ffffff !important; border-color: #ffffff !important; box-shadow: 0 0 15px rgba(255, 255, 255, 0.8); color: #b71c1c !important; }

/* Hover states per Defcon non attivi */
.defcon-btn-5:hover:not(.active) { border-color: #1e88e5; color: #1e88e5; }
.defcon-btn-4:hover:not(.active) { border-color: #43a047; color: #43a047; }
.defcon-btn-3:hover:not(.active) { border-color: #fdd835; color: #fdd835; }
.defcon-btn-2:hover:not(.active) { border-color: #e53935; color: #e53935; }
.defcon-btn-1:hover:not(.active) { border-color: #ffffff; color: #ffffff; }

.mini-defcon {
    min-width: 30px !important;
    height: 30px;
    padding: 0 !important;
    display: flex;
    justify-content: center;
    align-items: center;
    font-weight: 800;
    transition: all 0.3s ease;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    cursor: pointer;
}

/* Tooltip alignment for view controls */
.reset-view-control[data-noc-tooltip]::after {
    left: auto !important;
    right: calc(100% + 10px) !important;
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
  background: linear-gradient(to right, transparent, var(--theme-primary, #ff3366), transparent);
  box-shadow: 0 0 15px var(--theme-primary, #ff3366);
  animation: scan-table 8s linear infinite;
  z-index: 5;
  opacity: 0.15;
  pointer-events: none;
}

@keyframes scan-table {
  0% { top: 0; }
  100% { top: 100%; }
}

/* === MOBILE RESPONSIVENESS === */
@media (max-width: 768px) {
    .filters-container {
        padding: 15px;
        gap: 15px;
    }

    .filter-row {
        flex-direction: column;
        align-items: stretch;
        gap: 15px;
    }

    .filter-item, .time-filter-group {
        width: 100%;
    }

    .time-controls-row {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
        background: transparent;
        padding: 0;
    }

    .ip-input {
        min-width: 100%;
    }

    :deep(.el-range-editor.el-input__inner) {
        width: 100% !important;
    }

    .defcon-filter .tabs-row {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 5px;
    }

    .mini-defcon {
        min-width: unset !important;
        width: 100%;
    }
}
</style>
