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
    </section>

    <section class="widgets">
      <div class="widget">
        <div class="widget-header">
          <h2>{{ $t('home.recentAttacks') }}</h2>
          <ProtocolSelector v-model="selectedAttackProtocol" :options="['http', 'ssh']" theme="dark" />
        </div>
        <ul>
          <li v-for="attack in recentAttacks" :key="attack.id">
            <CountryFlag v-if="attack.ipDetails?.ipinfo?.country" :countryCode="attack.ipDetails?.ipinfo?.country" />
            <span @click="goToIpDetails(attack.request.ip)" style="cursor: pointer;"> - {{ attack.request.ip }}</span> -
            {{ formatDate(attack.firstSeen) }} - {{ attack.durataAttacco.human }}
            <router-link
              :to="{ name: 'AttackDetail', query: { attack: encodeURIComponent(JSON.stringify(attack)) } }">{{
                $t('common.detail') }}</router-link>
          </li>
        </ul>
        <div v-if="loadingAttacks">{{ $t('home.loadingAttacks') }}</div>
        <div v-if="errorAttacks">{{ $t('home.errorLoadingAttacks') }}</div>
      </div>
      <div class="widget">
        <div class="widget-header">
          <h2>{{ $t('home.recentLogs') }}</h2>
          <ProtocolSelector v-model="selectedLogProtocol" :options="['http', 'ssh']" theme="dark" />
        </div>
        <ul>
          <li v-for="log in recentLogs" :key="log._id">
            <CountryFlag v-if="log.ipDetailsId?.ipinfo?.country" :countryCode="log.ipDetailsId?.ipinfo?.country" />
            <span @click="goToIpDetails(log.request.ip)" style="cursor: pointer;">
              -
              {{ log.request.ip }}
            </span> -
            {{
              formatDate(log.timestamp) }} - {{ log.request.url }}
            <router-link :to="{ name: 'ThreatLog', params: { id: log.id } }">{{ $t('common.detail') }}</router-link>
          </li>
        </ul>
        <div v-if="loadingLogs">{{ $t('home.loadingLogs') }}</div>
        <div v-if="errorLogs">{{ $t('home.errorLoadingLogs') }}</div>
      </div>
    </section>
    <section class="widget map">
      <h2>{{ $t('home.attackMap') }}</h2>
      <AttackMap :attacks="recentAttacks" />
    </section>

  </div>
</template>

<script setup>
// Import composable customizzati
import { useLogsFilter } from '../../composable/useLogsFilter';
import { useAttacksFilter } from '../../composable/useAttacksFilter';
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

// Log - chiamata base: nessun filtro, prima pagina, ordina per ultimi
const {
  logs,
  loading: loadingLogs,
  error: errorLogs,
  fetchData: fetchLogs
} = useLogsFilter('', '', selectedLogProtocol, 1, { timestamp: -1 })

const recentLogs = computed(() => logs.value.slice(0, 10))

import { useProfileStore } from '../../stores/profiles';

const profileStore = useProfileStore();

// Carica i dati solo una volta per la dashboard, ma ricarica se cambia il profilo
const loadAll = () => {
  fetchAttacks();
  fetchLogs();
};

onMounted(loadAll);
watch(() => profileStore.activeProfileId, loadAll);
</script>

<style scoped src="./Home.css"></style>
