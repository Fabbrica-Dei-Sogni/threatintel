<template>
    <div class="attack-detail">
        <div class="header-top">
            <button @click="goBack" class="back-btn">← {{ t('attackDetail.backToAttacks') }}</button>
            <LanguageSwitcher />
        </div>
        <h1><span class="animated-icon pulse-magma">🛰️</span> {{ t('attackDetail.title') }}</h1>

        <!-- Attacker Highlight Card -->
        <div v-if="attack" class="attacker-card">
            <div class="attacker-info">
                <span class="attacker-label">{{ t('attackDetail.attacker') }}</span>
                <h2 class="attacker-ip">
                    <span class="animated-icon pulse-magma" style="font-size: 0.8em;">🎯</span>
                    {{ attack.request.ip }}
                    <span class="copy-btn" @click.stop="copyToClipboard(attack.request.ip)" :title="t('common.copyIp')">📋</span>
                </h2>
            </div>
            <button @click="goToIpDetails(attack.request.ip)" class="attacker-action-btn">
                {{ t('common.analizeProfile') }} &rarr;
            </button>
        </div>

        <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
        <div v-if="error" class="error">{{ error }}</div>

        <div v-if="attack && !loading" class="attack-summary">
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
        <div v-if="attack && !loading" class="attack-aggregates">

            <el-card class="logs-container" v-if="attack">
                <div class="logs-header-row">
                    <h2>{{ t('attackDetail.logsRaggrupati') }}</h2>
                    <el-input 
                        v-model="searchUrl" 
                        :placeholder="t('attackDetail.searchUrlPlaceholder')"
                        class="url-search-input"
                        clearable
                        prefix-icon="Search"
                    />
                </div>

                <div v-for="log in paginatedLogs" :key="log._id || log.id" class="log-entry">
                    <div class="log-header" @click="toggleLog(log._id || log.id)">
                        <span>{{ formatDate(log.timestamp) }} - {{ log.request.method }} 
                            <span v-if="log.metadata?.eventCount > 1" style="color: #ffb86c; font-size: 0.9em; margin-left: 5px; font-weight: bold;">
                                (x{{ log.metadata.eventCount }})
                            </span>
                            {{ log.request.url || t('components.radar.notAvailable') }} 
                        </span>
                        <span class="toggle-icon">{{ expanded[log._id || log.id] ? '–' : '+' }}</span>
                    </div>
                    <transition name="collapse">
                        <div v-if="expanded[log._id || log.id]" class="log-body">
                            <p><strong>{{ t('common.score') }}:</strong> {{ log.fingerprint.score ?? t('common.notAvailable') }}
                            </p>
                            <span v-if="log.fingerprint.score != null && log.fingerprint.score > 0">
                                <p><strong>{{ t('threatLog.techniques') }}:</strong></p>
                                <ul>
                                    <li v-for="(ind, i) in log.fingerprint.indicators" :key="i">{{ ind }}</li>
                                </ul>
                            </span>
                            <p><strong>{{ t('threatLog.url') }}:</strong></p>
                            <pre> {{ log.request.url ?? t('common.notAvailable') }}</pre>
                            <p><strong>{{ t('threatLog.userAgent') }}:</strong> {{ log.request.userAgent ||
                                t('common.notAvailable') }}</p>
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

                <div class="pagination-wrapper" v-if="filteredLogs.length > pageSize">
                    <el-pagination background layout="prev, pager, next" :current-page="currentPage"
                        :page-size="pageSize" :total="filteredLogs.length"
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
                            <p><strong>{{ t('threatLog.userAgent') }}:</strong> {{ event.userAgent || t('common.notAvailable') }}
                            </p>
                            <p><strong>{{ t('common.path') }}:</strong> {{ event.path }}</p>
                            <p><strong>{{ t('threatLog.method') }}:</strong> {{ event.method ||
                                t('common.notAvailable') }}</p>
                            <p><strong>{{ t('common.honeypotId') }}:</strong> {{ event.honeypotId || t('common.notAvailable')
                            }}</p>
                            <p><strong>{{ t('common.error') }}:</strong> {{ event.message ||
                                t('common.notAvailable') }}</p>
                            <HexViewer v-if="event.headers" :raw-data="event.headers" :label="t('threatLog.headers')" />
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
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import { useClipboard } from '../../composable/useClipboard';
import DefconIndicator from '../../components/DefconIndicator.vue';
import AttackProfileRadar from '../../components/AttackProfileRadar.vue';
import HexViewer from '../../components/HexViewer.vue';
import AttackMap from '../../components/AttackMap.vue';
import LanguageSwitcher from '../../components/LanguageSwitcher.vue';
import { Search } from '@element-plus/icons-vue';
import { fetchAttackDetail } from '../../api';

const { t } = useI18n();
const { copyToClipboard } = useClipboard();

// Props
const props = defineProps({
    ip: {
        type: String,
        required: true
    },
    minLogsForAttack: {
        type: Number,
        default: 10
    },
    timeMode: {
        type: String,
        default: 'ago'
    },
    agoValue: {
        type: Number,
        default: 1
    },
    agoUnit: {
        type: String,
        default: 'days'
    },
    dateRange: {
        type: Array,
        default: () => [null, null]
    }
})

const attack = ref(null)
const loading = ref(true)
const error = ref(null)

const mapAttackData = computed(() => {
    return attack.value ? [attack.value] : [];
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
const searchUrl = ref('')

// Reset page when search changes
watch(searchUrl, () => {
    currentPage.value = 1
})

// Computed properties
const filteredLogs = computed(() => {
    const objs = attack.value?.logsRaggruppati || []
    if (!searchUrl.value) return objs
    return objs.filter(log => 
        (log.request?.url || '').toLowerCase().includes(searchUrl.value.toLowerCase())
    )
})

const paginatedLogs = computed(() => {
    const objs = filteredLogs.value
    const start = (currentPage.value - 1) * pageSize.value
    return objs.slice(start, start + pageSize.value)
})

const paginatedRateLimitEvents = computed(() => {
    const objs = attack.value?.rateLimitList || []
    const start = (currentPageEvents.value - 1) * pageSizeEvents.value
    return objs.slice(start, start + pageSizeEvents.value)
})

// Methods
function formatDate(ts) {
    return ts ? dayjs(ts).format('DD/MM/YYYY HH:mm:ss') : t('common.notAvailable')
}

function formatJson(obj) {
    return obj ? JSON.stringify(obj, null, 2) : t('common.notAvailable')
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

const loadAttackData = async () => {
    loading.value = true
    error.value = null
    try {
        const timeConfig = {
            mode: props.timeMode,
            agoValue: props.agoValue,
            agoUnit: props.agoUnit,
            dateRange: props.dateRange
        }
        const data = await fetchAttackDetail({
            ip: props.ip,
            minLogsForAttack: props.minLogsForAttack,
            timeConfig
        })
        attack.value = data
    } catch (err) {
        console.error('Error fetching attack detail:', err)
        error.value = t('common.error')
    } finally {
        loading.value = false
    }
}

onMounted(loadAttackData)
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