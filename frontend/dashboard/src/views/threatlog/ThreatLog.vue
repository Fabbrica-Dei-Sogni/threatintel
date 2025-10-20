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
                            'N/D' }}</p>
                        <p><strong>Method:</strong> {{ log.request.method || 'N/D' }}</p>
                        <p><strong>URL:</strong> {{ log.request.url || 'N/D' }}</p>
                        <p><strong>User Agent:</strong> {{ log.request.userAgent || 'N/D' }}</p>
                        <p><strong>Referer:</strong> {{ log.request.referer || 'N/D' }}</p>
                        <p><strong>Headers:</strong></p>
                        <pre>{{ formatJson(log.request.headers) }}</pre>
                        <p><strong>Body:</strong></p>
                        <pre>{{ formatJson(log.request.body) }}</pre>
                        <p><strong>Query:</strong></p>
                        <pre>{{ formatJson(log.request.query) }}</pre>
                        <p><strong>Cookies:</strong></p>
                        <pre>{{ formatJson(log.request.cookies) }}</pre>
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

            <div class="section">
                <div class="section-header" @click="toggles.response = !toggles.response">
                    <h2>Response</h2>
                    <span class="arrow" :class="{ open: toggles.response }"></span>
                </div>
                <transition name="collapse">
                    <div v-if="toggles.response" class="section-body">
                        <p><strong>Status Code:</strong> {{ log.response.statusCode || 'N/D' }}</p>
                        <p><strong>Response Time (ms):</strong> {{ log.response.responseTime || 'N/D' }}</p>
                        <p><strong>Dimensione (byte):</strong> {{ log.response.size || 'N/D' }}</p>
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

        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { fetchLogById } from '../../api/index'

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

<!--
<script>
import { fetchLogById } from '../../api/index';
import { useRoute, useRouter } from 'vue-router';
import dayjs from 'dayjs';

export default {
    name: 'ThreatLogDetails',
    data() {
        return {
            id: '',
            log: null,
            loading: false,
            error: false,
            toggles: {
                general: true,
                fingerprint: true,
                request: false,
                metadata: false,
                response: false,
                geo: false
            }
        };
    },
    setup() {
        const route = useRoute();
        const router = useRouter();
        return { route, router };
    },
    methods: {
        async load() {
            this.loading = true;
            this.error = false;
            try {
                this.id = this.route.params.id;
                const res = await fetchLogById(this.id);
                this.log = res;
            } catch {
                this.error = true;
            } finally {
                this.loading = false;
            }
        },
        formatDate(s) {
            return s ? dayjs(s).format('DD/MM/YYYY HH:mm:ss') : 'N/D';
        },
        formatJson(o) {
            return o ? JSON.stringify(o, null, 2) : 'N/D';
        },
        goToIpDetails(ip) {
            this.router.push(`/ip/${ip}`);
        },
        goBack() {
            this.router.back();
        }
    },
    created() {
        this.load();
    }
};
</script>
-->

<style scoped src="./ThreatLog.css"></style>
