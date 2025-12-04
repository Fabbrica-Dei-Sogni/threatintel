<template>
    <div class="threatlog-details">
        <button @click="goBack" class="back-btn">← Torna indietro</button>
        <h1>Dettaglio ThreatLog: {{ id }}</h1>

        <section v-if="loading" class="loading">Caricamento dettagli...</section>
        <section v-if="error" class="error">Errore nel caricamento dei dettagli</section>

        <div v-if="log" class="sections">

            <div class="section">
                <div class="section-header" @click="toggles.general = !toggles.general">
                    <h2>Informazioni Generali</h2>
                    <span class="arrow" :class="{ open: toggles.general }"></span>
                </div>
                <transition name="collapse">
                    <div v-if="toggles.general" class="section-body">
                        <p><strong>ID:</strong> {{ log.id }}</p>
                        <p><strong>Timestamp:</strong> {{ formatDate(log.timestamp) }}</p>
                    </div>
                </transition>
            </div>
            <div class="section">
                <div class="section-header" @click="toggles.geo = !toggles.geo">
                    <h2>Geolocalizzazione</h2>
                    <span class="arrow" :class="{ open: toggles.geo }"></span>
                </div>
                <transition name="collapse">
                    <div v-if="toggles.geo" class="section-body">
                        <p><strong>Paese:</strong> {{ log.geo.country || 'N/D' }}</p>
                        <p><strong>Regione:</strong> {{ log.geo.region || 'N/D' }}</p>
                        <p><strong>Città:</strong> {{ log.geo.city || 'N/D' }}</p>
                        <p><strong>Coordinate:</strong> {{ log.geo.coordinates?.join(', ') || 'N/D' }}</p>
                        <p><strong>Timezone:</strong> {{ log.geo.timezone || 'N/D' }}</p>
                        <p><strong>ASN:</strong> {{ log.geo.asn || 'N/D' }}</p>
                        <p><strong>ISP:</strong> {{ log.geo.isp || 'N/D' }}</p>
                    </div>
                </transition>
            </div>

            <div class="section">
                <div class="section-header" @click="toggles.fingerprint = !toggles.fingerprint">
                    <h2>Fingerprint</h2>
                    <span class="arrow" :class="{ open: toggles.fingerprint }"></span>
                </div>
                <transition name="collapse">
                    <div v-if="toggles.fingerprint" class="section-body">
                        <p><strong>Hash:</strong> {{ log.fingerprint.hash || 'N/D' }}</p>
                        <p><strong>Sospetto:</strong> {{ log.fingerprint.suspicious ? 'Sì' : 'No' }}</p>
                        <p><strong>Score:</strong> {{ log.fingerprint.score ?? 'N/D' }}</p>
                        <p><strong>Indicatori:</strong></p>
                        <ul>
                            <li v-for="(ind, i) in log.fingerprint.indicators" :key="i">{{ ind }}</li>
                        </ul>
                    </div>
                </transition>
            </div>

            <div class="section">
                <div class="section-header" @click="toggles.request = !toggles.request">
                    <h2>Request</h2>
                    <span class="arrow" :class="{ open: toggles.request }"></span>
                </div>
                <transition name="collapse">
                    <div v-if="toggles.request" class="section-body">
                        <p @click="goToIpDetails(log.request.ip)" class="link" style="cursor: pointer;">
                            <strong>IP:</strong> {{ log.request.ip ||
                                'N/D' }}
                        </p>
                        <p><strong>Method:</strong> {{ log.request.method || 'N/D' }}</p>
                        <p><strong>URL:</strong> {{ log.request.url || 'N/D' }}</p>
                        <p><strong>User Agent:</strong> {{ log.request.userAgent || 'N/D' }}</p>
                        <p><strong>Referer:</strong> {{ log.request.referer || 'N/D' }}</p>
                        <HexViewer v-if="log.request" :raw-data="log.request" label="Request" />
                        <HexViewer v-if="log.request.body" :raw-data="log.request.body" label="Request Body" />
                        <HexViewer v-if="log.request.headers" :raw-data="log.request.headers" label="Headers" />
                        <HexViewer v-if="log.response" :raw-data="log.response" label="Response Data" />
                        <HexViewer v-if="log.response.query" :raw-data="log.response.query" label="Query" />
                        <HexViewer v-if="log.response.cookies" :raw-data="log.response.cookies" label="Cookies" />
                    </div>
                </transition>
            </div>

            <div class="section">
                <div class="section-header" @click="toggles.metadata = !toggles.metadata">
                    <h2>Metadata</h2>
                    <span class="arrow" :class="{ open: toggles.metadata }"></span>
                </div>
                <transition name="collapse">
                    <div v-if="toggles.metadata" class="section-body">
                        <p><strong>Session ID:</strong> {{ log.metadata.sessionId || 'N/D' }}</p>
                        <p><strong>User Agent Parsed:</strong></p>
                        <pre>{{ formatJson(log.metadata.userAgent_parsed) }}</pre>
                        <p><strong>Is Bot:</strong> {{ log.metadata.isBot ? 'Sì' : 'No' }}</p>
                        <p><strong>Is Crawler:</strong> {{ log.metadata.isCrawler ? 'Sì' : 'No' }}</p>
                    </div>
                </transition>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { fetchLogById } from '../../api/index'
import HexViewer from '../../components/HexViewer.vue'; // <--- AGGIUNGI QUESTO

const route = useRoute()
const router = useRouter()

const id = ref('')
const log = ref(null)
const loading = ref(false)
const error = ref(false)

const toggles = reactive({
    general: true,
    fingerprint: true,
    request: false,
    metadata: false,
    response: false,
    geo: false
})

async function load() {
    loading.value = true
    error.value = false
    try {
        id.value = route.params.id
        const res = await fetchLogById(id.value)
        log.value = res
    } catch {
        error.value = true
    } finally {
        loading.value = false
    }
}

function formatDate(s) {
    return s ? dayjs(s).format('DD/MM/YYYY HH:mm:ss') : 'N/D'
}

function formatJson(o) {
    return o ? JSON.stringify(o, null, 2) : 'N/D'
}

function goToIpDetails(ip) {
    router.push(`/ip/${ip}`)
}

function goBack() {
    router.back()
}

onMounted(() => {
    load()
})
</script>

<style scoped src="./ThreatLog.css"></style>
