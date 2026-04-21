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
              <button @click="toggleWidget('telemetries')" :class="{ active: isWidgetActive('telemetries') }" class="btn-action">📊 {{ t('home.telemetries').toUpperCase() }}</button>
              <button @click="toggleWidget('attacks')" :class="{ active: isWidgetActive('attacks') }" class="btn-action">🛰️ {{ t('home.attacks').toUpperCase() }}</button>
              <button @click="toggleWidget('logs')" :class="{ active: isWidgetActive('logs') }" class="btn-action">🗄️ {{ t('home.logRequests').toUpperCase() }}</button>
              <button @click="toggleWidget('sessions')" :class="{ active: isWidgetActive('sessions') }" class="btn-action">📟 {{ t('home.telnet').toUpperCase() }}</button>
              <button @click="toggleWidget('dossiers')" :class="{ active: isWidgetActive('dossiers') }" class="btn-action">📁 {{ t('home.archive').toUpperCase() }}</button>
            </section>

            <transition-group name="widget-dynamic" tag="div" class="widgets-container">
              <div v-for="widget in activeWidgets" :key="widget" class="widget-item">
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
                    defaultLimit="10"
                    itemStyle="anomalies-ranking"
                    detailRouteName="AttackDetail"
                    detailItemKey="request.ip"
                    detailRouteParam="ip"
                  >
                    <template #header-actions>
                      <ProtocolSelector v-model="selectedAttackProtocol" :options="['http', 'https', 'ssh']" theme="dark" />
                    </template>

                    <template #title-meta>
                      <button class="btn-ranking-action" @click="goToAttacks">
                        {{ t('common.more_info') }}
                      </button>
                    </template>

                    <template #item="{ item }">
                      <!-- Origin Col -->
                        <div class="item-col item-col-origin">
                          <div class="indicator-group"
                            :data-url-tooltip="`URI: ${item.request?.url || 'N/A'}\nDATE: ${formatDate(item.firstSeen)}`">
                            <CountryFlag :countryCode="item.ipDetails?.ipinfo?.country"
                              :tooltip="item.ipDetails?.ipinfo ? `${item.ipDetails.ipinfo.country} - ${item.ipDetails.ipinfo.org || t('common.notAvailable')}` : t('common.notAvailable')" />
                            <DefconIndicator :level="item.dangerLevel" :dangerScore="item.dangerScore" mode="dot" />
                          </div>
                        </div>

                        <!-- Subject Col -->
                        <div class="item-col item-col-subject">
                          <span @click="goToIpDetails(item.request.ip)" class="ip-link">{{ item.request.ip }}</span>
                        </div>
                        
                        <!-- Forensics Col -->
                        <div class="item-col item-col-forensics" :title="t('attackDetail.timeWindow')">
                          <div class="time-row">
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
                            <div class="badge-content" :class="{ 'high-interaction': (item.totaleLogs || 0) > 50 }" :title="$t('attacks.table.totalLogs')">
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
                      defaultLimit="10"
                      itemStyle="logs-ranking"
                      detailRouteName="ThreatLog"
                    >
                      <template #header-actions>
                        <ProtocolSelector v-model="selectedLogProtocol" :options="['http', 'https', 'ssh']" theme="dark" />
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
                            :data-url-tooltip="`URI: ${item.request?.url || 'N/A'}\nDATE: ${formatDate(item.timestamp)}`">
                            <CountryFlag :countryCode="item.ipDetailsId?.ipinfo?.country"
                              :tooltip="item.ipDetailsId?.ipinfo ? `${item.ipDetailsId.ipinfo.country} - ${item.ipDetailsId.ipinfo.org || t('common.notAvailable')}` : t('common.notAvailable')" />
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
                            <div class="badge-content" :title="$t('threatLog.method')">
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
                    defaultLimit="10"
                    itemStyle="sessions-ranking"
                    detailRouteName="CowrieAttackDetail"
                    detailItemKey="session"
                  >
                    <template #header-actions>
                      <CowrieCategorySelector v-model="filterCategory" size="mini" />
                    </template>

                    <template #title-meta>
                      <button class="btn-ranking-action" @click="goToTelnet">
                        {{ t('common.more_info') }}
                      </button>
                    </template>

                    <template #item="{ item }">
                        <!-- Origin Col -->
                        <div class="indicator-group"
                          :data-url-tooltip="`PROTOCOL: ${item.protocol || 'N/A'}\nDATE: ${formatDate(item.starttime)}`">
                          <CountryFlag :countryCode="item.ipDetailsId?.ipinfo?.country"
                            :tooltip="item.ipDetailsId?.ipinfo ? `${item.ipDetailsId.ipinfo.country} - ${item.ipDetailsId.ipinfo.org || t('common.notAvailable')}` : t('common.notAvailable')" />
                        </div>

                        <!-- Subject Col -->
                        <div class="item-col item-col-subject">
                          <span @click="goToIpDetails(item.src_ip)" class="ip-link">{{ item.src_ip }}</span>
                        </div>
                        
                        <!-- Forensics Col -->
                        <div class="item-col item-col-forensics" :title="t('cowrie.attackDetail.timeWindow')">
                          <div class="time-row">
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
                            <div v-if="item.isAggregated" class="badge-content occurrence" :title="$t('cowrie.sessions.table.occurrences')">
                              <span class="badge-icon">🔢</span>
                              <span class="badge-value">{{ item.occurrenceCount }}</span>
                            </div>
                            <!-- Standard interaction events -->
                            <div v-else class="badge-content" :class="{ 'high-interaction': (item.eventCount || 0) > 10 }" :title="$t('sessionChart.activity')">
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
                  <div class="list-side glass-card full-width-widget">
                    <div class="widget-header">
                      <div class="title-content">
                        <h3>{{ $t('home.recentDossiers').toUpperCase() }}</h3>
                      </div>
                    </div>

                    <!-- Authenticated View -->
                    <ul v-if="authStore.isAuthenticated" class="scroll-list">
                      <li v-for="dossier in recentDossiers" :key="dossier._id" class="dossier-item">
                        <div class="indicator-group" :data-url-tooltip="`Dossier: ${dossier.title}\nID: ${dossier._id}`">
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
    </section>

  </div>
</template>

<script setup>
// Import composable customizzati
import { useLogsFilter } from '../../composable/useLogsFilter';
import { useAttacksFilter } from '../../composable/useAttacksFilter';
import { useCowrieSessions } from '../../composable/useCowrieSessions';
import { useRouter } from 'vue-router'
import { computed, onMounted, watch, ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchDossiers } from '../../api';
import { useDossierStore } from '../../stores/dossier';
import { useAuthStore } from '../../stores/auth';
import { useViewSettingsStore } from '../../stores/viewSettings';
import { storeToRefs } from 'pinia';
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
import { formatDateTime, formatDateOnly, formatTimeOnly, formatHumanDuration, formatFullDateTime } from '../../utils/dateUtils';
import './HomeCyber.css';

const props = defineProps({
    initialAttackProtocol:  { type: String, default: 'http' },
    initialLogProtocol:     { type: String, default: 'http' },
    initialSessionCategory: { type: String, default: 'interaction' },
});

const { t } = useI18n();

const viewStore = useViewSettingsStore();
const { 
  dashboardSkin: currentSkin,
  activeWidgets
} = storeToRefs(viewStore);

function toggleWidget(id) {
  if (activeWidgets.value.includes(id)) {
    activeWidgets.value = activeWidgets.value.filter(w => w !== id);
  } else {
    activeWidgets.value = [id, ...activeWidgets.value];
  }
}

const isWidgetActive = (id) => activeWidgets.value.includes(id);



const showTicker = ref(true);

// Header ticker remains persistent as requested
onMounted(() => {
  // No toggle timer here
});

// Navigazione
const router = useRouter()
function goToAttacks() {
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

const selectedAttackProtocol = ref(props.initialAttackProtocol);
const selectedLogProtocol = ref(props.initialLogProtocol);

// Anomalie - chiamata base: nessun filtro, prima pagina, ordina per ultimi (limit 50 per classifiche)
const {
  attacks,
  loading: loadingAttacks,
  error: errorAttacks,
  fetchData: fetchAttacks
} = useAttacksFilter('', selectedAttackProtocol, 1, 50, 'ago', 90, 'days', null, 60, 'days', 0, 'days', { firstSeen: -1 })

const recentAttacks = computed(() => attacks.value)

const {
  logs,
  loading: loadingLogs,
  error: errorLogs,
  fetchData: fetchLogs
} = useLogsFilter('', '', selectedLogProtocol, 1, { timestamp: -1 }, 50)

const recentLogs = computed(() => logs.value)

const {
  sessions,
  filterCategory,
  loading: loadingSessions,
  error: errorSessions,
  fetchData: fetchSessions
} = useCowrieSessions(1, 50, {}, '', props.initialSessionCategory);

const recentSessions = computed(() => sessions.value)

const recentSessionsNormalized = computed(() => recentSessions.value.map(s => ({
  ...s,
  id: s._id,
  request: { ip: s.src_ip },
  ipDetails: s.ipDetailsId,
  dangerLevel: 2, // High severity for hostile sessions
  dangerScore: 0,
  rps: 0,
  totaleLogs: s.eventCount || 1,
  firstSeen: s.starttime
})));

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

// Sincronizzazione Prop -> Ref (per back/forward browser)
watch(() => props.initialAttackProtocol,  (v) => { selectedAttackProtocol.value = v ?? 'http'; });
watch(() => props.initialLogProtocol,     (v) => { selectedLogProtocol.value   = v ?? 'http'; });
watch(() => props.initialSessionCategory, (v) => { filterCategory.value        = v ?? 'interaction'; });

// Sincronizzazione Ref -> URL query
// Omette il parametro quando è al valore di default per mantenere URL pulito.
watch([selectedAttackProtocol, selectedLogProtocol, filterCategory], ([ap, lp, sc]) => {
    router.replace({
        name: 'Home',
        query: {
            attackProtocol:  ap !== 'http'        ? ap : undefined,
            logProtocol:     lp !== 'http'        ? lp : undefined,
            sessionCategory: sc !== 'interaction' ? sc : undefined,
        }
    });
});
</script>

<style scoped src="./Home.css"></style>
