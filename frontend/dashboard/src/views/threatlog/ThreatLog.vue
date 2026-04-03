<template>
    <div class="threatlog-details">
        <div class="header-top">
            <button @click="goBack" class="back-btn">← {{ t('threatLog.backToLogs') }}</button>
            <LanguageSwitcher />
        </div>
        <h1><span class="animated-icon pulse-amber">🗄️</span> {{ t('threatLog.title') }}: {{ id }}</h1>

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
                        <p><strong>{{ t('ipDetails.country') }}:</strong> {{ log.geo.country ||
                            t('common.notAvailable') }}</p>
                        <p><strong>{{ t('ipDetails.region') }}:</strong> {{ log.geo.region ||
                            t('common.notAvailable') }}</p>
                        <p><strong>{{ t('ipDetails.city') }}:</strong> {{ log.geo.city ||
                            t('common.notAvailable') }}</p>
                        <p><strong>{{ t('threatLog.coordinates') }}:</strong> {{ log.geo.coordinates?.join(', ') ||
                            t('common.notAvailable') }}</p>
                        <p><strong>{{ t('ipDetails.timezone') }}:</strong> {{ log.geo.timezone ||
                            t('common.notAvailable') }}</p>
                        <p><strong>ASN:</strong> {{ log.geo.asn || t('common.notAvailable') }}</p>
                        <p><strong>ISP:</strong> {{ log.geo.isp || t('common.notAvailable') }}</p>
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
                        <p><strong>{{ t('common.timestamp') }}:</strong> {{ formatDate(log.timestamp) }}</p>
                        <p><strong>{{ t('threatLog.techniques') }}:</strong></p>
                        <ul style="margin-bottom: 15px;">
                            <li v-for="(ind, i) in log.fingerprint.indicators" :key="i">{{ ind }}</li>
                        </ul>

                        <div class="analysis-meta" style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 10px; margin-top: 10px;">
                            <p v-if="log.metadata?.eventCount > 1"><strong>Aggregated Events:</strong> {{ log.metadata.eventCount }}</p>
                            <p><strong>{{ t('threatLog.isBot') }}</strong> {{ log.metadata.isBot ? t('threatLog.yes') : t('threatLog.no') }}</p>
                            <p><strong>{{ t('threatLog.isCrawler') }}</strong> {{ log.metadata.isCrawler ? t('threatLog.yes') : t('threatLog.no') }}</p>
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
