<template>
  <div class="ip-details">
    <button @click="goBack" class="back-btn">← {{ t('ipDetails.backToAttacks') }}</button>

    <h1>{{ t('ipDetails.title') }}: {{ ip }}</h1>

    <section v-if="loading" class="loading">{{ t('common.loading') }}</section>
    <section v-if="error" class="error">{{ t('common.error') }}</section>

    <div v-if="ipInfo" class="sections">
      <!-- Sezioni toggle -->
      <div class="section" v-if="ipInfo.abuseipdbId">
        <div class="section-header" @click="toggles.abuse = !toggles.abuse">
          <h2>{{ t('ipDetails.additionalInfo') }}</h2>
          <span class="arrow" :class="{ open: toggles.abuse }"></span>
        </div>
        <transition name="collapse">
          <div v-if="toggles.abuse" class="section-body">

            <button @click="aggiornaReputationScore" :disabled="loadingReputationScore" class="update-btn">
              {{ loadingReputationScore ? t('common.loading') : t('ipDetails.additionalInfo') }}
            </button>
            <section v-if="errorReputationScore" class="error">{{ t('common.error') }}</section>

            <p><strong>{{ t('ipDetails.score') }}:</strong> {{ ipInfo.abuseipdbId.abuseConfidenceScore || 'N/D' }}</p>
            <p><strong>{{ t('ipDetails.isListed') }}:</strong> {{ ipInfo.abuseipdbId.isListed || 'N/D' }}</p>
            <p><strong>{{ t('ipDetails.isWhitelisted') }}:</strong> {{ ipInfo.abuseipdbId.isWhitelisted || 'N/D' }}</p>
            <p><strong>{{ t('ipDetails.isTor') }}</strong> {{ ipInfo.abuseipdbId.isTor || 'N/D' }}</p>
            <p><strong>{{ t('ipDetails.totalReports') }}:</strong> {{ ipInfo.abuseipdbId.totalReports || 'N/D' }}</p>
            <p><strong>{{ t('ipDetails.usage') }}:</strong> {{ ipInfo.abuseipdbId.usageType || 'N/D' }}</p>
            <p><strong>{{ t('ipDetails.lastReportedAt') }}:</strong> {{ formatDate(ipInfo.abuseipdbId.lastReportedAt) ||
              'N/D' }}</p>
          </div>
        </transition>
      </div>

      <div class="section" v-if="reports.length >= 0">
        <div class="section-header" @click="toggles.reports = !toggles.reports">
          <h2>{{ t('ipDetails.relatedLogs') }}</h2>
          <span class="arrow" :class="{ open: toggles.reports }"></span>
        </div>
        <transition name="collapse">
          <div v-if="toggles.reports" class="section-body">
            <button @click="aggiornaReports" :disabled="loadingReports" class="update-btn">
              {{ loadingReports ? t('common.loading') : t('ipDetails.relatedLogs') }}
            </button>
            <section v-if="errorReports" class="error">{{ t('common.error') }}</section>

            <div v-for="report in paginatedReports" :key="report._id" class="report-entry">
              <div class="report-header" @click="toggleReport(report._id)">
                <span>{{ formatDate(report.reportedAt) }} - {{report.categories.map(cat => cat.name).join(', ')
                }}</span>
                <span class="toggle-icon">{{ expandedReports[report._id] ? '–' : '+' }}</span>
              </div>
              <transition name="collapse">
                <div v-if="expandedReports[report._id]" class="report-body">
                  <!--<p><strong>Categorie:</strong>  {{ report.categories.map(cat => cat.name).join(', ') }}</p>-->
                  <!--<p><strong>Reporter ID:</strong> {{ report.reporterId || 'anonimo' }}</p> -->
                  <p><strong>{{ t('ipDetails.reporterCountry') }}:</strong> {{ report.reporterCountryCode || 'N/A' }}
                  </p>
                  <p><strong>{{ t('ipDetails.comment') }}:</strong> {{ report.comment }}</p>
                </div>
              </transition>
            </div>

            <div class="pagination-wrapper" v-if="reports.length > reportsMeta.pageSize"
              style="text-align: right; margin-top: 10px;">
              <el-pagination background layout="prev, pager, next, sizes, total" :total="reportsMeta.total"
                :page-size="reportsMeta.pageSize" :current-page="reportsMeta.page"
                @current-change="handleReportsPageChange" @size-change="handleReportsPageSizeChange"
                :page-sizes="[5, 10, 25, 50]" />
            </div>
          </div>
        </transition>
      </div>

      <div class="section">
        <div class="section-header" @click="toggles.geo = !toggles.geo">
          <h2>{{ t('ipDetails.location') }}</h2>
          <span class="arrow" :class="{ open: toggles.geo }"></span>
        </div>
        <transition name="collapse">
          <div v-if="toggles.geo" class="section-body">
            <p><strong>{{ t('ipDetails.organization') }}:</strong> {{ ipInfo.ipinfo.org || 'N/A' }}</p>
            <p><strong>{{ t('ipDetails.isp') }}:</strong> {{ ipInfo.ipinfo.hostname || 'N/A' }}</p>
            <p><strong>{{ t('ipDetails.country') }}:</strong> {{ ipInfo.ipinfo.country || 'N/A' }}</p>
            <p><strong>{{ t('ipDetails.region') }}:</strong> {{ ipInfo.ipinfo.region || 'N/A' }}</p>
            <p><strong>{{ t('ipDetails.city') }}:</strong> {{ ipInfo.ipinfo.city || 'N/A' }}</p>
            <p><strong>{{ t('ipDetails.postal') }}:</strong> {{ ipInfo.ipinfo.postal || 'N/A' }}</p>
            <p><strong>{{ t('ipDetails.location') }}:</strong> {{ ipInfo.ipinfo.loc || 'N/A' }}</p>
            <p><strong>{{ t('ipDetails.timezone') }}:</strong> {{ ipInfo.ipinfo.timezone || 'N/A' }}</p>
            <p><strong>{{ t('ipDetails.additionalInfo') }}:</strong> {{ formatDate(ipInfo.enrichedAt) || 'N/A' }}</p>
          </div>
        </transition>
      </div>

      <!-- Sezione Eventi RateLimit -->
      <div class="section" v-if="rateLimit.data && rateLimit.data.length > 0">
        <div class="section-header" @click="toggles.ratelimit = !toggles.ratelimit">
          <h2>{{ t('ipDetails.rateLimitEvents') }}</h2>
          <span class="arrow" :class="{ open: toggles.ratelimit }"></span>
        </div>
        <transition name="collapse">
          <div v-if="toggles.ratelimit" class="section-body">
            <el-table :data="rateLimit.data" style="width: 100%; border-radius: 6px;" :loading="rateLimit.loading"
              @expand-change="() => { }" row-class-name="rate-limit-row" border>
              <el-table-column type="expand">
                <template #default="{ row }">
                  <div class="expanded-details">
                    <p><strong>{{ t('ipDetails.headers') }}:</strong>
                    <pre>{{ JSON.stringify(row.headers, null, 2) }}</pre>
                    </p>
                    <p><strong>{{ t('ipDetails.message') }}:</strong> {{ row.message || '-' }}</p>
                    <p><strong>{{ t('ipDetails.honeypotId') }}:</strong> {{ row.honeypotId || '-' }}</p>
                    <p><strong>{{ t('ipDetails.userAgent') }}:</strong> {{ row.userAgent || '-' }}</p>
                  </div>
                </template>
              </el-table-column>

              <el-table-column prop="timestamp" :label="t('ipDetails.timestamp')" width="180">
                <template #default="{ row }">
                  {{ formatDate(row.timestamp) }}
                </template>
              </el-table-column>
              <el-table-column prop="limitType" :label="t('ipDetails.limitType')" width="160" />
              <el-table-column prop="ip" :label="t('ipDetails.ip')" width="140" />
              <el-table-column prop="method" :label="t('ipDetails.method')" width="90" />
              <el-table-column prop="path" :label="t('ipDetails.path')" />
            </el-table>

            <div class="pagination-wrapper" style="text-align: right; margin-top: 10px;">
              <el-pagination background layout="prev, pager, next, sizes, total" :total="rateLimit.total"
                :page-size="rateLimit.pageSize" :current-page="rateLimit.page" @size-change="handlePageSizeChange"
                @current-change="handlePageChange" :page-sizes="[5, 10, 50, 100]" />
            </div>
          </div>
        </transition>
      </div>

      <div class="section">
        <div class="section-header" @click="toggles.honeypot = !toggles.honeypot">
          <h2>{{ t('ipDetails.fullWhois') }}</h2>
          <span class="arrow" :class="{ open: toggles.honeypot }"></span>
        </div>
        <transition name="collapse">
          <div v-if="toggles.honeypot" class="section-body">
            <p><strong>{{ t('ipDetails.firstSeen') }}:</strong> {{ formatDate(ipInfo.firstSeenAt) || 'N/D' }}</p>
            <p><strong>{{ t('ipDetails.lastSeen') }}:</strong> {{ formatDate(ipInfo.lastSeenAt) || 'N/D' }}</p>
            <p><strong>{{ t('ipDetails.whoisRaw') }}:</strong>
            <pre class="whois-pre">{{ JSON.stringify(ipInfo.whois_raw, null, 2) }}</pre>
            </p>
          </div>
        </transition>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { fetchIpDetails, fetchRateLimitSearch, enrichReports, enrichReputationScore } from '../../api/index'
import { useI18n } from 'vue-i18n'

const { t } = useI18n();

const route = useRoute()
const router = useRouter()

const ip = ref('')
const ipInfo = ref(null)
const loading = ref(false)
const error = ref(false)


const loadingReputationScore = ref(false);
const errorReputationScore = ref(false)

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
  geo: true,
  ratelimit: true,
  reports: true
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

    loadIpDetails();

  } catch (err) {
    errorReputationScore.value = true;
    setTimeout(() => {
      errorReputationScore.value = false;
    }, 2500);

  } finally {
    loadingReputationScore.value = false;
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

function formatDate(dateStr) {
  return dateStr ? dayjs(dateStr).format('DD/MM/YYYY HH:mm:ss') : ''
}

function goBack() {
  router.back()
}

onMounted(() => {
  loadIpDetails()
})
</script>

<style scoped src="./IpDetails.css"></style>