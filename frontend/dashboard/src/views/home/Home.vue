<template>
  <div class="dashboard" :class="'skin-' + currentSkin">
    <ConfigMenuButton />
    <div class="header-top">
      <div class="header-main-title">
        <h1>
          {{ t('home.title').toUpperCase() }}
        </h1>
      </div>

      <div class="header-actions">
        <SkinSwitcher />
        <LanguageSwitcher />
      </div>
    </div>

    <!-- Breaking News Row -->
    <div class="breaking-news-row" v-if="showTicker">
      <BreakingNews 
        mode="ticker" 
        :attacks="recentAttacks" 
        :sessions="recentSessions" 
        :logs="recentLogs"
        :isVisible="showTicker" />
    </div>

    <section class="intel-center">
            <section class="actions">
              <button @click="dashboardStore.toggleWidget('telemetries')" :class="{ active: dashboardStore.isWidgetActive('telemetries') }" class="btn-action">📊 {{ t('home.telemetries').toUpperCase() }}</button>
              <button @click="dashboardStore.toggleWidget('attacks')" :class="{ active: dashboardStore.isWidgetActive('attacks') }" class="btn-action">🛰️ {{ t('home.attacks').toUpperCase() }}</button>
              <button @click="dashboardStore.toggleWidget('logs')" :class="{ active: dashboardStore.isWidgetActive('logs') }" class="btn-action">🗄️ {{ t('home.logRequests').toUpperCase() }}</button>
              <button @click="dashboardStore.toggleWidget('sessions')" :class="{ active: dashboardStore.isWidgetActive('sessions') }" class="btn-action">📟 {{ t('home.telnet').toUpperCase() }}</button>
              <button @click="dashboardStore.toggleWidget('dossiers')" :class="{ active: dashboardStore.isWidgetActive('dossiers') }" class="btn-action">📁 {{ t('home.archive').toUpperCase() }}</button>
            </section>

            <transition-group name="widget-dynamic" tag="div" class="widgets-container">
              <div v-for="widget in dashboardState.activeWidgets" :key="widget" class="widget-item">
                <!-- TELEMETRIES -->
                <div v-if="widget === 'telemetries'" class="telemetry-wrapper">
                  <TelemetryStats />
                </div>

                <!-- ATTACKS -->
                <div v-if="widget === 'attacks'" class="intel-ranking-container">
                  <IntelRanking
                    :title="$t('home.recentAttacks')"
                    :items="recentAttacks"
                    :loading="loadingAttacks"
                    :error="errorAttacks"
                    v-model:page="dashboardState.rankings.attackPage"
                    :pageSize="10"
                    :total="attackTotal"
                    itemStyle="anomalies-ranking"
                  >
                    <template #header-actions>
                      <ProtocolSelector v-model="dashboardState.rankings.attackProtocol" :options="['http', 'https', 'ssh']" theme="dark" />
                      <button class="reset-btn-mini" @click="dashboardStore.resetAttacks" :title="t('telemetry.reset_filters')">
                        <div class="reset-ascii">
                           <span></span>
                           <span></span>
                        </div>
                      </button>
                    </template>

                    <template #filters>
                      <div class="filters-row">
                        <!-- Time Range -->
                        <div class="filter-item">
                          <span class="filter-label">{{ t('telemetry.filter_label') }}: <span class="active-val">{{ dashboardState.rankings.attackTimeValue === null ? t('common.all').toUpperCase() : (dashboardState.rankings.attackTimeValue + (dashboardState.rankings.attackTimeUnit === 'days' ? 'D' : 'H')) }}</span></span>
                          <div class="tabs-row log-threshold-tabs">
                            <button 
                              v-for="opt in [
                                {v:10, u:'days', l:'10D'}, 
                                {v:30, u:'days', l:'1M'}, 
                                {v:90, u:'days', l:'3M'},
                                {v:180, u:'days', l:'6M'},
                                {v:365, u:'days', l:'1Y'},
                                {v:null, u:null, l:'ALL'}
                              ]" 
                              :key="opt.l"
                              class="tab-btn"
                              :class="{ active: dashboardState.rankings.attackTimeValue === opt.v && (opt.v === null || dashboardState.rankings.attackTimeUnit === opt.u) }"
                              @click="dashboardState.rankings.attackTimeValue = opt.v; dashboardState.rankings.attackTimeUnit = opt.u"
                            >
                              {{ opt.v === null ? t('common.all').toUpperCase() : opt.l }}
                            </button>
                          </div>
                        </div>

                        <!-- Log Threshold Only -->
                        <div class="filter-item">
                          <span class="filter-label">{{ t('telemetry.filter_log_threshold_label') }}: <span class="active-val">{{ dashboardState.rankings.attackMinLogs }}</span></span>
                          <div class="tabs-row log-threshold-tabs">
                            <button 
                              v-for="val in [3, 5, 10, 20, 40, 50]" 
                              :key="val"
                              class="tab-btn"
                              :class="{ active: dashboardState.rankings.attackMinLogs === val }"
                              @click="dashboardState.rankings.attackMinLogs = val"
                            >
                              {{ val }}
                            </button>
                          </div>
                        </div>

                        <!-- Defcon Level (Multi-select) -->
                        <div class="filter-item">
                          <span class="filter-label">{{ t('telemetry.filter_defcon_label') }}: <span class="active-val">{{ (dashboardState.rankings.dangerLevels || []).length === 0 ? t('common.all').toUpperCase() : [...(dashboardState.rankings.dangerLevels || [])].sort().join(',') }}</span></span>
                          <div class="tabs-row log-threshold-tabs">
                            <button 
                              v-for="lvl in [1, 2, 3, 4, 5]" 
                              :key="lvl"
                              class="tab-btn"
                              :class="['defcon-btn-' + lvl, { active: (dashboardState.rankings.dangerLevels || []).includes(lvl) }]"
                              @click="dashboardStore.toggleDefconLevel(lvl)"
                            >
                              {{ lvl }}
                            </button>
                          </div>
                        </div>
                      </div>
                    </template>

                    <template #title-meta>
                      <div class="ranking-header-actions">
                        <button class="btn-ranking-action" @click="goToAttacks(false)">
                          {{ t('common.more_info') }}
                        </button>
                        <button class="sync-btn-header" @click="goToAttacks(true)" :title="t('common.syncFilters')">
                          🔍
                        </button>
                      </div>
                    </template>

                    <template #item="{ item }">
                      <!-- Origin Col -->
                        <div class="item-col item-col-origin">
                          <div class="indicator-group"
                            :data-noc-tooltip="`URI: ${item.request?.url || 'N/A'}\nDATE: ${formatDate(item.firstSeen)}`">
                            <CountryFlag :countryCode="item.ipDetails?.ipinfo?.country"
                              :tooltip="item.ipDetails?.ipinfo ? `${item.ipDetails.ipinfo.country} - ${item.ipDetails.ipinfo.org || t('common.notAvailable')}` : t('common.notAvailable')" />
                            <DefconIndicator :level="item.dangerLevel" :dangerScore="item.dangerScore" mode="dot" />
                            <router-link 
                              :to="{ 
                                name: 'AttackDetail', 
                                params: { ip: item.request.ip },
                                query: {
                                  timeMode: 'ago',
                                  agoValue: dashboardState.rankings.attackTimeValue,
                                  agoUnit: dashboardState.rankings.attackTimeUnit,
                                  minLogsForAttack: dashboardState.rankings.attackMinLogs
                                }
                              }" 
                              class="intel-det-btn"
                              :data-noc-tooltip="t('common.detail')"
                            >
                              DET
                            </router-link>
                            <button 
                              class="intel-det-btn sync-btn-mini" 
                              @click="syncSingleAttackToSearch(item)"
                              :data-noc-tooltip="t('common.syncFilters')"
                            >
                              🔍
                            </button>
                          </div>
                        </div>

                        <!-- Subject Col -->
                        <div class="item-col item-col-subject">
                          <span @click="goToIpDetails(item.request.ip)" class="ip-link">{{ item.request.ip }}</span>
                        </div>
                        
                        <!-- Forensics Col -->
                        <div class="item-col item-col-forensics">
                          <div class="time-row" :data-noc-tooltip="$t('attacks.table.firstSeen')">
                            <span class="date-part">{{ formatDateOnly(item.firstSeen) }}</span>
                            <span class="time-part">{{ formatTimeOnly(item.firstSeen) }}</span>
                          </div>
                          <span class="duration-badge" v-if="item.lastSeen && item.lastSeen !== item.firstSeen">
                            ({{ computeDuration(item.firstSeen, item.lastSeen) }})
                          </span>
                        </div>

                        <!-- Metrics Col -->
                        <div class="item-col item-col-metrics">
                          <div class="activity-badge">
                            <div class="badge-content" :class="{ 'high-interaction': (item.totaleLogs || 0) > 50 }" :data-noc-tooltip="$t('attacks.table.totalLogs')">
                              <span class="badge-icon">📋</span>
                              <span class="badge-value">{{ item.totaleLogs || 0 }}</span>
                            </div>
                          </div>
                        </div>
                      </template>
                  </IntelRanking>
                </div>

                <!-- LOGS -->
                <div v-if="widget === 'logs'" class="secondary-intel">
                  <div class="widget">
                    <IntelRanking
                      :title="$t('home.recentLogs')"
                      :items="recentLogs"
                      :loading="loadingLogs"
                      :error="errorLogs"
                      v-model:page="dashboardState.rankings.logPage"
                      :pageSize="10"
                      :total="logTotal"
                      itemStyle="logs-ranking"
                    >
                      <template #header-actions>
                        <ProtocolSelector v-model="dashboardState.rankings.logProtocol" :options="['http', 'https', 'ssh']" theme="dark" />
                        <button class="reset-btn-mini" @click="dashboardStore.resetLogs" :title="t('telemetry.reset_filters')">
                            <div class="reset-ascii">
                               <span></span>
                               <span></span>
                            </div>
                        </button>
                      </template>

                      <template #title-meta>
                        <button class="btn-ranking-action" @click="goToLogs">
                          {{ t('common.more_info') }}
                        </button>
                      </template>

                      <template #item="{ item }">
                        <!-- Origin Col -->
                        <div class="item-col item-col-origin">
                          <div class="indicator-group"
                            :data-noc-tooltip="`URI: ${item.request?.url || 'N/A'}\nDATE: ${formatDate(item.timestamp)}`">
                            <CountryFlag :countryCode="item.ipDetailsId?.ipinfo?.country"
                              :tooltip="item.ipDetailsId?.ipinfo ? `${item.ipDetailsId.ipinfo.country} - ${item.ipDetailsId.ipinfo.org || t('common.notAvailable')}` : t('common.notAvailable')" />
                            <router-link 
                              v-if="item.id || item._id"
                              :to="{ name: 'ThreatLog', params: { id: String(item.id || item._id) } }" 
                              class="intel-det-btn"
                              :data-noc-tooltip="t('common.detail')"
                            >
                              DET
                            </router-link>
                          </div>
                        </div>

                        <!-- Subject Col -->
                        <div class="item-col item-col-subject">
                          <span @click="goToIpDetails(item.request.ip)" class="ip-link">{{ item.request.ip }}</span>
                        </div>
                        
                        <!-- Forensics Col -->
                        <div class="item-col item-col-forensics">
                          <div class="time-row">
                            <span class="date-part">{{ formatDateOnly(item.timestamp) }}</span>
                            <span class="time-part">{{ formatTimeOnly(item.timestamp) }}</span>
                          </div>
                        </div>

                        <!-- Metrics Col -->
                        <div class="item-col item-col-metrics">
                          <div class="activity-badge">
                            <div class="badge-content" :data-noc-tooltip="$t('threatLog.method')">
                              <span class="badge-icon">🌐</span>
                              <span class="badge-value">{{ item.request.method }}</span>
                            </div>
                          </div>
                        </div>
                      </template>
                    </IntelRanking>
                  </div>
                </div>

                <!-- SESSIONS -->
                <div v-if="widget === 'sessions'" class="intel-ranking-container">
                  <IntelRanking
                    :title="$t('home.recentSessions')"
                    :items="recentSessions"
                    :loading="loadingSessions"
                    :error="errorSessions"
                    v-model:page="dashboardState.rankings.sessionPage"
                    :pageSize="10"
                    :total="sessionTotal"
                    itemStyle="sessions-ranking"
                  >
                    <template #header-actions>
                      <CowrieCategorySelector v-model="dashboardState.rankings.sessionCategory" size="mini" />
                      <button class="reset-btn-mini" @click="dashboardStore.resetSessions" :title="t('telemetry.reset_filters')">
                        <div class="reset-ascii">
                           <span></span>
                           <span></span>
                        </div>
                      </button>
                    </template>

                    <template #title-meta>
                      <button class="btn-ranking-action" @click="goToTelnet">
                        {{ t('common.more_info') }}
                      </button>
                    </template>

                    <template #item="{ item }">
                        <!-- Origin Col -->
                        <div class="item-col item-col-origin">
                          <div class="indicator-group"
                            :data-noc-tooltip="`PROTOCOL: ${item.protocol || 'N/A'}\nDATE: ${formatDate(item.starttime)}`">
                            <CountryFlag :countryCode="item.ipDetailsId?.ipinfo?.country"
                              :tooltip="item.ipDetailsId?.ipinfo ? `${item.ipDetailsId.ipinfo.country} - ${item.ipDetailsId.ipinfo.org || t('common.notAvailable')}` : t('common.notAvailable')" />
                            <router-link 
                              v-if="item.session || item.id || item._id"
                              :to="{ name: 'CowrieAttackDetail', params: { id: String(item.session || item.id || item._id) } }" 
                              class="intel-det-btn"
                              :data-noc-tooltip="t('common.detail')"
                            >
                              DET
                            </router-link>
                          </div>
                        </div>

                        <!-- Subject Col -->
                        <div class="item-col item-col-subject">
                          <span @click="goToIpDetails(item.src_ip)" class="ip-link">{{ item.src_ip }}</span>
                        </div>
                        
                        <!-- Forensics Col -->
                        <div class="item-col item-col-forensics">
                          <div class="time-row" :data-noc-tooltip="$t('attacks.table.firstSeen')">
                            <span class="date-part">{{ formatDateOnly(item.starttime) }}</span>
                            <span class="time-part">{{ formatTimeOnly(item.starttime) }}</span>
                          </div>
                          <span class="duration-badge" v-if="item.endtime || item.isAggregated">
                            ({{ formatAggregatedDurationHome(item) }})
                          </span>
                        </div>

                        <!-- Metrics Col -->
                        <div class="item-col item-col-metrics">
                          <div class="activity-badge">
                            <!-- Aggregated Scanner occurrences -->
                            <div v-if="item.isAggregated" class="badge-content occurrence" :data-noc-tooltip="$t('cowrie.sessions.table.occurrences')">
                              <span class="badge-icon">🔢</span>
                              <span class="badge-value">{{ item.occurrenceCount }}</span>
                            </div>
                            <!-- Standard interaction events -->
                            <div v-else class="badge-content" :class="{ 'high-interaction': (item.eventCount || 0) > 10 }" :data-noc-tooltip="$t('sessionChart.activity')">
                              <span class="badge-icon">⚡</span>
                              <span class="badge-value">{{ item.eventCount || 0 }}</span>
                            </div>
                          </div>
                        </div>
                      </template>
                  </IntelRanking>
                </div>

                <!-- DOSSIERS -->
                <div v-if="widget === 'dossiers'" class="primary-intel">
                  <div class="list-side glass-card full-width-widget dossier-ranking">
                    <div class="scanning-line"></div>
                    <div class="widget-header">
                      <div class="title-content">
                        <h3>{{ $t('home.recentDossiers').toUpperCase() }}</h3>
                        <div class="title-meta">
                          <div class="ranking-header-actions">
                            <button class="btn-ranking-action" @click="goToArchive">
                              {{ t('common.more_info') }}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Authenticated View -->
                    <ul v-if="authStore.isAuthenticated" class="scroll-list">
                      <li v-for="dossier in recentDossiers" :key="dossier._id" class="dossier-item">
                        <div class="indicator-group" :data-noc-tooltip="`Dossier: ${dossier.title}\nID: ${dossier._id}`">
                            <span class="status-dot-mini" :class="dossier.status.toLowerCase()"></span>
                        </div>
                        <span class="dossier-title-link" @click="router.push(`/dossiers/${dossier._id}`)">{{ dossier.title }}</span>
                        <div class="column-spacer"></div>
                        <div class="dossier-info">
                            <span class="badge-mini">{{ dossier.sections?.length || 0 }} {{ t('common.sections') }}</span>
                            <span class="timestamp-mini">{{ formatDateTime(dossier.createdAt) }}</span>
                        </div>
                      </li>
                    </ul>

                    <!-- Restricted View (Anonymous) -->
                    <RestrictedIntelligenceGate v-else />
                    <div v-if="loadingDossiers" class="loading">{{ $t('home.loadingDossiers') }}</div>
                    <div v-if="errorDossiers" class="error">{{ $t('home.errorLoadingDossiers') }}</div>
                  </div>
                </div>
              </div>
            </transition-group>

            <!-- Screensaver empty state -->
            <transition name="fade">
              <div v-if="dashboardState.activeWidgets.length === 0" class="screensaver-wrapper">
                <CyberScreensaver />
              </div>
            </transition>
    </section>

  </div>
</template>

<script setup>
// Import composable customizzati
import { useLogsFilter } from '../../composable/useLogsFilter';
import { useAttacksFilter } from '../../composable/useAttacksFilter';
import { useCowrieSessions } from '../../composable/useCowrieSessions';
import { useRouter } from 'vue-router'
import { computed, onMounted, watch, ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchDossiers } from '../../api';
import { useDossierStore } from '../../stores/dossier';
import { useAuthStore } from '../../stores/auth';
import dayjs from 'dayjs';
import LanguageSwitcher from '../../components/LanguageSwitcher.vue';
import CountryFlag from '../../components/CountryFlag.vue';
import BreakingNews from '../../components/BreakingNews.vue';
import SkinSwitcher from '../../components/SkinSwitcher.vue';
import ConfigMenuButton from '../../components/ConfigMenuButton.vue';
import ProtocolSelector from '../../components/common/ProtocolSelector.vue';
import DefconIndicator from '../../components/DefconIndicator.vue';
import TelemetryStats from '../../components/TelemetryStats.vue';
import RestrictedIntelligenceGate from '../../components/common/RestrictedIntelligenceGate.vue';
import CowrieCategorySelector from '../../components/common/CowrieCategorySelector.vue';
import IntelRanking from '../../components/common/IntelRanking.vue';
import CyberScreensaver from '../../components/CyberScreensaver.vue';
import { formatDateTime, formatDateOnly, formatTimeOnly, formatHumanDuration, formatFullDateTime } from '../../utils/dateUtils';

const { t } = useI18n();

import { useDashboardStore } from '../../stores/dashboard';
import { useViewSettingsStore } from '../../stores/viewSettings';
import { storeToRefs } from 'pinia';

import { useAttacksStore } from '../../stores/attacks';

const attacksStore = useAttacksStore();
const dashboardStore = useDashboardStore();
const viewStore = useViewSettingsStore();
const { state: dashboardState } = dashboardStore;
const { dashboardSkin: currentSkin } = storeToRefs(viewStore);

const showTicker = ref(true);

// Navigazione
const router = useRouter()
function goToAttacks(sync = false) {
  if (sync) {
    // Sincronizzazione filtri verso AttacksStore
    attacksStore.state.filters.protocol = dashboardState.rankings.attackProtocol;
    
    // Gestione Timeframe: Se ALL (null), impostiamo un valore molto alto per coprire tutto
    if (dashboardState.rankings.attackTimeValue === null) {
      attacksStore.state.filters.timeMode = 'ago';
      attacksStore.state.filters.agoValue = 10;
      attacksStore.state.filters.agoUnit = 'years';
    } else {
      attacksStore.state.filters.timeMode = 'ago';
      attacksStore.state.filters.agoValue = dashboardState.rankings.attackTimeValue;
      attacksStore.state.filters.agoUnit = dashboardState.rankings.attackTimeUnit || 'days';
    }

    attacksStore.state.filters.minLogs = dashboardState.rankings.attackMinLogs;
    attacksStore.state.filters.dangerLevels = [...(dashboardState.rankings.dangerLevels || [])];
    attacksStore.state.filters.ip = ''; // Reset IP se sincronizziamo i filtri globali
    attacksStore.state.pagination.page = 1;
  }
  
  router.push('/attacks')
}
function goToLogs() {
  router.push('/threatlogs')
}
function goToTelnet() {
  router.push('/telnet-sessions')
}

function goToArchive() {
  router.push('/dossiers')
}

function goToIpDetails(ip) {
  router.push(`/ip/${ip}`)
}

function syncSingleAttackToSearch(item) {
  // Sincronizzazione filtri verso AttacksStore
  attacksStore.state.filters.ip = item.request?.ip || '';
  attacksStore.state.filters.protocol = dashboardState.rankings.attackProtocol;
  
  // Gestione Timeframe per singolo attacco
  if (dashboardState.rankings.attackTimeValue === null) {
    attacksStore.state.filters.timeMode = 'ago';
    attacksStore.state.filters.agoValue = 10;
    attacksStore.state.filters.agoUnit = 'years';
  } else {
    attacksStore.state.filters.timeMode = 'ago';
    attacksStore.state.filters.agoValue = dashboardState.rankings.attackTimeValue;
    attacksStore.state.filters.agoUnit = dashboardState.rankings.attackTimeUnit || 'days';
  }

  attacksStore.state.filters.minLogs = dashboardState.rankings.attackMinLogs;
  attacksStore.state.filters.dangerLevels = [...(dashboardState.rankings.dangerLevels || [])];
  
  attacksStore.state.pagination.page = 1;
  router.push('/attacks');
}

// Funzioni per template
function formatDate(timestamp) {
  return formatFullDateTime(timestamp);
};

function computeDuration(start, end) {
  if (!start || !end) return '-';
  const s = dayjs(start);
  const e = dayjs(end);
  const diffSeconds = e.diff(s, 'second');
  return formatHumanDuration(diffSeconds, t);
};

const formatAggregatedDurationHome = (session) => {
  if (session.isAggregated && session.duration !== undefined) {
    return formatHumanDuration(session.duration, t);
  }
  return computeDuration(session.starttime, session.endtime);
};

// Anomalie - chiamata base: ora collegata direttamente allo store persistente tramite toRef
const {
  attacks,
  loading: loadingAttacks,
  error: errorAttacks,
  total: attackTotal,
  fetchData: fetchAttacks
} = useAttacksFilter(
    '', 
    toRef(dashboardState.rankings, 'attackProtocol'), 
    toRef(dashboardState.rankings, 'attackPage'), 
    toRef(dashboardState.rankings, 'attackMinLogs'), 
    'ago', 
    toRef(dashboardState.rankings, 'attackTimeValue'), 
    toRef(dashboardState.rankings, 'attackTimeUnit'), 
    null, 60, 'days', 0, 'days', { firstSeen: -1 }, 10,
    toRef(dashboardState.rankings, 'dangerLevels')
)

const recentAttacks = computed(() => attacks.value)

const {
  logs,
  loading: loadingLogs,
  error: errorLogs,
  total: logTotal,
  fetchData: fetchLogs
} = useLogsFilter(
    '', '', 
    toRef(dashboardState.rankings, 'logProtocol'), 
    toRef(dashboardState.rankings, 'logPage'), 
    { timestamp: -1 }, 10
)

const recentLogs = computed(() => logs.value)

const {
  sessions,
  loading: loadingSessions,
  error: errorSessions,
  total: sessionTotal,
  fetchData: fetchSessions
} = useCowrieSessions(
    toRef(dashboardState.rankings, 'sessionPage'), 
    10, { starttime: -1 }, '', 
    toRef(dashboardState.rankings, 'sessionCategory')
);

const recentSessions = computed(() => sessions.value)

// Dossier - ultimi 5
const recentDossiers = ref([]);
const loadingDossiers = ref(false);
const errorDossiers = ref(false);

const fetchRecentDossiers = async () => {
  if (!authStore.isAuthenticated) return;
  
  loadingDossiers.value = true;
  errorDossiers.value = false;
  try {
    const response = await fetchDossiers({ page: 1, pageSize: 5 });
    recentDossiers.value = response.items || [];
  } catch (error) {
    console.error('Error loading recent dossiers:', error);
    errorDossiers.value = true;
  } finally {
    loadingDossiers.value = false;
  }
};


import { useProfileStore } from '../../stores/profiles';

const profileStore = useProfileStore();
const dossierStore = useDossierStore();
const authStore = useAuthStore();



// Carica i dati solo una volta per la dashboard, ma ricarica se cambia il profilo
const loadAll = () => {
  fetchAttacks();
  fetchLogs();
  fetchSessions();
  fetchRecentDossiers();
};

onMounted(loadAll);
watch(() => profileStore.activeProfileId, loadAll);
watch(() => dossierStore.lastSavedAt, fetchRecentDossiers);

// Sincronizzazione automatica dei filtri con ricaricamento dati
// Osserviamo l'intero oggetto rankings per reagire a qualsiasi cambio di filtro o pagina
watch(() => dashboardState.rankings, (newRankings, oldRankings) => {
    // Se è cambiata la pagina o un filtro degli attacchi, ricarichiamo gli attacchi
    fetchAttacks();
    // Idem per log e sessioni
    fetchLogs();
    fetchSessions();
}, { deep: true });

</script>

<style scoped src="./Home.css"></style>
<style scoped>
@import "./HomeCyber.css";

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
    margin-left: 12px;
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

/* Sfasamento orizzontale come richiesto */
.reset-ascii span:nth-child(1) {
    transform: translateX(-3px);
}
.reset-ascii span:nth-child(2) {
    transform: translateX(3px);
}

.reset-btn-mini:hover {
    background: rgba(255, 51, 102, 0.1);
    border-color: #ff3366;
    box-shadow: 0 0 15px rgba(255, 51, 102, 0.4);
}

.reset-btn-mini:hover .reset-ascii {
    transform: rotate(180deg);
}

/* Al hover le linee si allineano e brillano (effetto ricalibrazione) */
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

/* Skin Cyber specific */
.skin-cyber .reset-btn-mini {
    border-style: double; /* Doppia linea per un tocco più hardware */
    border-width: 1px;
}

/* Skin Classic override */
.skin-classic .reset-btn-mini {
    clip-path: none;
    border-radius: 4px;
    border-color: #c0392b;
}

.skin-classic .reset-ascii span {
    background: #c0392b;
    box-shadow: none;
}

.screensaver-wrapper {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: stretch;
    flex: 1;
    min-height: 450px;
    padding: 0;
    margin: 0;
}

/* Scanning Line for Dossiers */
.full-width-widget {
    position: relative;
    overflow: hidden;
}

.dossier-ranking .scanning-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(to right, transparent, #6366f1, transparent);
  box-shadow: 0 0 15px #6366f1;
  animation: scan-dossier 7s linear infinite;
  z-index: 5;
  opacity: 0.25;
  pointer-events: none;
}

@keyframes scan-dossier {
  0% { top: 0; }
  100% { top: 100%; }
}

/* Sync Button Styles */
.sync-btn-mini {
    margin-left: 6px;
    border: 1px solid rgba(255, 51, 102, 0.4);
    background: transparent;
    color: var(--theme-primary, #ff3366);
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 4px;
    font-size: 0.8rem;
    padding: 0;
}

.sync-btn-mini:hover {
    background: rgba(255, 51, 102, 0.1);
    border-color: var(--theme-primary, #ff3366);
    box-shadow: 0 0 10px rgba(255, 51, 102, 0.3);
}

.intel-det-btn {
    text-decoration: none;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Header Sync Styles */
.ranking-header-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
}

/* Rimuoviamo il margine superiore dal pulsante originale quando è nel container di sync */
.ranking-header-actions :deep(.btn-ranking-action) {
    margin-top: 0 !important;
    height: 36px;
    display: flex;
    align-items: center;
}

.sync-btn-header {
    background: rgba(255, 51, 102, 0.08);
    border: 1px solid rgba(255, 51, 102, 0.3);
    color: var(--theme-primary, #ff3366);
    padding: 0;
    width: 36px;
    height: 36px; /* Uguale all'altezza del pulsante accanto */
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    align-self: center;
}

.sync-btn-header:hover {
    background: rgba(255, 51, 102, 0.15);
    border-color: var(--theme-primary, #ff3366);
    box-shadow: 0 0 15px rgba(255, 51, 102, 0.4);
    transform: translateY(-1px);
}

.sync-btn-header:active {
    transform: scale(0.9);
    background: var(--theme-primary, #ff3366);
    color: #fff;
}

.skin-cyber .ranking-header-actions :deep(.btn-ranking-action) {
    height: 38px;
}

.skin-cyber .sync-btn-header {
    background: transparent !important;
    border-radius: 0 !important;
    border: 1px solid var(--neon-pink) !important;
    color: var(--neon-pink) !important;
    height: 38px; 
    width: 38px;
}
</style>
