<template>
  <div class="ip-details" :class="'skin-' + dashboardSkin">
    <GlobalHeader context="ip-details" />

    <div class="back-navigation">
      <button @click="goBack" class="back-btn">← {{ t('ipDetails.backToAttacks').toUpperCase() }}</button>
      <button @click="goToCampaigns" class="back-btn">🧬 {{ t('campaigns.title').toUpperCase() }}</button>
      <button v-if="authStore.isAuthenticated" @click="forzaArricchimento" :disabled="loadingEnrich"
        class="refresh-btn">
        <span v-if="loadingEnrich" class="spinner"></span>
        {{ (loadingEnrich ? t('common.loading') : t('ipDetails.forceRefresh')).toUpperCase() }}
      </button>
    </div>

    <!-- IP Hero Header -->
    <div class="ip-hero-header" v-if="ip">
      <div class="hero-content-wrapper">
        <div class="hero-main">
          <h1>
            <span class="animated-icon pulse-cobalt">🔍</span> 
            <span class="title-text">{{ t('ipDetails.title').toUpperCase() }}:</span> 
            <span class="ip-value">{{ ip }}</span>
            <button class="action-btn copy-ip-btn" @click="copyMainIp(ip)" :title="t('common.copyToClipboard')">
              <span v-if="!copiedIp">📋</span>
              <span v-else>✅</span>
            </button>
          </h1>
        </div>
      </div>
    </div>

    <ReportActions type="ip" :ip="ip" filename="dossier_ip" mode="sticky" accentColor="#00D4FF" />

    <div v-if="ipInfo" class="briefing-wrapper">
      <!-- BLOCK 1: GEOGRAPHIC INTELLIGENCE -->
      <div class="forensic-briefing briefing-geo">
        <div class="briefing-header" @click="toggles.geo = !toggles.geo">
          <span class="briefing-icon">🌍</span> {{ t('ipDetails.location').toUpperCase() }}
          <div class="header-actions">
            <span class="copy-log-btn" @click.stop="copyGeoInfo()" :title="t('common.copy')">📋</span>
            <span class="arrow" :class="{ open: toggles.geo }"></span>
          </div>
        </div>
        <transition name="collapse">
          <div v-if="toggles.geo" class="briefing-grid">
            <div class="briefing-item country-box" :data-briefing-tooltip="ipInfo.ipinfo?.country">
              <CountryFlag :countryCode="ipInfo.ipinfo?.country" class="briefing-flag" />
              <div class="briefing-content">
                <span class="briefing-label">{{ t('ipDetails.country').toUpperCase() }}</span>
                <span class="briefing-value">{{ ipInfo.ipinfo?.country || t('common.notAvailable') }}</span>
              </div>
            </div>
            <div class="briefing-item"
              :data-briefing-tooltip="`${ipInfo.ipinfo?.city || '-'}, ${ipInfo.ipinfo?.region || '-'}`">
              <span class="briefing-icon">📍</span>
              <div class="briefing-content">
                <span class="briefing-label">{{ t('ipDetails.city').toUpperCase() }} / {{
                  t('ipDetails.region').toUpperCase() }}</span>
                <span class="briefing-value">{{ ipInfo.ipinfo?.city || '-' }}, {{ ipInfo.ipinfo?.region || '-' }}</span>
              </div>
            </div>
            <div class="briefing-item timezone-box"
              :data-briefing-tooltip="`${ipInfo.ipinfo?.timezone || '-'} (${ipInfo.ipinfo?.loc || '-'})`">
              <span class="briefing-icon">🕒</span>
              <div class="briefing-content">
                <span class="briefing-label">{{ t('ipDetails.timezone').toUpperCase() }} / GPS</span>
                <div class="briefing-value">{{ ipInfo.ipinfo?.timezone || '-' }} ({{ ipInfo.ipinfo?.loc || '-' }})</div>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <!-- BLOCK 2: NETWORK INTELLIGENCE -->
      <div class="forensic-briefing briefing-net">
        <div class="briefing-header" @click="toggles.net = !toggles.net">
          <span class="briefing-icon">🛡️</span> {{ t('ipDetails.networkInfo').toUpperCase() }}
          <div class="header-actions">
            <span class="copy-log-btn" @click.stop="copyNetInfo()" :title="t('common.copy')">📋</span>
            <span class="arrow" :class="{ open: toggles.net }"></span>
          </div>
        </div>
        <transition name="collapse">
          <div v-if="toggles.net" class="briefing-grid">
            <div class="briefing-item" :data-briefing-tooltip="ipInfo.ipinfo?.org">
              <span class="briefing-icon">🏢</span>
              <div class="briefing-content">
                <span class="briefing-label">{{ t('ipDetails.organization').toUpperCase() }}</span>
                <span class="briefing-value">{{ ipInfo.ipinfo?.org || t('common.notAvailable') }}</span>
              </div>
            </div>
            <div class="briefing-item" :data-briefing-tooltip="ipInfo.ipinfo?.hostname">
              <span class="briefing-icon">🌐</span>
              <div class="briefing-content">
                <span class="briefing-label">{{ t('ipDetails.isp').toUpperCase() }} / {{
                  t('ipDetails.hostname').toUpperCase() }}</span>
                <span class="briefing-value">{{ ipInfo.ipinfo?.hostname || t('common.notAvailable') }}</span>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <div class="forensic-briefing briefing-abuse"
        :class="{ 'high-risk': ipInfo.abuseipdbId?.abuseConfidenceScore > 50 }">
        <div class="briefing-header" @click="toggles.abuse = !toggles.abuse">
          <span class="briefing-icon animated-icon pulse-alarm">🚨</span> {{
            t('ipDetails.abuseReportingTitle').toUpperCase() }}
          <div class="header-actions">
            <span class="copy-log-btn" @click.stop="copyAbuseSummary()" :title="t('common.copy')">📋</span>
            <span class="arrow" :class="{ open: toggles.abuse }"></span>
          </div>
        </div>
        <transition name="collapse">
          <div v-if="toggles.abuse">
            <div v-if="ipInfo.abuseipdbId" class="briefing-grid">
              <div class="briefing-item"
                :data-briefing-tooltip="`${t('ipDetails.confidence').toUpperCase()}: ${ipInfo.abuseipdbId.abuseConfidenceScore}%`">
                <div class="score-radial" :style="{ '--score': ipInfo.abuseipdbId.abuseConfidenceScore || 0 }">
                  {{ ipInfo.abuseipdbId.abuseConfidenceScore }}%
                </div>
                <div class="briefing-content">
                  <span class="briefing-label">{{ t('ipDetails.confidence').toUpperCase() }}</span>
                  <span class="briefing-value">{{ ipInfo.abuseipdbId.abuseConfidenceScore }}%</span>
                </div>
              </div>
              <div class="briefing-item"
                :data-briefing-tooltip="ipInfo.abuseipdbId.isListed ? t('ipDetails.isListed').toUpperCase() : t('common.no').toUpperCase()">
                <span class="briefing-icon" :class="ipInfo.abuseipdbId.isListed ? 'text-danger' : 'text-success'">
                  {{ ipInfo.abuseipdbId.isListed ? '🚫' : '✅' }}
                </span>
                <div class="briefing-content">
                  <span class="briefing-label">{{ t('ipDetails.isListed').toUpperCase() }}</span>
                  <span class="briefing-value">{{ ipInfo.abuseipdbId.isListed ? t('common.yes').toUpperCase() :
                    t('common.no').toUpperCase() }}</span>
                </div>
              </div>
              <div class="briefing-item"
                :data-briefing-tooltip="`${t('ipDetails.totalReports').toUpperCase()}: ${ipInfo.abuseipdbId.totalReports || 0}`">
                <span class="briefing-icon">📜</span>
                <div class="briefing-content">
                  <span class="briefing-label">{{ t('ipDetails.totalReports').toUpperCase() }}</span>
                  <span class="briefing-value">{{ ipInfo.abuseipdbId.totalReports || 0 }}</span>
                </div>
              </div>
              <div class="briefing-item"
                :data-briefing-tooltip="ipInfo.abuseipdbId.lastReportedAt ? `${t('ipDetails.lastReportedAt').toUpperCase()}: ${formatFullDateTime(ipInfo.abuseipdbId.lastReportedAt)}` : t('common.notAvailable').toUpperCase()">
                <span class="briefing-icon">🕒</span>
                <div class="briefing-content">
                  <span class="briefing-label">{{ t('ipDetails.lastReportedAt').toUpperCase() }}</span>
                  <div class="briefing-value">
                    <span v-if="ipInfo.abuseipdbId.lastReportedAt">
                      <span class="t-hour">{{ formatDateTime(ipInfo.abuseipdbId.lastReportedAt) }}</span>
                    </span>
                    <span v-else>{{ t('common.notAvailable').toUpperCase() }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="empty-placeholder">
              {{ t('ipDetails.noAbuseData') }}
            </div>
          </div>
        </transition>
      </div>
    </div>

    <section v-if="loading" class="loading">{{ t('common.loading') }}</section>
    <section v-if="error" class="error">{{ t('common.error') }}</section>

    <div v-if="ipInfo" class="sections">
      <!-- Sezioni toggle -->
      <!-- Section ABUSEIPDB REPORTS -->
      <div class="section abuse-reports-section" v-if="reports.length >= 0">
        <div class="section-header" @click="toggles.reports = !toggles.reports">
          <h2><span class="animated-icon pulse-cobalt">🕵️</span> {{ t('ipDetails.abuseInvestigationLogs').toUpperCase()
            }}
          </h2>
          <span class="arrow" :class="{ open: toggles.reports }"></span>
        </div>
        <transition name="collapse">
          <div v-if="toggles.reports" class="section-body">

            <!-- Authenticated View -->
            <div v-if="authStore.isAuthenticated">
              <div class="reports-controls">
                <button @click="aggiornaReports" :disabled="loadingReports" class="update-btn">
                  <span v-if="loadingReports" class="spinner-small"></span>
                  {{ loadingReports ? t('common.loading') : t('ipDetails.syncAbuseReports') }}
                </button>
              </div>

              <section v-if="errorReports" class="error-msg">{{ t('common.error') }}</section>

              <div class="reports-container">
                <div v-for="report in paginatedReports" :key="report._id" class="report-card"
                  :class="{ expanded: expandedReports[report._id] }">
                  <div class="report-header" @click="toggleReport(report._id)">
                    <div class="report-meta">
                      <div class="report-date">
                        <span class="t-hour">{{ formatDateTime(report.reportedAt) }}</span>
                      </div>
                      <div class="report-categories">
                        <span v-for="cat in report.categories" :key="cat.id" class="cat-badge">{{ cat.name }}</span>
                      </div>
                    </div>
                    <span class="report-arrow">⌄</span>
                  </div>
                  <transition name="collapse">
                    <div v-if="expandedReports[report._id]" class="report-content">
                      <div class="report-sub-header">
                        <span class="reporter-info">
                          <strong>{{ t('ipDetails.reporterCountryCode') }}:</strong> {{ report.reporterCountryCode ||
                            t('common.notAvailable') }}
                        </span>
                        <span class="copy-log-btn" @click.stop="copyLogReport(report)"
                          :title="t('common.copyComment')">📋</span>
                      </div>
                      <div class="report-comment-box">
                        {{ report.comment }}
                      </div>
                    </div>
                  </transition>
                </div>
              </div>

              <div class="pagination-container" v-if="reports.length > reportsMeta.pageSize">
                <el-pagination background :layout="paginationLayout" :total="reportsMeta.total"
                  :page-size="reportsMeta.pageSize" :current-page="reportsMeta.page" :pager-count="isMobile ? 3 : 7"
                  @current-change="handleReportsPageChange" class="cyber-pagination">
                  <template #default v-if="isMobile">
                    <span class="mobile-pagination-info">{{ reportsMeta.page }} / {{ Math.ceil(reportsMeta.total /
                      reportsMeta.pageSize) }}</span>
                  </template>
                </el-pagination>
              </div>
            </div>

            <!-- Restricted View (Simple button trigger for the security gate modal) -->
            <div v-else class="reports-controls" style="text-align: center; padding: 20px;">
              <button @click="showGateReports = true" class="update-btn locked" style="border-style: dashed; opacity: 0.7; color: #94a3b8;">
                <span class="icon" style="margin-right: 8px;">🔒</span>
                {{ t('common.auth_required_title') }}
              </button>

              <el-dialog
                v-model="showGateReports"
                :title="t('common.auth_required_title')"
                width="400px"
                :custom-class="'cyber-dialog skin-' + dashboardSkin"
                destroy-on-close
                append-to-body
              >
                <RestrictedIntelligenceGate mode="compact" />
              </el-dialog>
            </div>
          </div>
        </transition>
      </div>



      <!-- Section RATELIMIT EVENTS -->
      <div class="section ratelimit-section" v-if="rateLimit.data && rateLimit.data.length > 0">
        <div class="section-header" @click="toggles.ratelimit = !toggles.ratelimit">
          <h2><span class="animated-icon pulse-cobalt">⚠️</span> {{
            t('ipDetails.rateLimitEvents').toUpperCase() }}</h2>
          <span class="arrow" :class="{ open: toggles.ratelimit }"></span>
        </div>
        <transition name="collapse">
          <div v-if="toggles.ratelimit" class="section-body">
            <div class="ratelimit-container">
              <div v-for="(row, idx) in rateLimit.data" :key="idx" class="ratelimit-card"
                :class="{ expanded: expandedRateLimit[idx] }">
                <div class="ratelimit-header" @click="expandedRateLimit[idx] = !expandedRateLimit[idx]">
                  <div class="ratelimit-meta">
                    <div class="ratelimit-time">
                      <span class="t-hour">{{ formatDateTime(row.timestamp) }}</span>
                    </div>
                    <div class="ratelimit-badges">
                      <span class="cat-badge limit-badge">{{ row.limitType }}</span>
                      <span class="cat-badge method-badge" :class="row.method?.toLowerCase()">{{ row.method }}</span>
                    </div>
                  </div>
                  <div class="ratelimit-path-short" v-if="!expandedRateLimit[idx]">
                    <code>{{ row.path }}</code>
                  </div>
                  <span class="report-arrow">⌄</span>
                </div>
                <transition name="collapse">
                  <div v-if="expandedRateLimit[idx]" class="ratelimit-content">
                    <div class="detail-row">
                      <span class="detail-label">{{ t('ipDetails.path').toUpperCase() }}:</span>
                      <code class="path-full">{{ row.path }}</code>
                    </div>
                    <div class="detail-row" v-if="row.message">
                      <span class="detail-label">{{ t('ipDetails.message').toUpperCase() }}:</span>
                      <span class="detail-value">{{ row.message }}</span>
                    </div>
                    <div class="detail-row" v-if="row.honeypotId">
                      <span class="detail-label">{{ t('ipDetails.honeypotId').toUpperCase() }}:</span>
                      <span class="detail-value">{{ row.honeypotId }}</span>
                    </div>
                    <div class="detail-row" v-if="row.userAgent">
                      <span class="detail-label">{{ t('ipDetails.userAgent').toUpperCase() }}:</span>
                      <span class="detail-value">{{ row.userAgent }}</span>
                    </div>
                    <div class="headers-section">
                      <span class="detail-label">{{ t('ipDetails.headers').toUpperCase() }}:</span>
                      <pre class="headers-pre">{{ JSON.stringify(row.headers, null, 2) }}</pre>
                    </div>
                  </div>
                </transition>
              </div>
            </div>

            <div class="pagination-container">
              <el-pagination background :layout="paginationLayout" :total="rateLimit.total"
                :page-size="rateLimit.pageSize" :current-page="rateLimit.page" :pager-count="isMobile ? 3 : 7"
                @current-change="handlePageChange" class="cyber-pagination">
                <template #default v-if="isMobile">
                  <span class="mobile-pagination-info">{{ rateLimit.page }} / {{ Math.ceil(rateLimit.total /
                    rateLimit.pageSize) }}</span>
                </template>
              </el-pagination>
            </div>
          </div>
        </transition>
      </div>

      <div class="section whois-section">
        <div class="section-header" @click="toggles.honeypot = !toggles.honeypot">
          <h2><span class="animated-icon pulse-cobalt">🔎</span> {{ t('ipDetails.fullWhois').toUpperCase()
            }}</h2>
          <div class="header-actions">
            <span class="copy-log-btn" @click.stop="copyWhoisRaw()" :title="t('common.copy')">📋</span>
            <span class="arrow" :class="{ open: toggles.honeypot }"></span>
          </div>
        </div>
        <transition name="collapse">
          <div v-if="toggles.honeypot" class="section-body no-padding">
            <div class="whois-meta-info">
              <div class="meta-item">
                <strong>{{ t('ipDetails.firstSeen') }}:</strong>
                <span class="t-hour">{{ formatFullDateTime(ipInfo.firstSeenAt) }}</span>
              </div>
              <div class="meta-item">
                <strong>{{ t('ipDetails.lastSeen') }}:</strong>
                <span class="t-hour">{{ formatFullDateTime(ipInfo.lastSeenAt) }}</span>
              </div>
            </div>
            <div class="whois-viewer">
              <pre class="whois-code-box">{{ ipInfo.whois_raw }}</pre>
            </div>
          </div>
        </transition>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatDateTime, formatFullDateTime } from '../../utils/dateUtils';
import dayjs from 'dayjs'
import { fetchIpDetails, fetchRateLimitSearch, enrichReports, enrichReputationScore } from '../../api/index'
import { useI18n } from 'vue-i18n'
import CountryFlag from '../../components/CountryFlag.vue';
import ReportActions from '../../components/ReportActions.vue';
import RestrictedIntelligenceGate from '../../components/common/RestrictedIntelligenceGate.vue';
import { ElMessage } from 'element-plus';
import { useClipboard } from '../../composable/useClipboard';
import { useAuthStore } from '../../stores/auth';
import { useViewSettingsStore } from '../../stores/viewSettings';
import { storeToRefs } from 'pinia';
import GlobalHeader from '../../components/GlobalHeader.vue';

const viewStore = useViewSettingsStore();
const { dashboardSkin } = storeToRefs(viewStore);

const props = defineProps({
  ip: { type: String, required: true },
  initialPageReports: { type: Number, default: 1 },
  initialPageRateLimit: { type: Number, default: 1 }
})

const route = useRoute()
const router = useRouter()
const { t } = useI18n();
const authStore = useAuthStore();
const { copyToClipboard, copyFormatted } = useClipboard();

const ip = ref(props.ip)
const ipInfo = ref(null)
const loading = ref(false)
const loadingEnrich = ref(false)
const error = ref(false)

const showGateReports = ref(false)

const copiedIds = reactive({});
const copiedIp = ref(false);


const errorReputationScore = ref(false)

// Responsive Pagination logic
const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value < 600)
const paginationLayout = computed(() => isMobile.value ? 'prev, slot, next' : 'prev, pager, next, total')

const updateWidth = () => {
  windowWidth.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', updateWidth);
  loadIpDetails()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWidth)
})

// Stato di caricamento e Reports
const loadingReports = ref(false);
const reports = ref([]); // Array di report
const errorReports = ref(false)
const reportsMeta = reactive({
  page: props.initialPageReports,
  pageSize: 5,
  total: 0
});
const expandedReports = reactive({});
const expandedRateLimit = reactive({});

const toggles = reactive({
  abuse: true,
  honeypot: true,
  ratelimit: true,
  reports: true,
  geo: true,
  net: true
})

const rateLimit = reactive({
  data: [],
  loading: false,
  page: props.initialPageRateLimit,
  pageSize: 5,
  total: 0
})

const paginatedReports = computed(() => {
  const start = (reportsMeta.page - 1) * reportsMeta.pageSize;
  return reports.value.slice(start, start + reportsMeta.pageSize);
});

function toggleReport(id) {
  expandedReports[id] = !expandedReports[id];
}

// Local helper for main IP copy with visual feedback
async function copyMainIp(text) {
  if (!text) return;
  await copyFormatted('clipboard.ip', { ip: text });
  copiedIp.value = true;
  setTimeout(() => {
    copiedIp.value = false;
  }, 2000);
}

function handleReportsPageChange(page) {
  reportsMeta.page = page;
}

function handleReportsPageSizeChange(size) {
  reportsMeta.pageSize = size;
  reportsMeta.page = 1;
}

// Sincronizzazione Prop -> Ref (per back/forward browser)
watch(() => props.ip, (newIp) => {
  if (newIp && newIp !== ip.value) {
    ip.value = newIp;
    loadIpDetails();
  }
});
watch(() => props.initialPageReports, (v) => { reportsMeta.page = v ?? 1; });
watch(() => props.initialPageRateLimit, (v) => { rateLimit.page = v ?? 1; });

// Sincronizzazione Ref -> URL query
watch([ip, () => reportsMeta.page, () => rateLimit.page], ([newIp, newPRep, newPRat]) => {
  router.replace({
    name: 'IpDetails',
    params: { ip: newIp },
    query: {
      pReports: newPRep > 1 ? newPRep : undefined,
      pRateLimit: newPRat > 1 ? newPRat : undefined
    }
  });
});

// Funzione per aggiornare i report
async function aggiornaReports() {
  if (!ip.value || !ip.value.trim()) return;
  loadingReports.value = true;
  try {

    const response = await enrichReports(ip.value);

    loadIpDetails();

  } catch (err) {
    errorReports.value = true;
    setTimeout(() => {
      errorReports.value = false;
    }, 2500);

  } finally {
    loadingReports.value = false;
  }
}

async function aggiornaReputationScore() {
  if (!ip.value || !ip.value.trim()) return;
  loadingReputationScore.value = true;
  try {

    const response = await enrichReputationScore(ip.value);
    ElMessage.success(t('ipDetails.refreshSuccess'));
    loadIpDetails();

  } catch (err) {
    errorReputationScore.value = true;
    ElMessage.error(t('ipDetails.refreshError'));
    setTimeout(() => {
      errorReputationScore.value = false;
    }, 2500);

  } finally {
    loadingReputationScore.value = false;
  }
}

async function forzaArricchimento() {
  if (!ip.value || !ip.value.trim()) return;
  loadingEnrich.value = true;
  try {
    await enrichReputationScore(ip.value);
    ElMessage.success(t('ipDetails.refreshSuccess'));
    await loadIpDetails();
  } catch (err) {
    console.error('Errore arricchimento forzato:', err);
    ElMessage.error(t('ipDetails.refreshError'));
  } finally {
    loadingEnrich.value = false;
  }
}

async function loadIpDetails() {
  loading.value = true
  error.value = false
  try {
    const response = await fetchIpDetails(ip.value)

    ipInfo.value = response.ipDetails || response;
    reports.value = response.abuseReports || [];
    reportsMeta.total = reports.value.length;

    if (ipInfo.value && ipInfo.value.ip) {
      await loadRateLimitEvents()
    }
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

async function loadRateLimitEvents() {
  if (!ipInfo.value || !ipInfo.value.ip) return
  rateLimit.loading = true
  try {
    const filters = { ip: ipInfo.value.ip }
    const response = await fetchRateLimitSearch({
      page: rateLimit.page,
      pageSize: rateLimit.pageSize,
      filters
    })
    rateLimit.data = response.bobjs || []
    rateLimit.total = response.total || 0
  } catch (error) {
    console.error('Errore caricamento eventi RateLimit:', error)
  } finally {
    rateLimit.loading = false
  }
}

function handlePageChange(newPage) {
  rateLimit.page = newPage
  loadRateLimitEvents()
}

function handlePageSizeChange(newSize) {
  rateLimit.pageSize = newSize
  rateLimit.page = 1
  loadRateLimitEvents()
}


function goBack() {
  router.back()
}

function goToCampaigns() {
  router.push('/campaigns')
}

const copyGeoInfo = () => {
  if (!ipInfo.value?.ipinfo) return;
  const geo = ipInfo.value.ipinfo;
  copyFormatted('clipboard.ipDetails.geo', {
    ip: ip.value,
    country: geo.country,
    city: geo.city,
    region: geo.region,
    timezone: geo.timezone,
    gps: geo.loc
  });
};

const copyNetInfo = () => {
  if (!ipInfo.value?.ipinfo) return;
  const net = ipInfo.value.ipinfo;
  copyFormatted('clipboard.ipDetails.net', {
    ip: ip.value,
    org: net.org,
    hostname: net.hostname
  });
};

const copyAbuseSummary = () => {
  if (!ipInfo.value?.abuseipdbId) return;
  const abuse = ipInfo.value.abuseipdbId;
  copyFormatted('clipboard.ipDetails.abuse', {
    ip: ip.value,
    score: abuse.abuseConfidenceScore,
    listed: abuse.isListed ? t('common.yes').toUpperCase() : t('common.no').toUpperCase(),
    total: abuse.totalReports || 0,
    lastReport: abuse.lastReportedAt ? formatFullDateTime(abuse.lastReportedAt) : t('common.notAvailable')
  });
};

const copyWhoisRaw = () => {
  if (!ipInfo.value?.whois_raw) return;
  copyFormatted('clipboard.ipDetails.whois', {
    ip: ip.value,
    rawData: ipInfo.value.whois_raw
  });
};

const copyLogReport = (report) => {
  if (!report) return;

  // Prepariamo i dati per il template i18n e il frammento PDF
  const data = {
    date: formatFullDateTime(report.reportedAt),
    categories: report.categories.map(c => c.name).join(', '),
    reporter: report.reporterCountryCode || t('common.unknown'),
    comment: report.comment
  };

  copyFormatted('clipboard.ipDetails.abuseLog', data);
};

onMounted(() => {
  loadIpDetails()
})
</script>

<style scoped src="./IpDetails.css"></style>
<style scoped>
@import "./IpDetailsCyber.css";
</style>