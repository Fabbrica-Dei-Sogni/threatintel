<template>
  <div class="dashboard">
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
        <h2>{{ $t('home.recentAttacks') }}</h2>
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
        <h2>{{ $t('home.recentLogs') }}</h2>
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
      <div class="widget map">
        <h2>{{ $t('home.attackMap') }}</h2>
        <div id="attack-map" style="height:300px; background:#eee;"></div>
      </div>
    </section>
  </div>
</template>

<script setup>
// Import composable customizzati
import { useLogsFilter } from '../../composable/useLogsFilter';
import { useAttacksFilter } from '../../composable/useAttacksFilter';
import { useRouter } from 'vue-router'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs';
import LanguageSwitcher from '../../components/LanguageSwitcher.vue';
import CountryFlag from '../../components/CountryFlag.vue'; // Import component

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

// Attacchi - chiamata base: nessun filtro, prima pagina, ordina per ultimi
const {
  attacks,
  loading: loadingAttacks,
  error: errorAttacks,
  fetchData: fetchAttacks
} = useAttacksFilter('', 1, 10, 'ago', 10, 'days', null, 60, 'days', 0, 'days', { firstSeen: -1 })

const recentAttacks = computed(() => attacks.value.slice(0, 10))

// Log - chiamata base: nessun filtro, prima pagina, ordina per ultimi
const {
  logs,
  loading: loadingLogs,
  error: errorLogs,
  fetchData: fetchLogs
} = useLogsFilter('', '', 1, { timestamp: -1 })

const recentLogs = computed(() => logs.value.slice(0, 10))

// Carica i dati solo una volta per la dashboard
fetchAttacks()
fetchLogs()
</script>

<style scoped src="./Home.css"></style>
