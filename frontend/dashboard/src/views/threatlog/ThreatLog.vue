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
                        <div class="log-details-meta" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
                            <p class="link" style="margin-bottom: 5px;">
                                <span @click="goToIpDetails(log.request.ip)" style="cursor: pointer; font-weight: bold; font-size: 1.1em; color: #FFD700;"> 
                                    {{ log.request.ip || t('common.notAvailable') }} 
                                </span>
                                <span class="copy-btn-inline" @click.stop="copyFormatted('clipboard.ip', { ip: log.request.ip })" :title="t('common.copyIp')">📋</span>
                            </p>
                            <div class="meta-row" style="display: flex; align-items: center; gap: 10px;">
                                <span class="meta-label" style="color: #BBA685; font-weight: 800; font-size: 0.8rem; text-transform: uppercase;">{{ t('threatLog.method') }}:</span>
                                <span class="method-badge" style="background: rgba(255, 179, 0, 0.15); color: #FFB300; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 0.8em; border: 1px solid rgba(255, 179, 0, 0.3);">
                                    {{ log.request.method || t('common.notAvailable') }}
                                </span>
                            </div>
                            <div class="meta-row" style="display: flex; align-items: center; gap: 10px;">
                                <span class="meta-label" style="color: #BBA685; font-weight: 800; font-size: 0.8rem; text-transform: uppercase;">{{ t('threatLog.url') }}:</span>
                                <span class="url-text" :title="log.request.url" style="color: #F4EBD0; opacity: 0.9; font-family: 'JetBrains Mono', monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60vw;">
                                    {{ log.request.url || t('common.notAvailable') }}
                                </span>
                            </div>
                            <div class="meta-row" style="display: flex; align-items: flex-start; gap: 10px;">
                                <span class="meta-label" style="color: #BBA685; font-weight: 800; font-size: 0.8rem; text-transform: uppercase;">{{ t('threatLog.userAgent') }}:</span>
                                <span class="ua-value" :title="log.request.userAgent" style="color: #aaa; font-style: italic; font-size: 0.8rem;">
                                    {{ log.request.userAgent || t('common.notAvailable') }}
                                </span>
                            </div>
                        </div>

                        <!-- Tabs System -->
                        <div class="log-tabs-container">
                            <div class="log-tabs" style="display: flex; gap: 4px; border-bottom: 1px solid rgba(230, 33, 23, 0.2); margin-bottom: 12px;">
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

                            <div class="tab-content" style="animation: tabFadeIn 0.3s ease-out; background-color: #050303; padding: 15px; border-radius: 8px; border: 1px solid rgba(230, 33, 23, 0.15);">
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
import { ref, reactive, onMounted } from 'vue'
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

function formatJson(o) {
    return o ? JSON.stringify(o, null, 2) : t('common.notAvailable')
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
</script>

<style scoped src="./ThreatLog.css"></style>
