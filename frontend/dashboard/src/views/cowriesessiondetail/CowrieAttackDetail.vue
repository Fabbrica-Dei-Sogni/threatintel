<template>
    <div class="cowrie-detail">
        <div class="header-with-lang">
            <h1><span class="pulse">🔴</span> {{ $t('cowrie.attackDetail.title') }}</h1>
            <LanguageSwitcher />
        </div>
        <p class="subtitle">{{ $t('cowrie.attackDetail.subtitle') }}: <span class="hash">{{ sessionId }}</span> ({{ $t('cowrie.attackDetail.rawEvents') }}: {{ events.length }})</p>
        
        <div class="actions">
            <button @click="$router.back()" class="btn-action">{{ $t('cowrie.attackDetail.backToSessions') }}</button>
        </div>

        <div class="glass-card info-card" v-if="sessionDetails">
            <div class="info-grid">
                <div class="info-item">
                    <span class="label">{{ $t('cowrie.attackDetail.hostileIp') }}</span>
                    <span class="value ip">{{ sessionDetails.src_ip }}</span>
                </div>
                <div class="info-item">
                    <span class="label">{{ $t('cowrie.attackDetail.timeWindow') }}</span>
                    <span class="value">{{ formatDate(sessionDetails.starttime) }} - {{ formatDate(sessionDetails.endtime) }}</span>
                </div>
                <div class="info-item" v-if="sessionDetails.ipDetailsId?.ipinfo?.country">
                    <span class="label">{{ $t('cowrie.attackDetail.origin') }}</span>
                    <span class="value geo">📍 {{ sessionDetails.ipDetailsId.ipinfo.city }}, {{ sessionDetails.ipDetailsId.ipinfo.country }}</span>
                </div>
            </div>
        </div>

        <div v-if="loading" class="loading-state">
            <div class="spinner"></div>
            <span>{{ $t('cowrie.attackDetail.loading') }}</span>
        </div>
        
        <div v-if="error" class="error-box">{{ error }}</div>

        <section class="timeline-container" v-if="!loading && !error">
            <ul class="cyber-timeline">
                <li v-for="(event, index) in events" :key="event._id" class="timeline-node" :style="{ animationDelay: `${index * 0.1}s` }">
                    <div class="time-marker">{{ formatTimeOnly(event.timestamp) }}</div>
                    <div class="node-icon" :class="getEventTypeClass(event.eventid)">
                        <i v-if="event.eventid.includes('login')">🔑</i>
                        <i v-else-if="event.eventid.includes('command')">>_</i>
                        <i v-else-if="event.eventid.includes('download')">📦</i>
                        <i v-else>📡</i>
                    </div>
                    <div class="node-content glass-card">
                        <h4>{{ formatEventName(event.eventid) }}</h4>
                        <p class="event-msg">{{ event.message }}</p>
                        
                        <div v-if="event.input" class="terminal-payload">
                            <span class="prompt">root@honeypot:~#</span> <span class="cmd-text">{{ event.input }}</span>
                        </div>
                        <div v-if="event.username" class="auth-payload" :class="event.eventid.includes('failed') ? 'failed' : 'success'">
                            <span class="auth-label">USER:</span> {{ event.username }} <br>
                            <span class="auth-label">PASS:</span> {{ event.password }}
                        </div>
                        <div v-if="event.shasum" class="dl-payload">
                            <div class="dl-url">URL: {{ event.url }}</div>
                            <div class="dl-sha">SHA: {{ event.shasum }}</div>
                        </div>
                    </div>
                </li>
            </ul>
            <div v-if="events.length === 0" class="empty-state">
                {{ $t('cowrie.attackDetail.emptyState') }}
            </div>
        </section>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import dayjs from 'dayjs';
import { useI18n } from '../../composable/useI18n';
import { fetchCowrieSessionDetails, fetchCowrieSessionEvents } from '../../api';
import LanguageSwitcher from '../../components/LanguageSwitcher.vue';

const { t } = useI18n();
const route = useRoute();
const sessionId = route.params.id;

const sessionDetails = ref(null);
const events = ref([]);
const loading = ref(true);
const error = ref(null);

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
    if (!dateStr) return '-';
    return dayjs(dateStr).format('DD/MM/YYYY HH:mm:ss');
};

const formatTimeOnly = (dateStr) => {
    if (!dateStr) return '-';
    return dayjs(dateStr).format('HH:mm:ss');
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
