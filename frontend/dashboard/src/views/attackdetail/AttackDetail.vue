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
            <ReportActions type="attack" :ip="props.ip" filename="dossier_attack" />
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

        <div v-if="attack && !loading" class="attack-summary-wrapper forensic-card">
            <div class="section-header clickable-header" @click="toggles.summary = !toggles.summary">
                <div class="header-title-group">
                    <span class="animated-icon pulse-magma">🛰️</span>
                    <h2>{{ t('attackDetail.hudTitle').toUpperCase() }}</h2>
                </div>
                <div class="header-actions">
                    <span class="copy-log-btn" @click.stop="copyAttackSummary()" :title="t('common.copy')">📋</span>
                    <span class="arrow" :class="{ open: toggles.summary }"></span>
                </div>
            </div>

            <transition name="collapse">
                <div v-if="toggles.summary" class="attack-summary">
                    <div class="summary-row" style="margin-bottom: 24px;">
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

                    <!-- Tactical HUD Container -->
                    <div class="hud-stats-row">
                        <div class="hud-stat-box">
                            <span class="hud-box-icon">📋</span>
                            <div class="hud-stat-data">
                                <span class="hud-label">{{ t('attackDetail.totalLogs') }}</span>
                                <div class="hud-value highlight">{{ attack.totaleLogs }}</div>
                            </div>
                        </div>
                        <div class="hud-stat-box">
                            <span class="hud-box-icon">⏱️</span>
                            <div class="hud-stat-data">
                                <span class="hud-label">{{ t('attackDetail.attackDuration') }}</span>
                                <div class="hud-value">{{ attack.durataAttacco.human }}</div>
                            </div>
                        </div>
                        <div class="hud-stat-box">
                            <span class="hud-box-icon">📈</span>
                            <div class="hud-stat-data">
                                <span class="hud-label">{{ t('attackDetail.rps') }}</span>
                                <div class="hud-value">{{ attack.rps }}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Profilo Attacco -->
                    <div class="sub-card">
                        <div class="sub-card-header clickable-header" @click="toggles.showProfile = !toggles.showProfile">
                            <div class="header-title-group">
                                <span class="animated-icon">🛡️</span>
                                <h3>{{ t('attackDetail.profileTitle').toUpperCase() }}</h3>
                            </div>
                            <span class="arrow" :class="{ open: toggles.showProfile }"></span>
                        </div>
                        <transition name="collapse">
                            <div v-if="toggles.showProfile" class="sub-card-content">
                                <div class="hud-sub-grid">
                                    <div class="hud-item">
                                        <span class="hud-label">
                                            <span class="mini-icon">🛠️</span> {{ t('attackDetail.techniques') }}
                                        </span>
                                        <div class="hud-content">
                                            <span v-for="(tech, i) in attack.attackPatterns" :key="i" class="tech-tag">{{ tech }}</span>
                                            <span v-if="!attack.attackPatterns?.length" class="t-na">{{ t('common.notAvailable') }}</span>
                                        </div>
                                    </div>
                                    <div class="hud-item">
                                        <span class="hud-label">
                                            <span class="mini-icon">📅</span> {{ t('attackDetail.firstSeen') }}
                                        </span>
                                        <div class="hud-content" v-html="formatDate(attack.firstSeen)"></div>
                                    </div>
                                    <div class="hud-item">
                                        <span class="hud-label">
                                            <span class="mini-icon">⏳</span> {{ t('attackDetail.lastSeen') }}
                                        </span>
                                        <div class="hud-content" v-html="formatDate(attack.lastSeen)"></div>
                                    </div>
                                    <div class="hud-item">
                                        <span class="hud-label">
                                            <span class="mini-icon">🎨</span> {{ t('attackDetail.style') }}
                                        </span>
                                        <div class="hud-content">
                                            <span class="intensity-badge" :class="attack.intensityAttack.toLowerCase()">{{ attack.intensityAttack }}</span>
                                        </div>
                                    </div>
                                    <div class="hud-item">
                                        <span class="hud-label">
                                            <span class="mini-icon">📊</span> {{ t('attackDetail.avgScore') }}
                                        </span>
                                        <div class="hud-content">{{ attack.averageScore }}</div>
                                    </div>
                                </div>
                            </div>
                        </transition>
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
                                <div class="log-info-main">
                                    <!-- <DefconIndicator 
                                        :level="getDefconLevel(log.fingerprint.score)" 
                                        :dangerScore="log.fingerprint.score" 
                                        mode="dot" 
                                        class="log-severity-indicator"
                                    /> -->
                                    <span v-html="formatDate(log.timestamp)"></span>
                                    <span class="log-method-url">
                                        <span class="method-badge">{{ log.request.method }}</span>
                                        <span v-if="log.metadata?.eventCount > 1" class="event-count-badge">
                                            (x{{ log.metadata.eventCount }})
                                        </span>
                                        <span class="url-text">{{ log.request.url || t('components.radar.notAvailable') }}</span>
                                    </span>
                                    <div class="log-header-indicators" v-if="log.fingerprint.indicators?.length">
                                        <span v-for="(ind, i) in log.fingerprint.indicators.slice(0, 3)" :key="i" class="mini-tech-tag" :title="ind">
                                            {{ ind.substring(0, 3).toUpperCase() }}
                                        </span>
                                        <span v-if="log.fingerprint.indicators.length > 3" class="mini-tech-tag-more">
                                            +{{ log.fingerprint.indicators.length - 3 }}
                                        </span>
                                    </div>
                                </div>
                                <div class="log-actions">
                                    <span class="copy-log-btn" @click.stop="copyAggregatedLog(log)" :title="t('common.copy')">📋</span>
                                    <span class="arrow magenta-arrow" :class="{ 'open': expanded[log._id || log.id] }"></span>
                                </div>
                            </div>
                            <transition name="collapse">
                                <div v-if="expanded[log._id || log.id]" class="log-body">
                                    <!-- Log Meta Summary -->
                                    <div class="log-details-meta">
                                        <div class="meta-row">
                                            <span class="meta-label">{{ t('common.score').toUpperCase() }}:</span>
                                            <span class="score-value">
                                                {{ log.fingerprint.score ?? t('common.notAvailable') }}
                                            </span>
                                        </div>
                                        <div class="meta-row" v-if="log.request.userAgent">
                                            <span class="meta-label">UA:</span>
                                            <span class="ua-value">{{ log.request.userAgent }}</span>
                                        </div>
                                    </div>

                                    <!-- Tabs System -->
                                    <div class="log-tabs-container">
                                        <div class="log-tabs">
                                            <button 
                                                @click="setLogTab(log._id || log.id, 'request')" 
                                                class="tab-btn" 
                                                :class="{ active: getActiveLogTab(log._id || log.id) === 'request' }"
                                            >
                                                {{ t('threatLog.request').toUpperCase() }}
                                            </button>
                                            <button 
                                                v-if="log.request.headers"
                                                @click="setLogTab(log._id || log.id, 'headers')" 
                                                class="tab-btn" 
                                                :class="{ active: getActiveLogTab(log._id || log.id) === 'headers' }"
                                            >
                                                {{ t('threatLog.headers').toUpperCase() }}
                                            </button>
                                            <button 
                                                v-if="log.request.body"
                                                @click="setLogTab(log._id || log.id, 'body')" 
                                                class="tab-btn" 
                                                :class="{ active: getActiveLogTab(log._id || log.id) === 'body' }"
                                            >
                                                {{ t('threatLog.body').toUpperCase() }}
                                            </button>
                                            <button 
                                                v-if="log.response"
                                                @click="setLogTab(log._id || log.id, 'response')" 
                                                class="tab-btn" 
                                                :class="{ active: getActiveLogTab(log._id || log.id) === 'response' }"
                                            >
                                                {{ t('threatLog.response').toUpperCase() }}
                                            </button>
                                        </div>

                                        <div class="tab-content">
                                            <HexViewer v-if="getActiveLogTab(log._id || log.id) === 'request'" 
                                                :raw-data="log.request" :label="t('threatLog.request')" />
                                            <HexViewer v-if="getActiveLogTab(log._id || log.id) === 'headers'" 
                                                :raw-data="log.request.headers" :label="t('threatLog.headers')" />
                                            <HexViewer v-if="getActiveLogTab(log._id || log.id) === 'body'" 
                                                :raw-data="log.request.body" :label="t('threatLog.body')" />
                                            <HexViewer v-if="getActiveLogTab(log._id || log.id) === 'response'" 
                                                :raw-data="log.response" :label="t('threatLog.response')" />
                                        </div>
                                    </div>
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
import ReportActions from '../../components/ReportActions.vue';
import { Search } from '@element-plus/icons-vue';
import { fetchAttackDetail } from '../../api';

const { t } = useI18n();
const { copyToClipboard } = useClipboard();

// Reactive state for sections
const toggles = reactive({
    summary: true,
    logs: true,
    rateLimit: true,
    showProfile: true,
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
const activeLogTabs = reactive({}) // logId -> 'request' | 'headers' | 'body' | 'response'
const currentPage = ref(1)
const pageSize = ref(5)
const currentPageEvents = ref(1)
const pageSizeEvents = ref(5)
const searchUrl = ref('')

// Reset page when search changes
watch(searchUrl, () => {
    currentPage.value = 1
})

// Helper for Defcon Level mapping
/*
function getDefconLevel(score) {
    if (score == null) return 5;
    if (score >= 9) return 1;
    if (score >= 7) return 2;
    if (score >= 4) return 3;
    if (score >= 1) return 4;
    return 5;
}

function getDefconClass(level) {
    const numericLevel = parseInt(level, 10);
    if (numericLevel <= 1) return 'defcon-critical';
    if (numericLevel === 2) return 'defcon-high';
    if (numericLevel === 3) return 'defcon-medium';
    if (numericLevel === 4) return 'defcon-low';
    return 'defcon-normal';
}
*/

function setLogTab(id, tab) {
    activeLogTabs[id] = tab
}

function getActiveLogTab(id) {
    return activeLogTabs[id] || 'request'
}

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

const copyAttackSummary = () => {
    if (!attack.value) return;
    
    let text = `--- TACTICAL ATTACK SUMMARY ---\n`;
    text += `Target IP: ${attack.value.request?.ip || 'N/A'}\n`;
    text += `Defcon Level: ${attack.value.dangerLevel} (${attack.value.dangerScore}/10)\n`;
    text += `\n[MAIN METRICS]\n`;
    text += `- Total Logs: ${attack.value.totaleLogs}\n`;
    text += `- Duration: ${attack.value.durataAttacco?.human || 'N/A'}\n`;
    text += `- Average RPS: ${attack.value.rps}\n`;
    text += `\n[ATTACK PROFILE]\n`;
    
    if (attack.value.attackPatterns?.length) {
        text += `- Techniques: ${attack.value.attackPatterns.join(', ')}\n`;
    }
    
    text += `- First Seen: ${dayjs(attack.value.firstSeen).format('YYYY-MM-DD HH:mm:ss')}\n`;
    text += `- Last Seen: ${dayjs(attack.value.lastSeen).format('YYYY-MM-DD HH:mm:ss')}\n`;
    text += `- Intensity: ${attack.value.intensityAttack || 'N/A'}\n`;
    text += `- Average Forensic Score: ${attack.value.averageScore}\n`;
    text += `\n--------------------------------`;
    
    copyToClipboard(text);
};

const copyAggregatedLog = (log) => {
    let text = `--- THREAT INTEL LOG SUMMARY ---\n`;
    text += `Timestamp: ${dayjs(log.timestamp).format('YYYY-MM-DD HH:mm:ss')}\n`;
    text += `Method: ${log.request?.method || 'N/A'}\n`;
    text += `URL: ${log.request?.url || 'N/A'}\n`;
    const score = log.fingerprint?.score ?? 'N/A';
    text += `Score: ${score}\n`;
    if (log.fingerprint?.indicators?.length) {
        text += `Indicators: ${log.fingerprint.indicators.join(', ')}\n`;
    }
    text += `User Agent: ${log.request?.userAgent || 'N/A'}\n`;
    text += `IP: ${attack.value?.request?.ip || 'N/A'}\n`;
    
    if (log.request?.body) {
        const bodyContent = typeof log.request.body === 'object' 
            ? JSON.stringify(log.request.body, null, 2) 
            : log.request.body;
        text += `\nPayload:\n${bodyContent}\n`;
    }
    
    text += `--------------------------------`;
    copyToClipboard(text);
};
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