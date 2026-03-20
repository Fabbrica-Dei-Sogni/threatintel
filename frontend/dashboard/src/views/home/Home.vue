<template>
  <div class="dashboard">
    <ConfigMenuButton />
    <div class="header-with-lang">
      <h1>{{ $t('home.title') }}</h1>
      <LanguageSwitcher />
    </div>
    <section class="actions">
      <button @click="goToAttacks" class="btn-action">{{ $t('home.attacks') }}</button>
      <button @click="goToLogs" class="btn-action">{{ $t('home.logRequests') }}</button>
      <button @click="goToTelnet" class="btn-action">{{ $t('home.telnet') }}</button>
    </section>

    <section class="intel-center">
      <!-- Blocco Principale: Mappa e Attacchi in Simbiosi (Separati in due card per coerenza) -->
      <div class="primary-intel">
        <div class="list-side glass-card">
          <div class="widget-header">
            <h2>{{ $t('home.recentAttacks') }}</h2>
            <ProtocolSelector v-model="selectedAttackProtocol" :options="['http', 'ssh', 'https']" theme="dark" />
          </div>
          <ul class="scroll-list">
            <li v-for="attack in recentAttacks" :key="attack.id">
              <CountryFlag v-if="attack.ipDetails?.ipinfo?.country" :countryCode="attack.ipDetails?.ipinfo?.country" />
              <span @click="goToIpDetails(attack.request.ip)" class="ip-link">{{ attack.request.ip }}</span>
              <span class="time-ago">- {{ formatDate(attack.firstSeen) }}</span>
              <router-link
                :to="{ name: 'AttackDetail', query: { attack: encodeURIComponent(JSON.stringify(attack)) } }">
                {{ $t('common.detail') }}
              </router-link>
            </li>
          </ul>
          <div v-if="loadingAttacks" class="loading">{{ $t('home.loadingAttacks') }}</div>
          <div v-if="errorAttacks" class="error">{{ $t('home.errorLoadingAttacks') }}</div>
        </div>
        <div class="map-side glass-card">
          <div class="widget-header">
            <h2><span class="pulse">📡</span> {{ $t('home.attackMap') }}</h2>
          </div>
          <AttackMap :attacks="recentAttacks" />
        </div>
      </div>

      <!-- Blocco Secondario: Log e Sessioni -->
      <div class="secondary-intel">
        <div class="widget glass-card">
          <div class="widget-header">
            <h2>{{ $t('home.recentLogs') }}</h2>
            <ProtocolSelector v-model="selectedLogProtocol" :options="['http', 'ssh', 'https']" theme="dark" />
          </div>
          <ul>
            <li v-for="log in recentLogs" :key="log._id">
              <CountryFlag v-if="log.ipDetailsId?.ipinfo?.country" :countryCode="log.ipDetailsId.ipinfo.country" />
              <span @click="goToIpDetails(log.request.ip)" class="ip-link">{{ log.request.ip }}</span>
              <span class="time-ago">- {{ formatDate(log.timestamp) }}</span>
              <span class="url-hint">- {{ log.request.url }}</span>
              <router-link :to="{ name: 'ThreatLog', params: { id: log.id } }">{{ $t('common.detail') }}</router-link>
            </li>
          </ul>
          <div v-if="loadingLogs" class="loading">{{ $t('home.loadingLogs') }}</div>
          <div v-if="errorLogs" class="error">{{ $t('home.errorLoadingLogs') }}</div>
        </div>

        <div class="widget glass-card">
          <div class="widget-header">
            <h2>{{ $t('home.recentSessions') }}</h2>
          </div>
          <ul>
            <li v-for="session in recentSessions" :key="session.session">
              <CountryFlag v-if="session.ipDetailsId?.ipinfo?.country" :countryCode="session.ipDetailsId.ipinfo.country" />
              <span @click="goToIpDetails(session.src_ip)" class="ip-link">{{ session.src_ip }}</span>
              <span class="time-ago">- {{ formatDate(session.starttime) }}</span>
              <router-link :to="{ name: 'CowrieAttackDetail', params: { id: session.session } }">{{
                  $t('common.detail') }}</router-link>
            </li>
            <li v-if="recentSessions.length === 0 && !loadingSessions">
              {{ $t('common.noDataFound') }}
            </li>
          </ul>
          <div v-if="loadingSessions" class="loading">{{ $t('home.loadingSessions') }}</div>
          <div v-if="errorSessions" class="error">{{ $t('home.errorLoadingSessions') }}</div>
        </div>
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
import { computed, onMounted, watch, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs';
import LanguageSwitcher from '../../components/LanguageSwitcher.vue';
import CountryFlag from '../../components/CountryFlag.vue';
import AttackMap from '../../components/AttackMap.vue';
import ConfigMenuButton from '../../components/ConfigMenuButton.vue';
import ProtocolSelector from '../../components/common/ProtocolSelector.vue';

const { t } = useI18n();

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
} = useAttacksFilter('', selectedAttackProtocol, 1, 10, 'ago', 10, 'days', null, 60, 'days', 0, 'days', { firstSeen: -1 })

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

import { useProfileStore } from '../../stores/profiles';

const profileStore = useProfileStore();

// Carica i dati solo una volta per la dashboard, ma ricarica se cambia il profilo
const loadAll = () => {
  fetchAttacks();
  fetchLogs();
  fetchSessions();
};

onMounted(loadAll);
watch(() => profileStore.activeProfileId, loadAll);
</script>

<style scoped src="./Home.css"></style>
