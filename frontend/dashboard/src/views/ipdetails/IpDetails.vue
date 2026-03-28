<template>
  <div class="ip-details">
    <div class="header-top">
      <button @click="goBack" class="back-btn">← {{ t('ipDetails.backToAttacks').toUpperCase() }}</button>
      <button @click="forzaArricchimento" :disabled="loadingEnrich" class="refresh-btn">
        <span v-if="loadingEnrich" class="spinner"></span>
        {{ (loadingEnrich ? t('common.loading') : t('ipDetails.forceRefresh')).toUpperCase() }}
      </button>
      <LanguageSwitcher />
    </div>

    <div class="header-main">
      <h1>
        <span class="animated-icon pulse-cobalt">🔍</span> {{ t('ipDetails.title').toUpperCase() }}: {{ ip }}
        <button class="action-btn copy-ip-btn" @click="copyToClipboard(ip)" :title="t('common.copyToClipboard')">
          <span v-if="!copiedIp">📋</span>
          <span v-else>✅</span>
        </button>
      </h1>
    </div>

    <div v-if="ipInfo" class="briefing-wrapper">
      <!-- BLOCK 1: GEOGRAPHIC INTELLIGENCE -->
      <div class="forensic-briefing briefing-geo">
        <div class="briefing-header" @click="toggles.geo = !toggles.geo">
          <span class="briefing-icon">🌍</span> {{ t('ipDetails.location').toUpperCase() }}
          <span class="arrow" :class="{ open: toggles.geo }"></span>
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
                <span class="briefing-label">{{ t('ipDetails.city').toUpperCase() }} / {{ t('ipDetails.region').toUpperCase() }}</span>
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
          <span class="arrow" :class="{ open: toggles.net }"></span>
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
                <span class="briefing-label">{{ t('ipDetails.isp').toUpperCase() }} / {{ t('ipDetails.hostname').toUpperCase() }}</span>
                <span class="briefing-value">{{ ipInfo.ipinfo?.hostname || t('common.notAvailable') }}</span>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <div class="forensic-briefing briefing-abuse"
        :class="{ 'high-risk': ipInfo.abuseipdbId?.abuseConfidenceScore > 50 }">
        <div class="briefing-header" @click="toggles.abuse = !toggles.abuse">
          <span class="briefing-icon">🚨</span> {{ t('ipDetails.abuseReportingTitle').toUpperCase() }}
          <span class="arrow" :class="{ open: toggles.abuse }"></span>
        </div>
        <transition name="collapse">
          <div v-if="toggles.abuse">
            <div v-if="ipInfo.abuseipdbId" class="briefing-grid">
              <div class="briefing-item" :data-briefing-tooltip="t('ipDetails.score')">
                <div class="score-radial" :style="{ '--score': ipInfo.abuseipdbId.abuseConfidenceScore || 0 }">
                  {{ ipInfo.abuseipdbId.abuseConfidenceScore }}%
                </div>
                <div class="briefing-content">
                  <span class="briefing-label">{{ t('ipDetails.confidence').toUpperCase() }}</span>
                  <span class="briefing-value">{{ ipInfo.abuseipdbId.abuseConfidenceScore }}% {{
                    t('ipDetails.confidence').toUpperCase()
                  }}</span>
                </div>
              </div>
              <div class="briefing-item">
                <span class="briefing-icon" :class="ipInfo.abuseipdbId.isListed ? 'text-danger' : 'text-success'">
                  {{ ipInfo.abuseipdbId.isListed ? '🚫' : '✅' }}
                </span>
                <div class="briefing-content">
                  <span class="briefing-label">{{ t('ipDetails.isListed').toUpperCase() }}</span>
                  <span class="briefing-value">{{ ipInfo.abuseipdbId.isListed ? t('common.yes').toUpperCase() :
                    t('common.no').toUpperCase() }}</span>
                </div>
              </div>
              <div class="briefing-item">
                <span class="briefing-icon">📋</span>
                <div class="briefing-content">
                  <span class="briefing-label">{{ t('ipDetails.totalReports').toUpperCase() }}</span>
                  <span class="briefing-value">{{ ipInfo.abuseipdbId.totalReports || 0 }} {{
                    t('ipDetails.reportsCount').toUpperCase()
                  }}</span>
                </div>
              </div>
              <div class="briefing-item">
                <span class="briefing-icon">🕒</span>
                <div class="briefing-content">
                  <span class="briefing-label">{{ t('ipDetails.lastReportedAt').toUpperCase() }}</span>
                  <div class="briefing-value">
                    <span v-if="ipInfo.abuseipdbId.lastReportedAt">
                      <span class="t-date">{{ dayjs(ipInfo.abuseipdbId.lastReportedAt).format('DD/MM/YYYY') }}</span>
                      <span class="t-hour">{{ dayjs(ipInfo.abuseipdbId.lastReportedAt).format('HH:mm:ss') }}</span>
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
          <h2><span class="animated-icon pulse-cobalt">📊</span> {{ t('ipDetails.abuseInvestigationLogs').toUpperCase() }}
          </h2>
          <span class="arrow" :class="{ open: toggles.reports }"></span>
        </div>
        <transition name="collapse">
          <div v-if="toggles.reports" class="section-body">
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
                      <span class="t-date">{{ dayjs(report.reportedAt).format('DD/MM/YYYY') }}</span>
                      <span class="t-hour">{{ dayjs(report.reportedAt).format('HH:mm:ss') }}</span>
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
                      <button class="mini-copy-btn" @click.stop="copyToClipboard(report.comment, report._id)">
                        {{ copiedIds[report._id] ? t('common.copied') : t('common.copyComment') }}
                      </button>
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
            <div class="table-wrapper">
              <el-table :data="rateLimit.data" style="width: 100%;" :loading="rateLimit.loading"
                row-class-name="cyber-table-row" border>
                <el-table-column type="expand">
                  <template #default="{ row }">
                    <div class="expanded-details">
                      <p><strong>{{ t('ipDetails.headers') }}:</strong></p>
                      <pre class="headers-pre">{{ JSON.stringify(row.headers, null, 2) }}</pre>
                      <p><strong>{{ t('ipDetails.message') }}:</strong> {{ row.message || '-' }}</p>
                      <p><strong>{{ t('ipDetails.honeypotId') }}:</strong> {{ row.honeypotId || '-' }}</p>
                      <p><strong>{{ t('ipDetails.userAgent') }}:</strong> {{ row.userAgent || '-' }}</p>
                    </div>
                  </template>
                </el-table-column>

                <el-table-column prop="timestamp" :label="t('ipDetails.timestamp')" width="180">
                  <template #default="{ row }">
                    <div class="time-display">
                      <span class="t-date">{{ dayjs(row.timestamp).format('DD/MM/YYYY') }}</span>
                      <span class="t-hour">{{ dayjs(row.timestamp).format('HH:mm:ss') }}</span>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column prop="limitType" :label="t('ipDetails.limitType')" width="160" />
                <el-table-column prop="ip" :label="t('ipDetails.ip')" width="140" />
                <el-table-column prop="method" :label="t('ipDetails.method')" width="90" />
                <el-table-column prop="path" :label="t('ipDetails.path')" show-overflow-tooltip />
              </el-table>
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
          <span class="arrow" :class="{ open: toggles.honeypot }"></span>
        </div>
        <transition name="collapse">
          <div v-if="toggles.honeypot" class="section-body no-padding">
            <div class="whois-meta-info">
              <div class="meta-item">
                <strong>{{ t('ipDetails.firstSeen') }}:</strong>
                <span class="t-date">{{ dayjs(ipInfo.firstSeenAt).format('DD/MM/YYYY') }}</span>
                <span class="t-hour">{{ dayjs(ipInfo.firstSeenAt).format('HH:mm:ss') }}</span>
              </div>
              <div class="meta-item">
                <strong>{{ t('ipDetails.lastSeen') }}:</strong>
                <span class="t-date">{{ dayjs(ipInfo.lastSeenAt).format('DD/MM/YYYY') }}</span>
                <span class="t-hour">{{ dayjs(ipInfo.lastSeenAt).format('HH:mm:ss') }}</span>
              </div>
            </div>
            <div class="whois-viewer">
              <pre class="whois-code-box">{{ JSON.stringify(ipInfo.whois_raw, null, 2) }}</pre>
            </div>
          </div>
        </transition>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { fetchIpDetails, fetchRateLimitSearch, enrichReports, enrichReputationScore } from '../../api/index'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from '../../components/LanguageSwitcher.vue';
import CountryFlag from '../../components/CountryFlag.vue';
import { ElMessage } from 'element-plus';

const route = useRoute()
const router = useRouter()
const { t } = useI18n();

const ip = ref('')
const ipInfo = ref(null)
const loading = ref(false)
const loadingEnrich = ref(false)
const error = ref(false)
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
  page: 1,
  pageSize: 5,
  total: 0
});
const expandedReports = reactive({});

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
  page: 1,
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

async function copyToClipboard(text, id) {
  if (!text) return;
  try {
    let successful = false;

    // Modern API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      successful = true;
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      successful = document.execCommand('copy');
      document.body.removeChild(textArea);
    }

    if (successful) {
      if (id) {
        copiedIds[id] = true;
        setTimeout(() => {
          copiedIds[id] = false;
        }, 2000);
      } else {
        copiedIp.value = true;
        setTimeout(() => {
          copiedIp.value = false;
        }, 2000);
        ElMessage.success(t('common.copied') + ': ' + text);
      }
    } else {
      throw new Error('Copy command failed');
    }
  } catch (err) {
    console.error('Copy failed:', err);
    ElMessage.error(t('common.copyError'));
  }
}

function handleReportsPageChange(page) {
  reportsMeta.page = page;
}

function handleReportsPageSizeChange(size) {
  reportsMeta.pageSize = size;
  reportsMeta.page = 1;
}

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
    ip.value = route.params.ip
    const response = await fetchIpDetails(ip.value)

    ipInfo.value = response.ipDetails || response;
    reports.value = response.abuseReports || [];
    reportsMeta.total = reports.value.length;

    //ipInfo.value = response

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

onMounted(() => {
  loadIpDetails()
})
</script>

<style scoped src="./IpDetails.css"></style>