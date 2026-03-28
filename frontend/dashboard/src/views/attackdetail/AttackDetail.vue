<template>
    <div class="attack-detail">
        <div class="header-top">
            <button @click="goBack" class="back-btn">← {{ t('attackDetail.backToAttacks') }}</button>
            <LanguageSwitcher />
        </div>

        <div class="header-briefing-top">
            <div class="briefing-info-main">
                <span class="animated-icon pulse-magma">🛰️</span>
                <h1>{{ t('attackDetail.title') }}</h1>
            </div>
        </div>

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

        <div v-if="attack && !loading" class="attack-summary-wrapper">
            <div class="section-header clickable-header" @click="toggles.summary = !toggles.summary">
                <div class="header-title-group">
                    <span class="animated-icon pulse-magma">📊</span>
                    <h2>{{ t('attackDetail.summary').toUpperCase() }}</h2>
                </div>
                <span class="arrow" :class="{ open: toggles.summary }"></span>
            </div>

            <transition name="collapse">
                <div v-if="toggles.summary" class="attack-summary">
                    <!-- Existing summary content -->
                    <div class="summary-row">
                        <section class="forensic-briefing">
                            <div class="briefing-header">
                                <span class="animated-icon pulse-magma">🛡️</span>
                                {{ t('attackDetail.defconLevel') }}
                            </div>
                            <div class="briefing-content">
                                <DefconIndicator :level="attack.dangerLevel" :dangerScore="attack.dangerScore" />
                            </div>
                        </section>
                    </div>
                    <div class="summary-row">
                        <div class="forensic-briefing">
                            <div class="briefing-header">{{ t('attackDetail.techniques') }}</div>
                            <div class="briefing-content">
                                <span v-for="(tech, i) in attack.attackPatterns" :key="i" class="tech-tag">{{ tech }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="summary-row">
                        <div class="forensic-briefing">
                            <div class="briefing-header">{{ t('attackDetail.firstSeen') }}</div>
                            <div class="briefing-content" v-html="formatDate(attack.firstSeen)"></div>
                        </div>
                        <div class="forensic-briefing">
                            <div class="briefing-header">{{ t('attackDetail.lastSeen') }}</div>
                            <div class="briefing-content" v-html="formatDate(attack.lastSeen)"></div>
                        </div>
                    </div>
                    <div class="summary-row">
                        <div class="forensic-briefing">
                            <div class="briefing-header">{{ t('attackDetail.totalLogs') }}</div>
                            <div class="briefing-content">{{ attack.totaleLogs }}</div>
                        </div>
                        <div class="forensic-briefing">
                            <div class="briefing-header">{{ t('attackDetail.attackDuration') }}</div>
                            <div class="briefing-content">{{ attack.durataAttacco.human }}</div>
                        </div>
                        <div class="forensic-briefing">
                            <div class="briefing-header">{{ t('attackDetail.rps') }}</div>
                            <div class="briefing-content">{{ attack.rps }}</div>
                        </div>
                        <div class="forensic-briefing">
                            <div class="briefing-header">{{ t('attackDetail.avgScore') }}</div>
                            <div class="briefing-content">{{ attack.averageScore }}</div>
                        </div>
                        <div class="forensic-briefing">
                            <div class="briefing-header">{{ t('attackDetail.style') }}</div>
                            <div class="briefing-content">
                                <span class="intensity-badge" :class="attack.intensityAttack.toLowerCase()">{{ attack.intensityAttack }}</span>
                            </div>
                        </div>
                    </div>
                    <!-- Sub-card Map -->
                    <div class="sub-card">
                        <div class="sub-card-header clickable-header" @click="toggles.showMap = !toggles.showMap">
                            <div class="header-title-group">
                                <span class="animated-icon">📡</span>
                                <h3>{{ t('attackDetail.mapTitle').toUpperCase() }}</h3>
                            </div>
                            <span class="arrow" :class="{ open: toggles.showMap }"></span>
                        </div>
                        <transition name="collapse">
                            <div v-if="toggles.showMap" class="sub-card-content">
                                <section class="attack-map-section">
                                    <AttackMap v-if="mapAttackData.length > 0" :attacks="mapAttackData" />
                                </section>
                            </div>
                        </transition>
                    </div>

                    <!-- Sub-card Radar -->
                    <div class="sub-card">
                        <div class="sub-card-header clickable-header" @click="toggles.showRadar = !toggles.showRadar">
                            <div class="header-title-group">
                                <span class="animated-icon">📊</span>
                                <h3>{{ t('attackDetail.radarTitle').toUpperCase() }}</h3>
                            </div>
                            <span class="arrow" :class="{ open: toggles.showRadar }"></span>
                        </div>
                        <transition name="collapse">
                            <div v-if="toggles.showRadar" class="sub-card-content">
                                <section class="attack-profile">
                                    <AttackProfileRadar v-if="attack" :attackDetail="attack" :isMobile="isMobile" />
                                </section>
                            </div>
                        </transition>
                    </div>
                </div>
            </transition>
        </div>
        <div v-if="attack && !loading" class="attack-aggregates">

            <div class="logs-container forensic-card" v-if="attack">
                <div class="section-header logs-header-row clickable-header" @click="toggles.logs = !toggles.logs">
                    <div class="header-title-group">
                        <span class="animated-icon pulse-magma">📜</span>
                        <h2>{{ t('attackDetail.logsRaggrupati').toUpperCase() }}</h2>
                    </div>
                    <div class="header-actions" @click.stop>
                        <el-input 
                            v-model="searchUrl" 
                            :placeholder="t('attackDetail.searchUrlPlaceholder')"
                            class="url-search-input"
                            clearable
                            prefix-icon="Search"
                        />
                        <span class="arrow" :class="{ open: toggles.logs }"></span>
                    </div>
                </div>

                <transition name="collapse">
                    <div v-if="toggles.logs">
                        <div v-for="log in paginatedLogs" :key="log._id || log.id" class="log-entry">
                            <div class="log-header" @click="toggleLog(log._id || log.id)">
                                <span class="log-info-main">
                                    <span v-html="formatDate(log.timestamp)"></span>
                                    <span class="log-method-url">
                                        - {{ log.request.method }} 
                                        <span v-if="log.metadata?.eventCount > 1" class="event-count-badge">
                                            (x{{ log.metadata.eventCount }})
                                        </span>
                                        {{ log.request.url || t('components.radar.notAvailable') }} 
                                    </span>
                                </span>
                                <span class="arrow magenta-arrow" :class="{ 'open': expanded[log._id || log.id] }"></span>
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

                        <div class="pagination-container" v-if="filteredLogs.length > pageSize">
                            <el-pagination background :layout="paginationLayout" :total="filteredLogs.length"
                                :page-size="pageSize" :current-page="currentPage" :pager-count="isMobile ? 3 : 7"
                                @current-change="page => currentPage = page" class="cyber-pagination magenta">
                                <template #default v-if="isMobile">
                                    <span class="mobile-pagination-info">{{ currentPage }} / {{ Math.ceil(filteredLogs.length / pageSize) }}</span>
                                </template>
                            </el-pagination>
                        </div>
                    </div>
                </transition>
            </div>

            <div class="rate-limit-events-container forensic-card" v-if="attack.rateLimitList && attack.countRateLimit">
                <div class="section-header clickable-header" @click="toggles.rateLimit = !toggles.rateLimit">
                    <div class="header-title-group">
                        <span class="animated-icon pulse-magma">⚡</span>
                        <h2>{{ t('attackDetail.rateBreach').toUpperCase() }}</h2>
                    </div>
                    <span class="arrow" :class="{ open: toggles.rateLimit }"></span>
                </div>

                <transition name="collapse">
                    <div v-if="toggles.rateLimit">
                        <div v-for="event in paginatedRateLimitEvents" :key="event._id || event.id"
                            class="rate-limit-event-entry">
                            <div class="event-header" @click="toggleEvent(event._id || event.id)">
                                <span>{{ formatDate(event.timestamp) }} - {{ event.ip }} - {{ event.limitType }}</span>
                                <span class="arrow magenta-arrow" :class="{ 'open': expandedEvents[event._id || event.id] }"></span>
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

                        <div class="pagination-container" v-if="attack.countRateLimit > pageSize">
                            <el-pagination background :layout="paginationLayout" :total="attack.countRateLimit"
                                :page-size="pageSize" :current-page="currentPageEvents" :pager-count="isMobile ? 3 : 7"
                                @current-change="page => currentPageEvents = page" class="cyber-pagination magenta">
                                <template #default v-if="isMobile">
                                    <span class="mobile-pagination-info">{{ currentPageEvents }} / {{ Math.ceil(attack.countRateLimit / pageSize) }}</span>
                                </template>
                            </el-pagination>
                        </div>
                    </div>
                </transition>
            </div>
        </div>

    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
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

// Reactive state for sections
const toggles = reactive({
    summary: true,
    logs: true,
    rateLimit: true,
    showMap: false,
    showRadar: false
})

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

const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value < 600)
const paginationLayout = computed(() => isMobile.value ? 'prev, slot, next' : 'prev, pager, next, total')

const updateWidth = () => {
    windowWidth.value = window.innerWidth
}

onMounted(() => {
    window.addEventListener('resize', updateWidth);
    loadAttackData()
})

onUnmounted(() => {
    window.removeEventListener('resize', updateWidth)
})

// Methods
function formatDate(ts) {
    if (!ts) return `<span class="t-na">${t('common.notAvailable')}</span>`
    const d = dayjs(ts)
    return `<span class="t-date">${d.format('DD/MM/YYYY')}</span> <span class="t-hour">${d.format('HH:mm:ss')}</span>`
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