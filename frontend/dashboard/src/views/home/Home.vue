<template>
  <div class="dashboard">
    <h1>Honeypot Dashboard</h1>
    <section class="actions">
      <button @click="goToAttacks" class="btn-action">Attacchi</button>
      <button @click="goToLogs" class="btn-action">Log requests</button>
    </section>

    <section class="widgets">
      <div class="widget">
        <h2>Ultimi 10 attacchi</h2>
        <ul>
          <li v-for="attack in recentAttacks" :key="attack.id">
            <span @click="goToIpDetails(attack.request.ip)" style="cursor: pointer;">{{ attack.request.ip }}</span> - {{ attack.ipDetails?.ipinfo?.country }} - {{ formatDate(attack.firstSeen) }} - {{ attack.durataAttacco.human }}
            <router-link :to="{ name:'AttackDetail', query: { attack: encodeURIComponent(JSON.stringify(attack)) } }">Dettaglio</router-link>
          </li>
        </ul>
        <div v-if="loadingAttacks">Caricamento attacchi...</div>
        <div v-if="errorAttacks">Errore caricamento attacchi</div>
      </div>
      <div class="widget">
        <h2>Ultimi 10 log</h2>
        <ul>
          <li v-for="log in recentLogs" :key="log._id">
            <span @click="goToIpDetails(log.request.ip)" style="cursor: pointer;">{{ log.request.ip }}</span> - {{ log.ipDetailsId?.ipinfo?.country }} - {{ formatDate(log.timestamp) }} - {{ log.request.url }}
            <router-link :to="{ name:'ThreatLog', params:{ id: log.id } }">Dettaglio</router-link>
          </li>
        </ul>
        <div v-if="loadingLogs">Caricamento log...</div>
        <div v-if="errorLogs">Errore caricamento log</div>
      </div>
      <div class="widget map">
        <h2>Mappa Attacchi (prossimamente)</h2>
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
import dayjs from 'dayjs';

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
