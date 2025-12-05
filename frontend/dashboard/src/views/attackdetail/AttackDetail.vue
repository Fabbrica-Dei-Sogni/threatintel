<template>
    <div class="attack-detail">
        <button @click="goBack" class="back-btn">← {{ t('attackDetail.backToAttacks') }}</button>
        <h1>{{ t('attackDetail.title') }}</h1>

        <!-- Attacker Highlight Card -->
        <div v-if="attack" class="attacker-card">
            <div class="attacker-info">
                <span class="attacker-label">{{ t('attackDetail.attacker') }}</span>
                <h2 class="attacker-ip">
                    {{ attack.request.ip }}
                    <span class="copy-btn" @click.stop="copyToClipboard(attack.request.ip)" title="Copia IP">📋</span>
                </h2>
            </div>
            <button @click="goToIpDetails(attack.request.ip)" class="attacker-action-btn">
                {{ t('common.analizeProfile') }} &rarr;
            </button>
        </div>

        <section v-if="loading" class="loading">{{ t('common.loading') }}</section>
        <section v-if="error" class="error">{{ t('common.error') }}</section>
        <div v-if="attack" class="attack-summary">
            <!-- Existing summary content -->
            <div class="summary-row">
                <section>
                    <strong>{{ t('attackDetail.defconLevel') }}:</strong>
                    <DefconIndicator :level="attack.dangerLevel" :dangerScore="attack.dangerScore" />
                </section>
            </div>
            <div><strong>{{ t('attackDetail.techniques') }}:</strong> {{ attack.attackPatterns.join(', ') }}</div>
            <div class="summary-row">
                <div><strong>{{ t('attackDetail.firstSeen') }}:</strong> {{ formatDate(attack.firstSeen) }}</div>
                <div><strong>{{ t('attackDetail.lastSeen') }}:</strong> {{ formatDate(attack.lastSeen) }}</div>
            </div>
            <div class="summary-row">
                <div><strong>{{ t('attackDetail.totalLogs') }}:</strong> {{ attack.totaleLogs }}</div>
                <div><strong>{{ t('attackDetail.attackDuration') }}:</strong> {{ attack.durataAttacco.human }}</div>
                <div><strong>{{ t('attackDetail.rps') }}:</strong> {{ attack.rps }}</div>
                <div><strong>{{ t('attackDetail.avgScore') }}:</strong> {{ attack.averageScore }}</div>
                <div><strong>{{ t('attackDetail.style') }}:</strong> {{ attack.intensityAttack }}</div>
            </div>
            <!-- ... existing rows ... -->
            <!-- Insert Map Here -->
            <section class="attack-map-section" style="margin-top: 20px;">
                <AttackMap v-if="mapAttackData.length > 0" :attacks="mapAttackData" />
            </section>
            <section class="attack-profile">
                <AttackProfileRadar v-if="attack" :attackDetail="attack" />
            </section>
        </div>
        <div v-if="attack" class="attack-aggregates">

            <el-card class="logs-container" v-if="attack">
                <h2>{{ t('attackDetail.logsRaggrupati') }}</h2>

                <div v-for="log in paginatedLogs" :key="log.id" class="log-entry">
                    <div class="log-header" @click="toggleLog(log.id)">
                        <span>{{ formatDate(log.timestamp) }} - {{ log.request.method }} {{ log.request.url ||
                            t('components.radar.notAvailable')
                        }} </span>
                        <span class="toggle-icon">{{ expanded[log.id] ? '–' : '+' }}</span>
                    </div>
                    <transition name="collapse">
                        <div v-if="expanded[log.id]" class="log-body">
                            <p><strong>Score:</strong> {{ log.fingerprint.score ?? t('components.radar.notAvailable') }}
                            </p>
                            <span v-if="log.fingerprint.score != null && log.fingerprint.score > 0">
                                <p><strong>{{ t('threatLog.techniques') }}:</strong></p>
                                <ul>
                                    <li v-for="(ind, i) in log.fingerprint.indicators" :key="i">{{ ind }}</li>
                                </ul>
                            </span>
                            <p><strong>{{ t('threatLog.url') }}:</strong></p>
                            <pre> {{ log.request.url ?? t('components.radar.notAvailable') }}</pre>
                            <p><strong>User Agent:</strong> {{ log.request.userAgent ||
                                t('components.radar.notAvailable') }}</p>
                            <HexViewer :raw-data="log.request" :label="t('threatLog.request')" />
                            <!-- 1. Headers -->
                            <HexViewer v-if="log.request.headers" :raw-data="log.request.headers"
                                :label="t('threatLog.headers')" />
                            <!-- 2. Body -->
                            <HexViewer v-if="log.request.body" :raw-data="log.request.body"
                                :label="t('threatLog.body')" />
                            <!-- 3. Response -->
                            <HexViewer v-if="log.response" :raw-data="log.response" :label="t('threatLog.response')" />
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
                <h2>{{ t('attackDetail.rateBreach') }}</h2>

                <div v-for="event in paginatedRateLimitEvents" :key="event._id || event.id"
                    class="rate-limit-event-entry">
                    <div class="event-header" @click="toggleEvent(event._id || event.id)">
                        <span>{{ formatDate(event.timestamp) }} - {{ event.ip }} - {{ event.limitType }}</span>
                        <span class="toggle-icon">{{ expandedEvents[event._id || event.id] ? '–' : '+' }}</span>
                    </div>
                    <transition name="collapse">
                        <div v-if="expandedEvents[event._id || event.id]" class="event-body">
                            <p><strong>User Agent:</strong> {{ event.userAgent || t('components.radar.notAvailable') }}
                            </p>
                            <p><strong>Path:</strong> {{ event.path }}</p>
                            <p><strong>{{ t('threatLog.method') }}:</strong> {{ event.method ||
                                t('components.radar.notAvailable') }}</p>
                            <p><strong>Honeypot ID:</strong> {{ event.honeypotId || t('components.radar.notAvailable')
                            }}</p>
                            <p><strong>{{ t('common.error') }}:</strong> {{ event.message ||
                                t('components.radar.notAvailable') }}</p>
                            <HexViewer v-if="event.headers" :raw-data="event.headers" label="Headers" />
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
import { useI18n } from 'vue-i18n'
import { useClipboard } from '../../composable/useClipboard';
import DefconIndicator from '../../components/DefconIndicator.vue';
import AttackProfileRadar from '../../components/AttackProfileRadar.vue';
import HexViewer from '../../components/HexViewer.vue';
import AttackMap from '../../components/AttackMap.vue';

const { t } = useI18n();
const { copyToClipboard } = useClipboard();

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

const mapAttackData = computed(() => {
    return props.attack ? [props.attack] : [];
});

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