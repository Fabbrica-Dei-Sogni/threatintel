<template>
    <div class="threatlog-details">
        <button @click="goBack" class="back-btn">← {{ t('threatLog.backToLogs') }}</button>
        <h1>{{ t('threatLog.title') }}: {{ id }}</h1>

        <section v-if="loading" class="loading">{{ t('common.loading') }}</section>
        <section v-if="error" class="error">{{ t('common.error') }}</section>

        <div v-if="log" class="sections">

            <div class="section">
                <div class="section-header" @click="toggles.general = !toggles.general">
                    <h2>{{ t('threatLog.generalInfo') }}</h2>
                    <span class="arrow" :class="{ open: toggles.general }"></span>
                </div>
                <transition name="collapse">
                    <div v-if="toggles.general" class="section-body">
                        <p><strong>ID:</strong> {{ log.id }}</p>
                        <p><strong>Timestamp:</strong> {{ formatDate(log.timestamp) }}</p>
                    </div>
                </transition>
            </div>
            <div class="section">
                <div class="section-header" @click="toggles.geo = !toggles.geo">
                    <h2>{{ t('threatLog.geolocation') }}</h2>
                    <span class="arrow" :class="{ open: toggles.geo }"></span>
                </div>
                <transition name="collapse">
                    <div v-if="toggles.geo" class="section-body">
                        <p><strong>{{ t('ipDetails.country') }}:</strong> {{ log.geo.country ||
                            t('components.radar.notAvailable') }}</p>
                        <p><strong>{{ t('ipDetails.region') }}:</strong> {{ log.geo.region ||
                            t('components.radar.notAvailable') }}</p>
                        <p><strong>{{ t('ipDetails.city') }}:</strong> {{ log.geo.city ||
                            t('components.radar.notAvailable') }}</p>
                        <p><strong>{{ t('threatLog.coordinates') }}:</strong> {{ log.geo.coordinates?.join(', ') ||
                            t('components.radar.notAvailable') }}</p>
                        <p><strong>{{ t('ipDetails.timezone') }}:</strong> {{ log.geo.timezone ||
                            t('components.radar.notAvailable') }}</p>
                        <p><strong>ASN:</strong> {{ log.geo.asn || t('components.radar.notAvailable') }}</p>
                        <p><strong>ISP:</strong> {{ log.geo.isp || t('components.radar.notAvailable') }}</p>
                    </div>
                </transition>
            </div>

            <div class="section">
                <div class="section-header" @click="toggles.fingerprint = !toggles.fingerprint">
                    <h2>{{ t('threatLog.analysis') }}</h2>
                    <span class="arrow" :class="{ open: toggles.fingerprint }"></span>
                </div>
                <transition name="collapse">
                    <div v-if="toggles.fingerprint" class="section-body">
                        <p><strong>Hash:</strong> {{ log.fingerprint.hash || t('components.radar.notAvailable') }}</p>
                        <p><strong>{{ t('threatLog.techniques') }}:</strong></p>
                        <ul>
                            <li v-for="(ind, i) in log.fingerprint.indicators" :key="i">{{ ind }}</li>
                        </ul>
                    </div>
                </transition>
            </div>

            <div class="section">
                <div class="section-header" @click="toggles.request = !toggles.request">
                    <h2>{{ t('threatLog.request') }}</h2>
                    <span class="arrow" :class="{ open: toggles.request }"></span>
                </div>
                <transition name="collapse">
                    <div v-if="toggles.request" class="section-body">
                        <p @click="goToIpDetails(log.request.ip)" class="link" style="cursor: pointer;">
                            <strong>IP:</strong> {{ log.request.ip || t('components.radar.notAvailable') }}
                        </p>
                        <p><strong>{{ t('threatLog.method') }}:</strong> {{ log.request.method ||
                            t('components.radar.notAvailable') }}</p>
                        <p><strong>{{ t('threatLog.url') }}:</strong> {{ log.request.url ||
                            t('components.radar.notAvailable') }}</p>
                        <p><strong>{{ t('threatLog.userAgent') }}:</strong> {{ log.request.userAgent ||
                            t('components.radar.notAvailable')
                            }}</p>
                        <!--
                        <p><strong>Referer:</strong> {{ log.request.referer || t('components.radar.notAvailable') }}</p>
                    -->
                        <HexViewer v-if="log.request" :raw-data="log.request" :label="t('threatLog.request')" />
                        <HexViewer v-if="log.request.body" :raw-data="log.request.body" :label="t('threatLog.body')" />
                        <HexViewer v-if="log.request.headers" :raw-data="log.request.headers"
                            :label="t('threatLog.headers')" />
                        <HexViewer v-if="log.response" :raw-data="log.response" :label="t('threatLog.response')" />
                        <!-- commentati perchè forse informazioni inutili-->
                        <!--
                        <HexViewer v-if="log.response.query" :raw-data="log.response.query" label="Query" />
                        <HexViewer v-if="log.response.cookies" :raw-data="log.response.cookies" label="Cookies" />
                        -->
                    </div>
                </transition>
            </div>

            <div class="section">
                <div class="section-header" @click="toggles.metadata = !toggles.metadata">
                    <h2>{{ t('threatLog.metadata') }}</h2>
                    <span class="arrow" :class="{ open: toggles.metadata }"></span>
                </div>
                <transition name="collapse">
                    <div v-if="toggles.metadata" class="section-body">
                        <!--
                       <p><strong>Session ID:</strong> {{ log.metadata.sessionId || t('components.radar.notAvailable')
                        }}</p>
                    -->
                        <p><strong>{{ t('threatLog.userAgent') }}</strong></p>
                        <pre>{{ formatJson(log.metadata.userAgent_parsed) }}</pre>
                        <p><strong>{{ t('threatLog.isBot') }}</strong> {{ log.metadata.isBot ? t('threatLog.yes') :
                            t('threatLog.no') }}
                        </p>
                        <p><strong>{{ t('threatLog.isCrawler') }}</strong> {{ log.metadata.isCrawler ?
                            t('threatLog.yes') :
                            t('threatLog.no') }}</p>
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
import HexViewer from '../../components/HexViewer.vue'; // <--- AGGIUNGI QUESTO

const { t } = useI18n();

const route = useRoute()
const router = useRouter()

const id = ref('')
const log = ref(null)
const loading = ref(false)
const error = ref(false)

const toggles = reactive({
    general: true,
    fingerprint: true,
    request: false,
    metadata: false,
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
    return s ? dayjs(s).format('DD/MM/YYYY HH:mm:ss') : 'N/D'
}

function formatJson(o) {
    return o ? JSON.stringify(o, null, 2) : 'N/D'
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
