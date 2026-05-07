<template>
    <div class="attack-detail cyber-view" :class="'skin-' + dashboardSkin">
        <GlobalHeader context="attack-detail" extraClass="cyber-sticky-area cyber-sticky-top-0">
            <template #actions>
                <div class="header-content-right">
                    <ReportActions type="attack" :ip="ip" :ip-list="ipList" filename="dossier_attack" mode="sticky" accentColor="#ff4d4d" />
                </div>
            </template>
            <template #title>
                <div class="briefing-info-main">
                    <span class="animated-icon pulse-magma">🛰️</span>
                    <h1>{{ isDistributed ? t('attackDetail.distributedAttacker') : t('attackDetail.title') }}</h1>
                </div>
            </template>
        </GlobalHeader>

        <div class="back-navigation">
            <button @click="$emit('back')" class="back-btn">← {{ t('attackDetail.backToAttacks') }}</button>
        </div>

        <!-- Attacker Highlight Card -->
        <div v-if="attack" class="attacker-card">
            <div class="attacker-info">
                <span class="attacker-label">{{ isDistributed ? t('attackDetail.distributedAttacker') : t('attackDetail.attacker') }}</span>
                <h2 class="attacker-ip">
                    <span class="animated-icon pulse-magma" style="font-size: 0.8em;">🎯</span>
                    {{ attack.request.ip }}
                    <span class="copy-btn" @click.stop="copyFormatted('clipboard.ip', { ip: attack.request.ip })" :title="t('common.copyIp')">📋</span>

                    <span v-if="isDistributed && ipList?.length > 1" class="cluster-badge" @click="toggles.showIpList = !toggles.showIpList">
                        CLUSTER ({{ ipList.length }} IPs)
                        <span class="arrow-mini" :class="{ open: toggles.showIpList }"></span>
                    </span>
                </h2>

                <transition name="collapse">
                    <div v-if="toggles.showIpList" class="ip-list-dropdown cyber-scroll">
                        <div v-for="ipItem in ipList" :key="ipItem" class="ip-list-item">
                            <button class="copy-btn-mini-start" @click.stop="copyIpItem(ipItem)" :title="t('common.copyIp')">
                                {{ copiedIpItem === ipItem ? '✅' : '📋' }}
                            </button>
                            <span class="ip-text-mini" @click="$emit('go-to-ip', ipItem)">{{ ipItem }}</span>
                        </div>
                    </div>
                </transition>
            </div>
            <button @click="$emit('go-to-ip', attack.request.ip)" class="attacker-action-btn">
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
                    <span class="copy-log-btn" @click.stop="copyAttackSummaryFormatted()" :title="t('common.copy')">📋</span>
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
                            <span class="hud-box-icon">🧾</span>
                            <div class="hud-stat-data">
                                <span class="hud-label">{{ t('attackDetail.totalLogs') }}</span>
                                <div class="hud-value highlight">{{ attack.totaleLogs }}</div>
                            </div>
                        </div>
                        <div class="hud-stat-box">
                            <span class="hud-box-icon">⏱️</span>
                            <div class="hud-stat-data">
                                <span class="hud-label">{{ t('attackDetail.attackDuration') }}</span>
                                <div class="hud-value">{{ formatHumanDuration(attack.durataAttacco.ms / 1000, t) }}</div>
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
                                    <div class="hud-item" v-if="attack.fingerprintAnalysis?.userAgents?.length" style="grid-column: 1 / -1;">
                                        <span class="hud-label">
                                            <span class="mini-icon">🕵️</span> {{ t('attackDetail.userAgent') }}
                                        </span>
                                        <div class="hud-content">
                                            <span v-for="(ua, i) in attack.fingerprintAnalysis.userAgents" :key="i" class="tech-tag" :title="ua" style="font-size: 0.85rem; padding: 4px 12px; margin-top: 4px; display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                                {{ ua }}
                                            </span>
                                        </div>
                                    </div>
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
                        <h2>{{ (attack.logsRaggruppati ? t('attackDetail.logsRaggruppati') : t('attackDetail.recentLogs')).toUpperCase() }}</h2>
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
                                    <span>{{ formatDateTime(log.timestamp) }}</span>
                                    <span class="log-method-url">
                                        <span class="method-badge">{{ log.request.method }}</span>
                                        <span v-if="log.metadata?.eventCount > 1" class="event-count-badge">
                                            (x{{ log.metadata.eventCount }})
                                        </span>
                                        <span class="url-text">{{ log.request.url || t('components.radar.notAvailable') }}</span>
                                    </span>
                                    <!-- IP Badge for distributed view -->
                                    <span v-if="isDistributed" class="dist-ip-badge">🎯 {{ log.request.ip }}</span>

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

                                    <div class="log-tabs-container">
                                        <div class="log-tabs">
                                            <button @click="setLogTab(log._id || log.id, 'request')" class="tab-btn" :class="{ active: getActiveLogTab(log._id || log.id) === 'request' }">
                                                {{ t('threatLog.request').toUpperCase() }}
                                            </button>
                                            <button v-if="log.request.headers" @click="setLogTab(log._id || log.id, 'headers')" class="tab-btn" :class="{ active: getActiveLogTab(log._id || log.id) === 'headers' }">
                                                {{ t('threatLog.headers').toUpperCase() }}
                                            </button>
                                            <button v-if="log.request.body" @click="setLogTab(log._id || log.id, 'body')" class="tab-btn" :class="{ active: getActiveLogTab(log._id || log.id) === 'body' }">
                                                {{ t('threatLog.body').toUpperCase() }}
                                            </button>
                                            <button v-if="log.response" @click="setLogTab(log._id || log.id, 'response')" class="tab-btn" :class="{ active: getActiveLogTab(log._id || log.id) === 'response' }">
                                                {{ t('threatLog.response').toUpperCase() }}
                                            </button>
                                        </div>

                                        <div class="tab-content">
                                            <HexViewer v-if="getActiveLogTab(log._id || log.id) === 'request'" :raw-data="log.request" :label="t('threatLog.request')" />
                                            <HexViewer v-if="getActiveLogTab(log._id || log.id) === 'headers'" :raw-data="log.request.headers" :label="t('threatLog.headers')" />
                                            <HexViewer v-if="getActiveLogTab(log._id || log.id) === 'body'" :raw-data="log.request.body" :label="t('threatLog.body')" />
                                            <HexViewer v-if="getActiveLogTab(log._id || log.id) === 'response'" :raw-data="log.response" :label="t('threatLog.response')" />
                                        </div>
                                    </div>
                                </div>
                            </transition>
                        </div>

                        <div class="pagination-container" v-if="filteredLogs.length > pageSize">
                            <CyberPager v-model:page="currentPage" :pageSize="pageSize" :total="filteredLogs.length" simple size="mini" />
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
                        <div v-for="event in paginatedRateLimitEvents" :key="event._id || event.id" class="rate-limit-event-entry">
                            <div class="event-header" @click="toggleEvent(event._id || event.id)">
                                <div class="event-header-content">
                                    <span class="event-time">
                                        <span class="icon">🕒</span> 
                                        <span>{{ formatDateTime(event.timestamp) }}</span>
                                    </span>
                                    <span class="event-ip"><span class="icon">🎯</span> {{ event.ip }}</span>
                                    <span class="event-limit-badge pulse-magma-mini">{{ event.limitType }}</span>
                                </div>
                                <div class="log-actions">
                                    <span class="copy-log-btn" @click.stop="copyRateBreachEvent(event)" :title="t('common.copy')">📋</span>
                                    <span class="arrow magenta-arrow" :class="{ 'open': expandedEvents[event._id || event.id] }"></span>
                                </div>
                            </div>
                            <transition name="collapse">
                                <div v-if="expandedEvents[event._id || event.id]" class="event-body">
                                    <p><strong>{{ t('threatLog.userAgent') }}:</strong> {{ event.userAgent || t('common.notAvailable') }}</p>
                                    <p><strong>{{ t('common.path') }}:</strong> {{ event.path }}</p>
                                    <p><strong>{{ t('threatLog.method') }}:</strong> {{ event.method || t('common.notAvailable') }}</p>
                                    <p><strong>{{ t('common.honeypotId') }}:</strong> {{ event.honeypotId || t('common.notAvailable') }}</p>
                                    <p><strong>{{ t('common.error') }}:</strong> {{ event.message || t('common.notAvailable') }}</p>
                                    <HexViewer v-if="event.headers" :raw-data="event.headers" :label="t('threatLog.headers')" />
                                </div>
                            </transition>
                        </div>

                        <div class="pagination-container" v-if="attack.countRateLimit > pageSize">
                            <CyberPager v-model:page="currentPageEvents" :pageSize="pageSize" :total="attack.countRateLimit" simple size="mini" />
                        </div>
                    </div>
                </transition>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDateTime, formatHumanDuration, formatFullDateTime } from '../../utils/dateUtils';
import { useClipboard } from '../../composable/useClipboard';
import { useViewSettingsStore } from '../../stores/viewSettings';
import { storeToRefs } from 'pinia';
import { Search } from '@element-plus/icons-vue';

// Components
import GlobalHeader from '../GlobalHeader.vue';
import ReportActions from '../ReportActions.vue';
import CyberPager from '../common/CyberPager.vue';
import DefconIndicator from '../DefconIndicator.vue';
import AttackProfileRadar from '../AttackProfileRadar.vue';
import HexViewer from '../HexViewer.vue';
import AttackMap from '../AttackMap.vue';

const props = defineProps({
    attack: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    error: { type: String, default: null },
    ip: { type: String, required: true },
    ipList: { type: Array, default: () => [] },
    isDistributed: { type: Boolean, default: false }
});

defineEmits(['back', 'go-to-ip']);

const { t } = useI18n();
const { copyFormatted } = useClipboard();
const viewStore = useViewSettingsStore();
const { dashboardSkin } = storeToRefs(viewStore);

// Responsive check
const isMobile = computed(() => window.innerWidth < 768);
const paginationLayout = computed(() => isMobile.value ? 'prev, pager, next' : 'prev, pager, next, jumper, ->, total');

// Local UI State
const toggles = reactive({
    summary: true,
    showProfile: true,
    showMap: false,
    showRadar: false,
    logs: true,
    rateLimit: true,
    showIpList: false
});

const searchUrl = ref('');
const currentPage = ref(1);
const currentPageEvents = ref(1);
const pageSize = ref(10);
const expanded = reactive({});
const expandedEvents = reactive({});
const logTabs = reactive({});
const copiedIpItem = ref(null);

// Computed for Map
const mapAttackData = computed(() => {
    if (!props.attack) return [];
    if (props.isDistributed && props.attack.allIpDetails) {
        return props.attack.allIpDetails.map(details => ({
            ...props.attack,
            ipDetails: details
        }));
    }
    return [props.attack];
});

// Computed for Logs
const filteredLogs = computed(() => {
    const baseLogs = props.attack?.logsRaggruppati || props.attack?.logs || [];
    if (!searchUrl.value) return baseLogs;
    const search = searchUrl.value.toLowerCase();
    return baseLogs.filter(log => 
        log.request.url?.toLowerCase().includes(search)
    );
});

const paginatedLogs = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredLogs.value.slice(start, start + pageSize.value);
});

const paginatedRateLimitEvents = computed(() => {
    if (!props.attack?.rateLimitList) return [];
    const start = (currentPageEvents.value - 1) * pageSize.value;
    return props.attack.rateLimitList.slice(start, start + pageSize.value);
});

// Helper Methods
function formatDate(ts) {
    return formatFullDateTime(ts);
}

function toggleLog(id) {
    expanded[id] = !expanded[id];
}

function toggleEvent(id) {
    expandedEvents[id] = !expandedEvents[id];
}

function setLogTab(id, tab) {
    logTabs[id] = tab;
}

function getActiveLogTab(id) {
    return logTabs[id] || 'request';
}

function copyAttackSummaryFormatted() {
    if (!props.attack) return;
    const summary = `
ATTACK SUMMARY: ${props.ip}
---------------------------
DEFCON: ${props.attack.dangerLevel}
SCORE: ${props.attack.dangerScore}
LOGS: ${props.attack.totaleLogs}
DURATION: ${formatHumanDuration(props.attack.durataAttacco.ms / 1000, t)}
RPS: ${props.attack.rps}
TECHNIQUES: ${props.attack.attackPatterns?.join(', ') || 'N/A'}
    `.trim();
    copyFormatted('clipboard.generic', { text: summary });
}

function copyAggregatedLog(log) {
    copyFormatted('clipboard.generic', { text: JSON.stringify(log, null, 2) });
}

function copyRateBreachEvent(event) {
    copyFormatted('clipboard.generic', { text: JSON.stringify(event, null, 2) });
}

async function copyIpItem(text) {
    if (!text) return;
    await copyFormatted('clipboard.ip', { ip: text });
    copiedIpItem.value = text;
    setTimeout(() => {
        if (copiedIpItem.value === text) copiedIpItem.value = null;
    }, 2000);
}
</script>

<style scoped src="../../views/attackdetail/AttackDetail.css"></style>
<style scoped>
@import "../../views/attackdetail/AttackDetailCyber.css";

.dist-ip-badge {
    background: rgba(var(--cy-primary-rgb, 0, 255, 65), 0.15);
    color: var(--cy-primary, #00FF41);
    padding: 2px 8px;
    border-radius: 4px;
    font-family: var(--cy-font-mono, 'JetBrains Mono', monospace);
    font-size: 0.8em;
    margin-left: 10px;
    border: 1px solid rgba(var(--cy-primary-rgb, 0, 255, 65), 0.3);
}

.cluster-badge {
    background: var(--cy-accent, #FF00FF);
    color: #fff;
    font-size: 0.4em;
    padding: 4px 8px;
    border-radius: 4px;
    vertical-align: middle;
    margin-left: 15px;
    cursor: pointer;
    box-shadow: 0 0 10px rgba(255, 0, 255, 0.4);
    display: inline-flex;
    align-items: center;
    gap: 5px;
}

.arrow-mini {
    display: inline-block;
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 4px solid #fff;
    transition: transform 0.3s;
}

.arrow-mini.open {
    transform: rotate(180deg);
}

.ip-list-dropdown {
    margin-top: 15px;
    background: rgba(0, 0, 0, 0.9);
    border: 1px solid var(--cy-accent, #FF00FF);
    border-radius: 4px;
    max-height: 250px;
    overflow-y: auto;
    padding: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 8px;
}

.ip-list-item {
    padding: 6px 10px;
    font-family: var(--cy-font-mono);
    font-size: 0.85em;
    cursor: default;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 4px;
    border: 1px solid rgba(255, 0, 255, 0.1);
    min-width: 0;
}

.ip-list-item:hover {
    background: rgba(255, 0, 255, 0.08);
    border-color: rgba(255, 0, 255, 0.3);
}

.ip-text-mini {
    flex: 1;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #eee;
}

.ip-text-mini:hover {
    color: var(--cy-accent, #FF00FF);
    text-decoration: underline;
}

.copy-btn-mini-start {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 2px;
    font-size: 0.9em;
    opacity: 0.6;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.copy-btn-mini-start:hover {
    opacity: 1;
    transform: scale(1.1);
}
</style>
