<template>
    <div class="cowrie-detail attacchi">
        <div class="header-top">
            <h1><span class="animated-icon pulse-jade">👾</span> {{ $t('cowrie.attackDetail.title') }}</h1>
            <LanguageSwitcher />
        </div>
        <div class="actions">
            <button @click="$router.back()" class="btn-action">{{ $t('cowrie.attackDetail.backToSessions') }}</button>
            <ReportActions type="telnet" :sessionId="sessionId" filename="dossier_telnet" mode="sticky" accentColor="#00FF41" />
        </div>
        <p class="subtitle">{{ $t('cowrie.attackDetail.subtitle') }}: <span class="hash">{{ sessionId }}</span> ({{ $t('cowrie.attackDetail.rawEvents') }}: {{ events.length }})</p>

        <div class="sub-card info-card" v-if="sessionDetails">
            <div class="sub-card-header" @click="toggles.showInfo = !toggles.showInfo">
                <div class="header-title-group">
                    <span class="animated-icon">👤</span>
                    <h3>{{ t('cowrie.attackDetail.mainInfo').toUpperCase() }}</h3>
                </div>
                <div class="header-actions">
                    <span class="copy-log-btn" @click.stop="copySessionSummary()" :title="t('common.copy')">📋</span>
                    <span class="arrow" :class="{ open: toggles.showInfo }"></span>
                </div>
            </div>
            <transition name="collapse">
                <div v-if="toggles.showInfo" class="sub-card-content">
                    <div class="hud-sub-grid">
                        <div class="hud-item">
                            <span class="hud-label">
                                <span class="mini-icon">👤</span> {{ $t('cowrie.attackDetail.hostileIp') }}
                            </span>
                            <div class="hud-content ip">
                                <span class="ip-link" @click="goToIpDetails(sessionDetails.src_ip)" :title="$t('common.infoIp')">{{ sessionDetails.src_ip }}</span>
                                <button @click.stop="copyFormatted('clipboard.ip', { ip: sessionDetails.src_ip })" class="btn-copy-mini" :title="$t('cowrie.attackDetail.copy')">📋</button>
                            </div>
                        </div>
                        <div class="hud-item">
                            <span class="hud-label">
                                <span class="mini-icon">📅</span> {{ $t('cowrie.attackDetail.timeWindow') }}
                            </span>
                            <div class="hud-content">{{ formatDate(sessionDetails.starttime) }} - {{ formatDate(sessionDetails.endtime) }}</div>
                        </div>
                        <div class="hud-item" v-if="sessionDetails.ipDetailsId?.ipinfo?.country">
                            <span class="hud-label">
                                <span class="mini-icon">📍</span> {{ $t('cowrie.attackDetail.origin') }}
                            </span>
                            <div class="hud-content geo">{{ sessionDetails.ipDetailsId.ipinfo.city }}, {{ sessionDetails.ipDetailsId.ipinfo.country }}</div>
                        </div>
                    </div>
                </div>
            </transition>
        </div>



        <div v-if="loading" class="loading">{{ $t('cowrie.attackDetail.loading') }}</div>
        
        <div v-if="error" class="error-box">{{ error }}</div>

        <div class="sub-card timeline-card" v-if="!loading && !error">
            <div class="sub-card-header" @click="toggles.showTimeline = !toggles.showTimeline">
                <div class="header-title-group">
                    <span class="animated-icon">{{ sessionDetails?.isScannerActivity ? '📡' : '📊' }}</span>
                    <h3>{{ (sessionDetails?.isScannerActivity ? t('cowrie.attackDetail.scannerAnalysis') : t('cowrie.attackDetail.eventTimeline')).toUpperCase() }}</h3>
                </div>
                <div class="header-actions">
                    <span class="copy-log-btn" @click.stop="sessionDetails?.isScannerActivity ? copyScannerSummary() : copyEventTimeline()" :title="t('common.copy')">📋</span>
                    <span class="arrow" :class="{ open: toggles.showTimeline }"></span>
                </div>
            </div>
            <transition name="collapse">
                <div v-if="toggles.showTimeline" class="sub-card-content p-24">
                    <section class="timeline-container">
                        <!-- SCANNER AGGREGATE SUMMARY -->
                        <div v-if="sessionDetails?.isScannerActivity" class="scanner-stats-card glass-card">
                            <!-- Header rimosso perché già presente nel sub-card-header superiore -->
                            <div class="stats-grid">
                                <div class="stat-item">
                                    <span class="stat-label">{{ $t('cowrie.attackDetail.scannerOccurrences') }}</span>
                                    <div class="stat-value occurrence">🔢 {{ sessionDetails.scannerStats.totalOccurrences }}</div>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">{{ $t('cowrie.attackDetail.scannerFirstSeen') }}</span>
                                    <div class="stat-value">⏱️ {{ formatDate(sessionDetails.scannerStats.firstSeen) }}</div>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">{{ $t('cowrie.attackDetail.scannerLastSeen') }}</span>
                                    <div class="stat-value">🏁 {{ formatDate(sessionDetails.scannerStats.lastSeen) }}</div>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">{{ $t('cowrie.sessions.table.duration') }}</span>
                                    <div class="stat-value">⏳ {{ formatAggregatedDuration(sessionDetails.scannerStats.duration) }}</div>
                                </div>
                            </div>
                        </div>

                        <ul v-if="events.length > 0" class="cyber-timeline">
                            <li v-for="(event, index) in events" :key="event._id" class="timeline-node" :style="{ animationDelay: `${index * 0.05}s` }">
                                <div class="node-icon" :class="getEventTypeClass(event.eventid)">
                                    <i v-if="event.eventid.includes('login')">🔑</i>
                                    <i v-else-if="event.eventid.includes('command')">💻</i>
                                    <i v-else-if="event.eventid.includes('download')">📦</i>
                                    <i v-else-if="event.eventid.includes('log.closed')">📼</i>
                                    <i v-else>📡</i>
                                </div>
                                <div class="node-content glass-card">
                                    <div class="node-header">
                                        <h4>{{ formatEventName(event.eventid) }}</h4>
                                        <span class="node-time">{{ formatDateTime(event.timestamp) }}</span>
                                    </div>
                                    <p class="event-msg">{{ event.message }}</p>
                                    
                                    <div v-if="event.input" class="terminal-payload">
                                        <span class="prompt">root@honeypot:~#</span> <span class="cmd-text">{{ event.input }}</span>
                                    </div>
                                    <div v-if="event.username" class="auth-payload" :class="event.eventid.includes('failed') ? 'failed' : 'success'">
                                        <span class="auth-label">{{ $t('cowrie.attackDetail.user') }}:</span> {{ event.username }} <br>
                                        <span class="auth-label">{{ $t('cowrie.attackDetail.pass') }}:</span> {{ event.password }}
                                    </div>
                                    <div v-if="event.shasum && !event.ttylog" class="dl-payload">
                                        <div class="dl-url">{{ $t('cowrie.attackDetail.url') }}: {{ event.url }}</div>
                                        <div class="dl-sha">{{ $t('cowrie.attackDetail.sha') }}: {{ event.shasum }}</div>
                                    </div>
                                    <div v-if="event.ttylog" class="ttylog-payload">
                                        <div class="tty-header">{{ $t('cowrie.attackDetail.sessionCaptured') }}</div>
                                        <div class="tty-meta">
                                            <span>{{ $t('cowrie.attackDetail.size') }}: {{ (event.size / 1024).toFixed(2) }} KB</span> | 
                                            <span>{{ $t('cowrie.attackDetail.duration') }}: {{ event.duration }}s</span>
                                        </div>
                                        <div class="tty-hex-preview">{{ event.ttylog.substring(0, 100) }}...</div>
                                    </div>
                                </div>
                            </li>
                        </ul>
                        <div v-else-if="!sessionDetails?.isScannerActivity" class="empty-state">
                            {{ $t('cowrie.attackDetail.emptyState') }}
                        </div>
                    </section>
                </div>
            </transition>
        </div>

        <!-- Mappa della Sessione -->
        <div class="sub-card" v-if="sessionDetails && !loading">
            <div class="sub-card-header clickable-header" @click="toggles.showMap = !toggles.showMap">
                <div class="header-title-group">
                    <span class="animated-icon">📡</span>
                    <h3>{{ t('cowrie.attackDetail.mapTitle').toUpperCase() }}</h3>
                </div>
                <span class="arrow" :class="{ open: toggles.showMap }"></span>
            </div>
            <transition name="collapse">
                <div v-if="toggles.showMap" class="sub-card-content">
                    <section class="attack-map-section">
                        <AttackMap v-if="mapAttackData.length > 0" :attacks="mapAttackData" :showLegend="false" />
                    </section>
                </div>
            </transition>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, reactive, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { formatDateTime, formatFullDateTime, formatHumanDuration } from '../../utils/dateUtils';
import dayjs from 'dayjs';
import { useI18n } from '../../composable/useI18n';
import { useClipboard } from '../../composable/useClipboard';
import { useDossierStore } from '../../stores/dossier';
import { fetchCowrieSessionDetails, fetchCowrieSessionEvents } from '../../api';
import { ElMessage } from 'element-plus';
import AttackMap from '../../components/AttackMap.vue';
import LanguageSwitcher from '../../components/LanguageSwitcher.vue';
import ReportActions from '../../components/ReportActions.vue';

const props = defineProps({
    id: { type: String, required: true }
})

const { t } = useI18n();
const { copyToClipboard, copyFormatted, renderTemplate } = useClipboard();
const dossierStore = useDossierStore();
const route = useRoute();
const router = useRouter();
const sessionId = ref(props.id);

const sessionDetails = ref(null);
const events = ref([]);
const loading = ref(true);
const error = ref(null);

const toggles = reactive({
    showMap: false,
    showInfo: true,
    showTimeline: true
});

const copySessionSummary = () => {
    if (!sessionDetails.value) return;
    const s = sessionDetails.value;
    
    const data = {
        sessionId,
        ip: s.src_ip,
        timeWindow: `${formatDate(s.starttime)} - ${formatDate(s.endtime)}`,
        origin: s.ipDetailsId?.ipinfo ? `${s.ipDetailsId.ipinfo.city}, ${s.ipDetailsId.ipinfo.country}` : t('common.notAvailable'),
        totalEvents: events.value.length
    };
    
    copyFormatted('clipboard.telnetDetail.summary', data);
};

const copyScannerSummary = () => {
    if (!sessionDetails.value || !sessionDetails.value.scannerStats) return;
    const s = sessionDetails.value;
    const stats = s.scannerStats;
    
    const data = {
        src_ip: s.src_ip,
        totalOccurrences: stats.totalOccurrences,
        firstSeen: formatDate(stats.firstSeen),
        lastSeen: formatDate(stats.lastSeen),
        duration: formatAggregatedDuration(stats.duration)
    };
    
    // Al posto di Summary + Timeline, copiamo un'unica Analisi Scanner consolidata
    copyFormatted('clipboard.telnetDetail.scannerAnalysis', data);
};

const copyEventTimeline = () => {
    if (events.value.length === 0) return;
    
    const isRecording = dossierStore.isRecording;
    
    // Generiamo l'anteprima testuale per la clipboard
    const renderedEvents = events.value.map(event => {
        const rowData = {
            timestamp: formatFullDateTime(event.timestamp),
            eventName: formatEventName(event.eventid),
            message: event.message,
            input: event.input,
            username: event.username,
            password: event.password,
            url: event.url,
            details: (event.input ? `\n  CMD: ${event.input}` : '') + 
                     (event.username ? `\n  AUTH: ${event.username} / ${event.password}` : '') + 
                     (event.url ? `\n  URL: ${event.url}` : '')
        };
        
        const rendered = renderTemplate('clipboard.telnetDetail.timelineRow', rowData);
        
        // Se siamo in registrazione, aggiungiamo la sezione strutturata al dossier
        if (isRecording) {
            dossierStore.addSection('clipboard.telnetDetail.timelineRow', rowData, rendered);
        }
        
        return rendered;
    }).join('\n\n');
    
    const headerText = renderTemplate('clipboard.telnetDetail.timelineHeader', { sessionId });
    const footer = `\n-----------------------------------`;
    const fullText = headerText + '\n\n' + renderedEvents + footer;

    if (isRecording) {
        // Registriamo anche l'header come sezione separata (all'inizio)
        // Usiamo un trucco per metterlo prima: lo aggiungiamo manualmente al dossierStore
        dossierStore.sections.splice(dossierStore.sections.length - events.value.length, 0, {
            templateKey: 'clipboard.telnetDetail.timelineHeader',
            data: { sessionId },
            renderedText: headerText,
            timestamp: new Date().toISOString(),
            type: 'telnet'
        });
        
        ElMessage({
            message: `🔴 [REC] Timeline caricata nel dossier (${events.value.length} eventi)`,
            type: 'warning',
            duration: 3000
        });
        
        // Copiamo comunque il testo completo per comodità
        copyToClipboard(fullText, true); 
    } else {
        copyToClipboard(fullText);
    }
};

const mapAttackData = computed(() => {
    if (!sessionDetails.value) return [];
    const s = sessionDetails.value;
    return [{
        ...s,
        id: s._id || s.session,
        request: { ip: s.src_ip },
        ipDetails: s.ipDetailsId,
        dangerLevel: 2, // Hostile
        dangerScore: 0,
        rps: 0,
        totaleLogs: s.eventCount || 1,
        firstSeen: s.starttime
    }];
});

const fetchSessionData = async () => {
    loading.value = true;
    error.value = null;
    try {
        const [detailsData, eventsData] = await Promise.all([
            fetchCowrieSessionDetails(sessionId.value),
            fetchCowrieSessionEvents(sessionId.value)
        ]);
        sessionDetails.value = detailsData;
        // Gestiamo sia il caso array diretto che l'oggetto con property 'data' o 'events'
        if (Array.isArray(eventsData)) {
            events.value = eventsData;
        } else if (eventsData && eventsData.data && Array.isArray(eventsData.data)) {
            events.value = eventsData.data;
        } else if (eventsData && eventsData.events && Array.isArray(eventsData.events)) {
            events.value = eventsData.events;
        } else {
            events.value = [];
        }
    } catch (err) {
        error.value = t('cowrie.attackDetail.errorSync');
        console.error(err);
    } finally {
        loading.value = false;
    }
};

const formatAggregatedDuration = (duration) => {
    if (duration === undefined || duration === null) return '-';
    return formatHumanDuration(duration, t);
};

const formatDate = (dateStr) => {
    if (!dateStr) return t('common.notAvailable');
    return formatFullDateTime(dateStr);
};

const goToIpDetails = (ip) => {
    router.push({
        name: 'IpDetails',
        params: { ip }
    });
};

const formatEventName = (eventId) => {
    if (!eventId) return t('cowrie.attackDetail.unknownEvent');
    return eventId.replace('cowrie.', '').replace(/\./g, ' ').toUpperCase();
};

const getEventTypeClass = (eventId) => {
    if (eventId.includes('login.failed')) return 'type-danger';
    if (eventId.includes('login.success')) return 'type-success';
    if (eventId.includes('command')) return 'type-terminal';
    if (eventId.includes('download')) return 'type-warning';
    return 'type-info';
};

onMounted(() => {
    fetchSessionData();
});

// Sincronizzazione Prop -> Ref (per back/forward browser)
watch(() => props.id, (newId) => {
    if (newId && newId !== sessionId.value) {
        sessionId.value = newId;
        fetchSessionData();
    }
});
</script>

<style scoped src="./CowrieAttackDetail.css"></style>
