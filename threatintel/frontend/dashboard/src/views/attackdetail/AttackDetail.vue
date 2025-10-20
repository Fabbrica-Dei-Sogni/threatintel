<template>
    <div class="attack-detail">
        <button @click="goBack" class="back-btn">← Torna indietro</button>
        <h1>Dettaglio Attacco: <span @click="goToIpDetails(attack.request.ip)" style="cursor: pointer;">{{
            attack.request.ip }}</span></h1>

        <section v-if="loading" class="loading">Caricamento dettagli attacco...</section>
        <section v-if="error" class="error">Errore nel caricamento dei dati</section>

        <div v-if="attack" class="attack-summary">
            <div class="summary-row">
                <div><strong>Pericolosità:</strong> {{ attack.dangerLevel }} ({{ attack.dangerScore }})</div>
                <div><strong>RPS:</strong> {{ attack.rps }}</div>
                <div><strong>Durata:</strong> {{ attack.durataAttacco.human }}</div>
            </div>
            <div class="summary-row">
                <div><strong>Punteggio medio:</strong> {{ attack.averageScore }}</div>
                <div><strong>Totale Log:</strong> {{ attack.totaleLogs }}</div>
                <div><strong>Stile:</strong> {{ attack.intensityAttack }}</div>
            </div>
            <div class="summary-row">
                <div><strong>Tecniche utilizzate:</strong> {{ attack.attackPatterns.join(', ') }}</div>
            </div>
            <div class="summary-row">
                <div><strong>Primo avvistamento:</strong> {{ formatDate(attack.firstSeen) }}</div>
                <div><strong>Ultimo avvistamento:</strong> {{ formatDate(attack.lastSeen) }}</div>
            </div>
        </div>
        <div v-if="attack" class="attack-aggregates">

            <el-card class="logs-container" v-if="attack">
                <h2>Log Raggruppati</h2>

                <div v-for="log in paginatedLogs" :key="log.id" class="log-entry">
                    <div class="log-header" @click="toggleLog(log.id)">
                        <span>{{ formatDate(log.timestamp) }} - {{ log.request.method }} {{ log.request.url || 'N/D'
                            }} </span>
                        <span class="toggle-icon">{{ expanded[log.id] ? '–' : '+' }}</span>
                    </div>
                    <transition name="collapse">
                        <div v-if="expanded[log.id]" class="log-body">
                            <p><strong>Score:</strong> {{ log.fingerprint.score ?? 'N/D' }}</p>
                            <span v-if="log.fingerprint.score != null && log.fingerprint.score > 0">
                                <p><strong>Indicatori:</strong></p>
                                <ul>
                                    <li v-for="(ind, i) in log.fingerprint.indicators" :key="i">{{ ind }}</li>
                                </ul>
                            </span>
                            <p><strong>Url:</strong></p>
                            <pre> {{ log.request.url ?? 'N/D' }}</pre>
                            <p><strong>User Agent:</strong> {{ log.request.userAgent || 'N/D' }}</p>
                            <p><strong>Request:</strong></p>
                            <pre>{{ formatJson(log.request) }}</pre>
                            <p><strong>Headers:</strong></p>
                            <pre>{{ formatJson(log.request.headers) }}</pre>
                            <p><strong>Body:</strong></p>
                            <pre>{{ formatJson(log.request.body) }}</pre>
                            <p><strong>Response:</strong></p>
                            <pre>{{ formatJson(log.response) }}</pre>
                        </div>
                    </transition>
                </div>

                <div class="pagination-wrapper" v-if="attack.logsRaggruppati.length > pageSize">
                    <el-pagination background layout="prev, pager, next" :current-page="currentPage"
                        :page-size="pageSize" :total="attack.logsRaggruppati.length"
                        @current-change="page => currentPage = page" />
                </div>
            </el-card>

            <el-card class="rate-limit-events-container" v-if="attack.rateLimitList && attack.countRateLimit">
                <h2>Eventi Rate Limit</h2>

                <div v-for="event in paginatedRateLimitEvents" :key="event._id || event.id"
                    class="rate-limit-event-entry">
                    <div class="event-header" @click="toggleEvent(event._id || event.id)">
                        <span>{{ formatDate(event.timestamp) }} - {{ event.ip }} - {{ event.limitType }}</span>
                        <span class="toggle-icon">{{ expandedEvents[event._id || event.id] ? '–' : '+' }}</span>
                    </div>
                    <transition name="collapse">
                        <div v-if="expandedEvents[event._id || event.id]" class="event-body">
                            <p><strong>User Agent:</strong> {{ event.userAgent || 'N/D' }}</p>
                            <p><strong>Path:</strong> {{ event.path }}</p>
                            <p><strong>Method:</strong> {{ event.method || 'N/D' }}</p>
                            <p><strong>Honeypot ID:</strong> {{ event.honeypotId || 'N/D' }}</p>
                            <p><strong>Messaggio:</strong> {{ event.message || 'N/D' }}</p>
                            <p><strong>Headers:</strong></p>
                            <pre>{{ formatJson(event.headers) }}</pre>
                        </div>
                    </transition>
                </div>

                <div class="pagination-wrapper" v-if="attack.countRateLimit > pageSize">
                    <el-pagination background layout="prev, pager, next" :current-page="currentPageEvents"
                        :page-size="pageSize" :total="attack.countRateLimit"
                        @current-change="page => currentPageEvents = page" />
                </div>
            </el-card>
        </div>

    </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'

// Props
const props = defineProps({
    attack: {
        type: Object,
        required: true
    },
    rateLimitEvents: {
        type: Array,
        default: () => []
    }
})

// Router
const route = useRoute()
const router = useRouter()

// Reactive state
const expanded = reactive({})
const expandedEvents = reactive({})
const currentPage = ref(1)
const pageSize = ref(5)
const currentPageEvents = ref(1)
const pageSizeEvents = ref(5)

// Computed properties
const paginatedLogs = computed(() => {
    const objs = props.attack.logsRaggruppati || []
    const start = (currentPage.value - 1) * pageSize.value
    return objs.slice(start, start + pageSize.value)
})

const paginatedRateLimitEvents = computed(() => {
    const objs = props.attack.rateLimitList || []
    const start = (currentPageEvents.value - 1) * pageSizeEvents.value
    return objs.slice(start, start + pageSizeEvents.value)
})

// Methods
function formatDate(ts) {
    return ts ? dayjs(ts).format('DD/MM/YYYY HH:mm:ss') : 'N/D'
}

function formatJson(obj) {
    return obj ? JSON.stringify(obj, null, 2) : 'N/D'
}

function toggleLog(id) {
    expanded[id] = !expanded[id]
}

function toggleEvent(id) {
    expandedEvents[id] = !expandedEvents[id]
}

function goToIpDetails(ip) {
    router.push({
        name: 'IpDetails',
        params: { ip },
    });
}

function goBack() {
    router.back()
}
</script>

<!--
<script>
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'

export default {
    name: 'AttackDetail',
    props: {
        attack: {
            type: Object,
            required: true
        },
        rateLimitEvents: {  // aggiunto prop per gli eventi di rate limit
            type: Array,
            default: () => []
        }        
    },    
    data() {
        return {
            expanded: {},             // stato espansione logs aggregati
            expandedEvents: {},       // nuovo stato espansione per RateLimitEvents
            currentPage: 1,
            pageSize: 5,
            currentPageEvents: 1,     // pagina attiva per eventi rate limit
            pageSizeEvents: 5         // page size separato per eventi rate limit (configurabile)

        }
    },
    setup() {
        const route = useRoute()
        const router = useRouter()
        return { route, router }
    },
    computed: {
        paginatedLogs() {
            const objs = this.attack.logsRaggruppati || []
            const start = (this.currentPage - 1) * this.pageSize
            return objs.slice(start, start + this.pageSize)
        },
        paginatedRateLimitEvents() {
            const objs = this.attack.rateLimitList || []
            const start = (this.currentPageEvents - 1) * this.pageSizeEvents
            return objs.slice(start, start + this.pageSizeEvents)
        }                                
    },
    methods: {
        formatDate(ts) {
            return ts ? dayjs(ts).format('DD/MM/YYYY HH:mm:ss') : 'N/D'
        },
        formatJson(obj) {
            return obj ? JSON.stringify(obj, null, 2) : 'N/D'
        },
        toggleLog(id) {
            // Assicuriamoci che la proprietà esista e poi inverte il valore
            this.expanded[id] = !this.expanded[id];
        },
        toggleEvent(id) {
            this.expandedEvents[id] = !this.expandedEvents[id]
        },
        goBack() {
            this.router.back()
        }
    }
}
</script>
-->
<style scoped src="./AttackDetail.css"></style>