<template>
    <div class="threatlog-details">
        <div class="header-top">
            <button @click="goBack" class="back-btn">← {{ t('threatLog.backToLogs') }}</button>
            <LanguageSwitcher />
        </div>
        <h1><span class="animated-icon pulse-amber">🗄️</span> {{ t('threatLog.title') }}</h1>

        <section v-if="loading" class="loading">{{ t('common.loading') }}</section>
        <section v-if="error" class="error">{{ t('common.error') }}</section>

        <div v-if="log" class="sections">

            <div class="section">
                <div class="section-header" @click="toggles.geo = !toggles.geo">
                    <h2><span>🛰️</span> {{ t('threatLog.geolocation') }}</h2>
                    <span class="arrow" :class="{ open: toggles.geo }"></span>
                </div>
                <transition name="collapse">
                    <div v-if="toggles.geo" class="section-body">
                        <div class="briefing-grid">
                            <div class="briefing-item">
                                <CountryFlag :countryCode="log.geo.country" class="briefing-flag" />
                                <div class="briefing-content">
                                    <span class="briefing-label">{{ t('ipDetails.country').toUpperCase() }}</span>
                                    <span class="briefing-value">{{ log.geo.country || t('common.notAvailable') }}</span>
                                </div>
                            </div>
                            <div class="briefing-item">
                                <span class="briefing-icon">📍</span>
                                <div class="briefing-content">
                                    <span class="briefing-label">{{ t('ipDetails.city').toUpperCase() }} / {{ t('ipDetails.region').toUpperCase() }}</span>
                                    <span class="briefing-value">{{ log.geo.city || '-' }}, {{ log.geo.region || '-' }}</span>
                                </div>
                            </div>
                            <div class="briefing-item">
                                <span class="briefing-icon">🕒</span>
                                <div class="briefing-content">
                                    <span class="briefing-label">{{ t('threatLog.coordinates').toUpperCase() }} / GPS</span>
                                    <div class="briefing-value">{{ log.geo.coordinates?.join(', ') || '-' }} ({{ log.geo.timezone || '-' }})</div>
                                </div>
                            </div>
                            <div class="briefing-item">
                                <span class="briefing-icon">🏢</span>
                                <div class="briefing-content">
                                    <span class="briefing-label">ASN / ISP</span>
                                    <div class="briefing-value" :title="log.geo.isp">{{ log.geo.asn || '-' }} ({{ log.geo.isp || '-' }})</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </transition>
            </div>

            <div class="section">
                <div class="section-header" @click="toggles.fingerprint = !toggles.fingerprint">
                    <h2><span>🔍</span> {{ t('threatLog.analysis') }}</h2>
                    <span class="arrow" :class="{ open: toggles.fingerprint }"></span>
                </div>
                <transition name="collapse">
                    <div v-if="toggles.fingerprint" class="section-body">
                        <!-- Tactical HUD -->
                        <div class="hud-stats-row">
                            <div class="hud-stat-box">
                                <span class="hud-box-icon">🕒</span>
                                <div class="hud-stat-data">
                                    <span class="hud-label">{{ t('common.timestamp').toUpperCase() }}</span>
                                    <div class="hud-value">{{ formatDate(log.timestamp) }}</div>
                                </div>
                            </div>
                            <div v-if="log.metadata?.eventCount > 1" class="hud-stat-box">
                                <span class="hud-box-icon">📊</span>
                                <div class="hud-stat-data">
                                    <span class="hud-label">EVENTS</span>
                                    <div class="hud-value highlight">x{{ log.metadata.eventCount }}</div>
                                </div>
                            </div>
                            <div class="hud-stat-box">
                                <span class="hud-box-icon">🤖</span>
                                <div class="hud-stat-data">
                                    <span class="hud-label">BOT STATUS</span>
                                    <div class="hud-value">
                                        <span class="status-badge" :class="log.metadata.isBot ? 'yes' : 'no'">
                                            {{ log.metadata.isBot ? t('threatLog.yes') : t('threatLog.no') }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div class="hud-stat-box">
                                <span class="hud-box-icon">🕷️</span>
                                <div class="hud-stat-data">
                                    <span class="hud-label">CRAWLER</span>
                                    <div class="hud-value">
                                        <span class="status-badge" :class="log.metadata.isCrawler ? 'yes' : 'no'">
                                            {{ log.metadata.isCrawler ? t('threatLog.yes') : t('threatLog.no') }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Techniques Tags -->
                        <div class="analysis-techniques mt-20">
                            <span class="briefing-label">{{ t('threatLog.techniques').toUpperCase() }}</span>
                            <div class="techniques-container">
                                <span v-for="(ind, i) in log.fingerprint.indicators" :key="i" class="tech-tag">
                                    {{ ind }}
                                </span>
                                <span v-if="!log.fingerprint.indicators?.length" class="briefing-value" style="opacity: 0.5; font-style: italic;">
                                    {{ t('common.notAvailable') }}
                                </span>
                            </div>
                        </div>
                    </div>
                </transition>
            </div>

            <div class="section">
                <div class="section-header" @click="toggles.request = !toggles.request">
                    <h2><span>📡</span> {{ t('threatLog.request') }}</h2>
                    <span class="arrow" :class="{ open: toggles.request }"></span>
                </div>
                <transition name="collapse">
                    <div v-if="toggles.request" class="section-body">
                        <div class="log-details-meta">
                            <p class="attacker-link-row">
                                <span @click="goToIpDetails(log.request.ip)" class="ip-link-value"> 
                                    {{ log.request.ip || t('common.notAvailable') }} 
                                </span>
                                <span class="copy-btn-inline" @click.stop="copyFormatted('clipboard.ip', { ip: log.request.ip })" :title="t('common.copyIp')">📋</span>
                            </p>
                            <div class="meta-row">
                                <span class="meta-label">{{ t('threatLog.method') }}:</span>
                                <span class="method-badge-styled">
                                    {{ log.request.method || t('common.notAvailable') }}
                                </span>
                            </div>
                            <div class="meta-row">
                                <span class="meta-label">{{ t('threatLog.url') }}:</span>
                                <span class="url-text-styled" :title="log.request.url">
                                    {{ log.request.url || t('common.notAvailable') }}
                                </span>
                            </div>
                            <div class="meta-row align-start">
                                <span class="meta-label">{{ t('threatLog.userAgent') }}:</span>
                                <span class="ua-value-styled" :title="log.request.userAgent">
                                    {{ log.request.userAgent || t('common.notAvailable') }}
                                </span>
                            </div>
                        </div>

                        <!-- Tabs System -->
                        <div class="log-tabs-container">
                            <div class="log-tabs-header">
                                <button
                                    @click="activeLogTab = 'request'"
                                    class="tab-btn"
                                    :class="{ active: activeLogTab === 'request' }"
                                >
                                    {{ t('threatLog.request').toUpperCase() }}
                                </button>
                                <button
                                    v-if="log.request.headers"
                                    @click="activeLogTab = 'headers'"
                                    class="tab-btn"
                                    :class="{ active: activeLogTab === 'headers' }"
                                >
                                    {{ t('threatLog.headers').toUpperCase() }}
                                </button>
                                <button
                                    v-if="log.request.body"
                                    @click="activeLogTab = 'body'"
                                    class="tab-btn"
                                    :class="{ active: activeLogTab === 'body' }"
                                >
                                    {{ t('threatLog.body').toUpperCase() }}
                                </button>
                                <button
                                    v-if="log.response"
                                    @click="activeLogTab = 'response'"
                                    class="tab-btn"
                                    :class="{ active: activeLogTab === 'response' }"
                                >
                                    {{ t('threatLog.response').toUpperCase() }}
                                </button>
                            </div>

                            <div class="tab-content-viewer">
                                <HexViewer v-if="activeLogTab === 'request'" :raw-data="log.request" :label="t('threatLog.request')" />
                                <HexViewer v-if="activeLogTab === 'headers'" :raw-data="log.request.headers" :label="t('threatLog.headers')" />
                                <HexViewer v-if="activeLogTab === 'body'" :raw-data="log.request.body" :label="t('threatLog.body')" />
                                <HexViewer v-if="activeLogTab === 'response'" :raw-data="log.response" :label="t('threatLog.response')" />
                            </div>
                        </div>
                    </div>
                </transition>
            </div>


        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { fetchLogById } from '../../api/index'
import { useI18n } from 'vue-i18n'
import HexViewer from '../../components/HexViewer.vue';
import { useClipboard } from '../../composable/useClipboard';
import LanguageSwitcher from '../../components/LanguageSwitcher.vue';
import CountryFlag from '../../components/CountryFlag.vue';

const { t } = useI18n();
const { copyToClipboard, copyFormatted } = useClipboard();

const route = useRoute()
const router = useRouter()

const id = ref('')
const log = ref(null)
const loading = ref(false)
const error = ref(false)
const activeLogTab = ref('request')

const toggles = reactive({
    fingerprint: true,
    request: false,
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
    return s ? dayjs(s).format('DD/MM/YYYY HH:mm:ss') : t('common.notAvailable')
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

watch(() => route.params.id, (newId) => {
    if (newId) load()
})
</script>

<style scoped src="./ThreatLog.css"></style>
