<template>
  <div class="dashboard">
    <ConfigMenuButton />
    <div class="header-top">
      <div class="header-main-title">
        <h1>
          {{ t('home.title').toUpperCase() }}
        </h1>
      </div>

      <LanguageSwitcher />
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
      <!-- DOMINIO: NATIVE SERVER PROTECTION -->
      <div class="domain-section">
        <h2 class="domain-title" @click="toggles.native = !toggles.native">
          <div class="title-content">
            <span class="icon">🛡️</span> {{ t('home.nativeServerProtection') }}
          </div>
          <span class="arrow" :class="{ open: toggles.native }"></span>
        </h2>

        <transition name="collapse">
          <div v-if="toggles.native">
            <section class="actions">
              <button @click="goToAttacks" class="btn-action">🛰️ {{ t('home.attacks').toUpperCase() }}</button>
              <button @click="goToLogs" class="btn-action">🗄️ {{ t('home.logRequests').toUpperCase() }}</button>
            </section>

            <div class="primary-intel">
              <div class="list-side glass-card">
                <div class="widget-header clickable-header" @click="toggles.recentAttacks = !toggles.recentAttacks">
                  <div class="title-content">
                    <h3>{{ $t('home.recentAttacks').toUpperCase() }}</h3>
                  </div>
                  <div class="header-actions" @click.stop>
                    <ProtocolSelector v-model="selectedAttackProtocol" :options="['http', 'https', 'ssh']"
                      theme="dark" />
                    <ViewToggle v-model="toggles.attackMap" :label="$t('common.showMap')" theme="magma" />
                    <span class="arrow" :class="{ open: toggles.recentAttacks }"></span>
                  </div>
                </div>
                <transition name="collapse">
                  <div v-if="toggles.recentAttacks">
                    <ul class="scroll-list">
                      <li v-for="attack in recentAttacks" :key="attack.id">
                        <div class="indicator-group"
                          :data-url-tooltip="`URI: ${attack.request?.url || 'N/A'}\nDATE: ${formatDate(attack.firstSeen)}`">
                          <CountryFlag :countryCode="attack.ipDetails?.ipinfo?.country"
                            :tooltip="attack.ipDetails?.ipinfo ? `${attack.ipDetails.ipinfo.country} - ${attack.ipDetails.ipinfo.org || t('common.notAvailable')}` : t('common.notAvailable')" />
                          <DefconIndicator :level="attack.dangerLevel" :dangerScore="attack.dangerScore" mode="dot" />
                        </div>
                        <span @click="goToIpDetails(attack.request.ip)" class="ip-link">{{ attack.request.ip }}</span>
                        <div class="column-spacer"></div>
                        <router-link :to="{
                          name: 'AttackDetail',
                          params: { ip: attack.request.ip },
                          query: {
                            minLogsForAttack: 10,
                            timeMode: 'ago',
                            agoValue: 90,
                            agoUnit: 'days'
                          }
                        }">
                          {{ $t('common.detail') }}
                        </router-link>
                      </li>
                    </ul>
                    <div v-if="loadingAttacks" class="loading">{{ $t('home.loadingAttacks') }}</div>
                    <div v-if="errorAttacks" class="error">{{ $t('home.errorLoadingAttacks') }}</div>
                  </div>
                </transition>
              </div>

              <!-- Map side controlled by the list toggle -->
              <transition name="fade">
                <div v-if="toggles.attackMap" class="map-side glass-card">
                  <div class="widget-header">
                    <div class="title-content">
                      <h3><span class="pulse">📡</span> {{ $t('home.attackMap').toUpperCase() }}</h3>
                    </div>
                  </div>
                  <div>
                    <AttackMap :attacks="recentAttacks" />
                  </div>
                </div>
              </transition>
            </div>

            <div class="secondary-intel" style="margin-top: 25px;">
              <div class="widget glass-card">
                <div class="widget-header clickable-header" @click="toggles.recentLogs = !toggles.recentLogs">
                  <div class="title-content">
                    <h3>{{ $t('home.recentLogs').toUpperCase() }}</h3>
                  </div>
                  <div class="header-actions" @click.stop>
                    <ProtocolSelector v-model="selectedLogProtocol" :options="['http', 'https', 'ssh']" theme="dark" />
                    <span class="arrow" :class="{ open: toggles.recentLogs }"></span>
                  </div>
                </div>
                <transition name="collapse">
                  <div v-if="toggles.recentLogs">
                    <ul class="scroll-list">
                      <li v-for="log in recentLogs" :key="log._id">
                        <div class="indicator-group"
                          :data-url-tooltip="`URI: ${log.request?.url || 'N/A'}\nDATE: ${formatDate(log.timestamp)}`">
                          <CountryFlag :countryCode="log.ipDetailsId?.ipinfo?.country"
                            :tooltip="log.ipDetailsId?.ipinfo ? `${log.ipDetailsId.ipinfo.country} - ${log.ipDetailsId.ipinfo.org || t('common.notAvailable')}` : t('common.notAvailable')" />
                        </div>
                        <span @click="goToIpDetails(log.request.ip)" class="ip-link">{{ log.request.ip }}</span>
                        <div class="column-spacer"></div>
                        <router-link :to="{ name: 'ThreatLog', params: { id: log.id } }">{{ $t('common.detail')
                          }}</router-link>
                      </li>
                    </ul>
                    <div v-if="loadingLogs" class="loading">{{ $t('home.loadingLogs') }}</div>
                    <div v-if="errorLogs" class="error">{{ $t('home.errorLoadingLogs') }}</div>
                  </div>
                </transition>
              </div>
            </div>

          </div>
        </transition>
      </div>

      <!-- DOMINIO: HONEYPOT INTELLIGENCE -->
      <div class="domain-section" style="margin-top: 40px;">
        <h2 class="domain-title" @click="toggles.honeypot = !toggles.honeypot">
          <div class="title-content">
            <span class="icon">🔍</span> {{ t('home.honeypotIntelligence') }}
          </div>
          <span class="arrow" :class="{ open: toggles.honeypot }"></span>
        </h2>

        <transition name="collapse">
          <div v-if="toggles.honeypot">
            <section class="actions">
              <button @click="goToTelnet" class="btn-action">📟 {{ t('home.telnet').toUpperCase() }}</button>
            </section>

            <div class="primary-intel">
              <div class="list-side glass-card">
                <div class="widget-header clickable-header" @click="toggles.recentSessions = !toggles.recentSessions">
                  <div class="title-content">
                    <h3>{{ $t('home.recentSessions').toUpperCase() }}</h3>
                  </div>
                  <div class="header-actions">
                    <ViewToggle v-model="toggles.sessionsMap" :label="$t('common.showMap')" theme="jade" />
                    <span class="arrow" :class="{ open: toggles.recentSessions }"></span>
                  </div>
                </div>
                <transition name="collapse">
                  <div v-if="toggles.recentSessions">
                    <ul class="scroll-list">
                      <li v-for="session in recentSessions" :key="session.session" class="session-item">
                        <div class="indicator-group"
                          :data-url-tooltip="`PROTOCOL: ${session.protocol || 'N/A'}\nDATE: ${formatDate(session.starttime)}`">
                          <CountryFlag :countryCode="session.ipDetailsId?.ipinfo?.country"
                            :tooltip="session.ipDetailsId?.ipinfo ? `${session.ipDetailsId.ipinfo.country} - ${session.ipDetailsId.ipinfo.org || t('common.notAvailable')}` : t('common.notAvailable')" />
                        </div>
                        <span @click="goToIpDetails(session.src_ip)" class="ip-link">{{ session.src_ip }}</span>
                        <span class="interaction-count" :class="{ 'high-interaction': (session.eventCount || 0) > 5 }">
                          {{ session.eventCount || 0 }} {{ $t('sessionChart.events').toLowerCase() }}
                        </span>
                        <router-link :to="{ name: 'CowrieAttackDetail', params: { id: session.session } }">
                          {{ $t('common.detail') }}
                        </router-link>
                      </li>
                      <li v-if="recentSessions.length === 0 && !loadingSessions" class="no-data">
                        {{ $t('common.noDataFound') }}
                      </li>
                    </ul>
                    <div v-if="loadingSessions" class="loading">{{ $t('home.loadingSessions') }}</div>
                    <div v-if="errorSessions" class="error">{{ $t('home.errorLoadingSessions') }}</div>
                  </div>
                </transition>
              </div>

              <!-- Sessions Map side controlled by the list toggle -->
              <transition name="fade">
                <div v-if="toggles.sessionsMap" class="map-side glass-card">
                  <div class="widget-header">
                    <div class="title-content">
                      <h3><span class="pulse">📡</span> {{ $t('home.sessionsMap').toUpperCase() }}</h3>
                    </div>
                  </div>
                  <div>
                    <AttackMap :attacks="recentSessionsNormalized" :showLegend="false" />
                  </div>
                </div>
              </transition>
            </div>
          </div>
        </transition>
      </div>

      <!-- DOMINIO: FORENSIC INTELLIGENCE -->
      <div v-if="authStore.isAuthenticated" class="domain-section" style="margin-top: 40px;">
        <h2 class="domain-title" @click="toggles.forensic = !toggles.forensic">
          <div class="title-content">
            <span class="icon">📁</span> {{ t('home.forensicIntelligence') }}
          </div>
          <span class="arrow" :class="{ open: toggles.forensic }"></span>
        </h2>

        <transition name="collapse">
          <div v-if="toggles.forensic">
            <section class="actions">
              <button @click="goToArchive" class="btn-action">📟 {{ t('home.archive') }}</button>
            </section>

            <div class="primary-intel">
              <div class="list-side glass-card full-width-widget">
                <div class="widget-header clickable-header" @click="toggles.recentDossiers = !toggles.recentDossiers">
                  <div class="title-content">
                    <h3>{{ $t('home.recentDossiers').toUpperCase() }}</h3>
                  </div>
                  <span class="arrow" :class="{ open: toggles.recentDossiers }"></span>
                </div>
                <transition name="collapse">
                  <div v-if="toggles.recentDossiers">
                    <ul class="scroll-list">
                      <li v-for="dossier in recentDossiers" :key="dossier._id" class="dossier-item">
                        <div class="indicator-group" :data-url-tooltip="`Dossier: ${dossier.title}\nID: ${dossier._id}`">
                           <span class="status-dot-mini" :class="dossier.status.toLowerCase()"></span>
                        </div>
                        <span class="dossier-title-link" @click="router.push(`/dossiers/${dossier._id}`)">{{ dossier.title }}</span>
                        <div class="column-spacer"></div>
                        <div class="dossier-info">
                           <span class="badge-mini">{{ dossier.sections?.length || 0 }} {{ t('common.sections') }}</span>
                           <span class="timestamp-mini">{{ formatDate(dossier.createdAt) }}</span>
                        </div>
                      </li>
                      <li v-if="recentDossiers.length === 0 && !loadingDossiers" class="no-data">
                        {{ $t('common.noDataFound') }}
                      </li>
                    </ul>
                    <div v-if="loadingDossiers" class="loading">{{ $t('home.loadingDossiers') }}</div>
                    <div v-if="errorDossiers" class="error">{{ $t('home.errorLoadingDossiers') }}</div>
                  </div>
                </transition>
              </div>
            </div>
          </div>
        </transition>
      </div>
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
import dayjs from 'dayjs';
import LanguageSwitcher from '../../components/LanguageSwitcher.vue';
import CountryFlag from '../../components/CountryFlag.vue';
import AttackMap from '../../components/AttackMap.vue';
import BreakingNews from '../../components/BreakingNews.vue';
import ConfigMenuButton from '../../components/ConfigMenuButton.vue';
import ProtocolSelector from '../../components/common/ProtocolSelector.vue';
import ViewToggle from '../../components/common/ViewToggle.vue';
import DefconIndicator from '../../components/DefconIndicator.vue';

const { t } = useI18n();

const toggles = reactive({
  native: true,
  recentAttacks: true,
  attackMap: false,
  recentLogs: false,
  honeypot: true,
  recentSessions: true,
  sessionsMap: false,
  forensic: true,
  recentDossiers: true
});

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
  return dayjs(timestamp).format('DD/MM/YYYY HH:mm:ss');
};

const selectedAttackProtocol = ref('http');
const selectedLogProtocol = ref('http');

// Attacchi - chiamata base: nessun filtro, prima pagina, ordina per ultimi
const {
  attacks,
  loading: loadingAttacks,
  error: errorAttacks,
  fetchData: fetchAttacks
} = useAttacksFilter('', selectedAttackProtocol, 1, 10, 'ago', 90, 'days', null, 60, 'days', 0, 'days', { firstSeen: -1 })

const recentAttacks = computed(() => attacks.value.slice(0, 10))

const {
  logs,
  loading: loadingLogs,
  error: errorLogs,
  fetchData: fetchLogs
} = useLogsFilter('', '', selectedLogProtocol, 1, { timestamp: -1 })

const recentLogs = computed(() => logs.value.slice(0, 10))

// Sessioni Telnet - ultime 10
const {
  sessions,
  loading: loadingSessions,
  error: errorSessions,
  fetchData: fetchSessions
} = useCowrieSessions(1, 10);

const recentSessions = computed(() => sessions.value.slice(0, 10))

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
</script>

<style scoped src="./Home.css"></style>
