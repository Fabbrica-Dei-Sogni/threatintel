<template>
    <div class="cowrie-detail attacchi">
        <div class="header-top">
            <h1><span class="animated-icon pulse-jade">👾</span> {{ $t('cowrie.attackDetail.title') }}</h1>
            <LanguageSwitcher />
        </div>
        <div class="actions">
            <button @click="$router.back()" class="btn-action">{{ $t('cowrie.attackDetail.backToSessions') }}</button>
            <button @click="downloadReport" :disabled="loadingReport" class="btn-action report-btn">
                <span v-if="loadingReport" class="spinner-small"></span>
                <span v-else>📄</span> {{ $t('common.generateReport') }}
            </button>
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
                                <button @click.stop="copyToClipboard(sessionDetails.src_ip)" class="btn-copy-mini" :title="$t('cowrie.attackDetail.copy')">📋</button>
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
                    <span class="animated-icon">📊</span>
                    <h3>{{ t('cowrie.attackDetail.eventTimeline').toUpperCase() }}</h3>
                </div>
                <div class="header-actions">
                    <span class="copy-log-btn" @click.stop="copyEventTimeline()" :title="t('common.copy')">📋</span>
                    <span class="arrow" :class="{ open: toggles.showTimeline }"></span>
                </div>
            </div>
            <transition name="collapse">
                <div v-if="toggles.showTimeline" class="sub-card-content p-24">
                    <section class="timeline-container">
                        <ul class="cyber-timeline">
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
                                        <span class="node-time">{{ dayjs(event.timestamp).format('HH:mm:ss') }}</span>
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
                        <div v-if="events.length === 0" class="empty-state">
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
import { ref, onMounted, computed, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import dayjs from 'dayjs';
import { useI18n } from '../../composable/useI18n';
import { useClipboard } from '../../composable/useClipboard';
import { fetchCowrieSessionDetails, fetchCowrieSessionEvents, fetchReport } from '../../api';
import AttackMap from '../../components/AttackMap.vue';
import LanguageSwitcher from '../../components/LanguageSwitcher.vue';

const { t } = useI18n();
const { copyToClipboard } = useClipboard();
const loadingReport = ref(false);
const route = useRoute();
const router = useRouter();
const sessionId = route.params.id;

const downloadReport = async () => {
    loadingReport.value = true;
    try {
        const blob = await fetchReport({
            type: 'telnet',
            sessionId,
            format: 'pdf'
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `dossier_telnet_${sessionId}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Error downloading report:', err);
    } finally {
        loadingReport.value = false;
    }
};

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
    let text = `--- TELNET SESSION SUMMARY ---\n`;
    text += `Session ID: ${sessionId}\n`;
    text += `Hostile IP: ${s.src_ip}\n`;
    text += `Time Window: ${formatDate(s.starttime)} - ${formatDate(s.endtime)}\n`;
    if (s.ipDetailsId?.ipinfo) {
        text += `Origin: ${s.ipDetailsId.ipinfo.city}, ${s.ipDetailsId.ipinfo.country}\n`;
    }
    text += `Total Events: ${events.value.length}\n`;
    text += `------------------------------`;
    copyToClipboard(text);
};

const copyEventTimeline = () => {
    if (events.value.length === 0) return;
    let text = `--- TELNET OPERATIONAL TIMELINE ---\n`;
    text += `Session ID: ${sessionId}\n\n`;
    
    events.value.forEach(event => {
        text += `[${dayjs(event.timestamp).format('HH:mm:ss')}] ${formatEventName(event.eventid)}\n`;
        text += `> ${event.message}\n`;
        if (event.input) text += `  CMD: ${event.input}\n`;
        if (event.username) text += `  AUTH: ${event.username} / ${event.password}\n`;
        if (event.url) text += `  URL: ${event.url}\n`;
        text += `\n`;
    });
    
    text += `-----------------------------------`;
    copyToClipboard(text);
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
            fetchCowrieSessionDetails(sessionId),
            fetchCowrieSessionEvents(sessionId)
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

const formatDate = (dateStr) => {
    if (!dateStr) return t('common.notAvailable');
    return dayjs(dateStr).format('DD/MM/YYYY HH:mm:ss');
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
</script>

<style scoped src="./CowrieAttackDetail.css"></style>
