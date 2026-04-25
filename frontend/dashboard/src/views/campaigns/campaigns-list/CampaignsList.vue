<template>
  <div class="campaigns-page" :class="'skin-' + currentSkin">
    <GlobalHeader context="campaigns" extraClass="cyber-sticky-area cyber-sticky-top-0">
      <template #title>
        <h1 class="header-main-title">
          {{ t('campaigns.title').toUpperCase() }}<span class="blinking-cursor">_</span>
        </h1>
      </template>
    </GlobalHeader>
    <div class="actions cyber-sticky-area cyber-sticky-top-1">
      <div class="nav-actions">
        <button @click="goToHome" class="btn-action">
          {{ t('threatLogs.dashboard').toUpperCase() }}
        </button>
        <button @click="goToAttacks" class="btn-action">
          {{ t('threatLogs.attacks').toUpperCase() }}
        </button>
        <button @click="goToLogs" class="btn-action">
          {{ t('attacks.logRequests').toUpperCase() }}
        </button>
      </div>
      <div class="view-controls">
      </div>
    </div>

    <div class="campaigns-container">

      <!-- Filters -->
      <section class="campaigns-filters">
        <div class="filter-row top-filters">
          <div class="filter-group">
            <label class="cyber-label">PROT</label>
            <div class="protocol-reset-group">
              <div class="tabs-row">
                <button v-for="opt in ['http', 'https', 'ssh']" :key="opt" class="tab-btn"
                  :class="{ active: campaignsStore.state.filters.protocol === opt }"
                  @click="campaignsStore.state.filters.protocol = opt">
                  {{ opt.toUpperCase() }}
                </button>
              </div>
              <button class="reset-btn-mini filter-reset-btn" @click="campaignsStore.resetFilters" :title="t('telemetry.reset_filters')">
                <div class="reset-ascii">
                  <span></span>
                  <span></span>
                </div>
              </button>
            </div>
          </div>

          <div class="filter-group">
            <label class="cyber-label">{{ t('telemetry.filter_label') }}</label>
            <div class="tabs-row">
              <button v-for="opt in dynamicTimeScale" :key="opt.l" class="tab-btn"
                :class="{ active: campaignsStore.state.filters.agoValue === opt.v && campaignsStore.state.filters.agoUnit === opt.u }"
                @click="campaignsStore.state.filters.agoValue = opt.v; campaignsStore.state.filters.agoUnit = opt.u">
                {{ opt.l }}
              </button>
            </div>
          </div>
        </div>

        <div class="filter-row dynamic-filters" v-if="campaignsStore.state.metadata.maxIpCount > 0 || campaignsStore.state.metadata.maxScore > 0">
          <div class="filter-group" v-if="campaignsStore.state.metadata.maxIpCount > 0">
            <label class="cyber-label">{{ t('campaigns.minIpsLabel') }}</label>
            <div class="tabs-row">
              <button v-for="val in dynamicIpScale" :key="val" class="tab-btn"
                :class="{ active: campaignsStore.state.filters.minIps === val }"
                @click="campaignsStore.state.filters.minIps = (campaignsStore.state.filters.minIps === val ? 3 : val)">
                {{ val }}
              </button>
            </div>
          </div>

          <div class="filter-group" v-if="dynamicScoreScale.length > 0 && campaignsStore.state.metadata.maxScore > 0">
            <label class="cyber-label">{{ t('telemetry.filter_score_label') }}</label>
            <div class="tabs-row">
              <button v-for="val in dynamicScoreScale" :key="val" class="tab-btn"
                :class="{ active: campaignsStore.state.filters.minScore === val }"
                @click="campaignsStore.state.filters.minScore = (campaignsStore.state.filters.minScore === val ? 0 : val)">
                {{ val === 0 ? 'INFO' : val }}
              </button>
            </div>
          </div>

          <div class="filter-group" v-if="dynamicLogsPerIpScale.length > 0 && campaignsStore.state.metadata.maxLogsPerIp > 0">
            <label class="cyber-label">LOGS/IP</label>
            <div class="tabs-row">
              <button v-for="val in dynamicLogsPerIpScale" :key="val" class="tab-btn"
                :class="{ active: campaignsStore.state.filters.minLogsPerIp === val }"
                @click="campaignsStore.state.filters.minLogsPerIp = (campaignsStore.state.filters.minLogsPerIp === val ? 1 : val)">
                {{ val }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Top Pagination -->
      <div v-if="total > 0" class="pagination cyber-pagination top-pagination">
        <div class="pagination-main">
          <button :disabled="page === 1" @click="page--" class="nav-btn">◄ {{ t('common.prev') }}</button>
          <span class="pagination-info cyber-pagination-info">
            {{ t('common.page') }} {{ page }} {{ t('common.of') }} {{ Math.ceil(total / pageSize) }}
          </span>
          <button :disabled="page >= Math.ceil(total / pageSize)" @click="page++" class="nav-btn">{{ t('common.next') }} ►</button>
        </div>

        <div class="pagination-tools">
          <div class="page-size-selector">
            <span class="selector-label">{{ t('common.show') }}:</span>
            <div class="size-options">
              <button v-for="size in [10, 20, 50, 100]" :key="size" 
                      :class="{ active: pageSize === size }"
                      @click="pageSize = size; page = 1"
                      class="size-btn">
                {{ size }}
              </button>
            </div>
          </div>

          <div class="cyber-page-input-container">
            <label for="pageInputTop">{{ t('common.goToPage') }}</label>
            <input class="cyber-pagination-input" id="pageInputTop" type="number" 
                   v-model.number="inputPage" :min="1" :max="Math.ceil(total / pageSize)" 
                   @keyup.enter="goToPage" />
          </div>
        </div>
      </div>

      <!-- Grid -->
      <transition-group name="widget-dynamic" tag="div" class="campaigns-grid">
        <div v-if="loading" key="loading" class="no-campaigns">
          <div class="ascii-art">
            [ SCANNING DISTRIBUTED PATTERNS... ]
          </div>
          <p>{{ t('common.loading') }}</p>
        </div>

        <div v-else-if="campaigns.length === 0" key="empty" class="no-campaigns">
          <div class="ascii-art">
            ( X X )
          </div>
          <p>{{ t('campaigns.noCampaignsFound') }}</p>
        </div>

        <div v-for="campaign in campaigns" :key="campaign.hash" class="campaign-card"
          @click="goToDetail(campaign.hash)">
          <div class="card-header">
            <div class="hash-badge">
              {{ t('campaigns.table.hash') }}: {{ campaign.hash.substring(0, 8) }}
            </div>
            <div class="cluster-size">
              <span class="size-val">{{ campaign.ipCount }}</span>
              <span class="size-label">{{ t('campaigns.ipsInvolved').toUpperCase() }}</span>
            </div>
          </div>

          <div class="card-metrics">
            <div class="metric-item">
              <span class="metric-label">{{ t('campaigns.totalLogs') }}</span>
              <span class="metric-value">{{ campaign.totaleLogs }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">{{ t('common.sample_url').toUpperCase() }}</span>
              <span class="metric-value" :title="campaign.sampleUrl">{{ campaign.sampleUrl || '/' }}</span>
            </div>
          </div>

          <div class="card-techniques" v-if="campaign.attackPatterns?.length">
             <div class="tech-tags">
                <span v-for="tech in campaign.attackPatterns" :key="tech" class="tech-tag">
                   {{ tech }}
                </span>
             </div>
          </div>

          <div class="card-footer">
            <div class="timeline-info">
              <div>{{ t('campaigns.firstSeen') }}: {{ formatDate(campaign.firstSeen) }}</div>
              <div v-if="campaign.lastSeen !== campaign.firstSeen">
                {{ t('common.duration_label').toUpperCase() }}: {{ computeDuration(campaign.firstSeen, campaign.lastSeen) }}
              </div>
            </div>
            <div class="go-btn">
              <span class="badge-icon">👉</span>
            </div>
          </div>
        </div>
      </transition-group>

      <!-- Bottom Pagination -->
      <div v-if="total > 0" class="pagination cyber-pagination">
        <div class="pagination-main">
          <button :disabled="page === 1" @click="page--" class="nav-btn">◄ {{ t('common.prev') }}</button>
          <span class="pagination-info cyber-pagination-info">
            {{ t('common.page') }} {{ page }} {{ t('common.of') }} {{ Math.ceil(total / pageSize) }}
          </span>
          <button :disabled="page >= Math.ceil(total / pageSize)" @click="page++" class="nav-btn">{{ t('common.next') }} ►</button>
        </div>

        <div class="pagination-tools">
          <div class="page-size-selector">
            <span class="selector-label">{{ t('common.show') }}:</span>
            <div class="size-options">
              <button v-for="size in [10, 20, 50, 100]" :key="size" 
                      :class="{ active: pageSize === size }"
                      @click="pageSize = size; page = 1"
                      class="size-btn">
                {{ size }}
              </button>
            </div>
          </div>

          <div class="cyber-page-input-container">
            <label for="pageInputBottom">{{ t('common.goToPage') }}</label>
            <input class="cyber-pagination-input" id="pageInputBottom" type="number" 
                   v-model.number="inputPage" :min="1" :max="Math.ceil(total / pageSize)" 
                   @keyup.enter="goToPage" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, toRef, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useViewSettingsStore } from '../../../stores/viewSettings';
import { useCampaignsStore } from '../../../stores/campaigns';
import { useCampaignsDiscovery } from '../../../composable/useCampaignsDiscovery';
import GlobalHeader from '../../../components/GlobalHeader.vue';
import ProtocolSelector from '../../../components/common/ProtocolSelector.vue';
import { formatFullDateTime, formatHumanDuration } from '../../../utils/dateUtils';
import { generateSmartScale, generateScoreScale, generateTimeScale } from '../../../utils/filterUtils';
import dayjs from 'dayjs';

const { t } = useI18n();
const router = useRouter();
const viewStore = useViewSettingsStore();
const campaignsStore = useCampaignsStore();
const { dashboardSkin: currentSkin } = storeToRefs(viewStore);

// Integrazione composable
const {
  campaigns,
  loading,
  error,
  total,
  page,
  pageSize,
  fetchData
} = useCampaignsDiscovery(
  toRef(campaignsStore.state.pagination, 'page'),
  toRef(campaignsStore.state.filters, 'minIps'),
  toRef(campaignsStore.state.filters, 'minScore'),
  toRef(campaignsStore.state.filters, 'protocol'),
  toRef(campaignsStore.state.filters, 'timeMode'),
  toRef(campaignsStore.state.filters, 'agoValue'),
  toRef(campaignsStore.state.filters, 'agoUnit'),
  toRef(campaignsStore.state.pagination, 'pageSize'),
  toRef(campaignsStore.state.filters, 'minLogsPerIp'),
  toRef(campaignsStore.state.filters, 'startDate'),
  toRef(campaignsStore.state.filters, 'endDate')
);

// Scale dinamiche calcolate dai metadati del backend
const dynamicIpScale = computed(() => {
  const { minIpCount, maxIpCount } = campaignsStore.state.metadata;
  return generateSmartScale(minIpCount, maxIpCount);
});

const dynamicScoreScale = computed(() => {
  const { minScore, maxScore } = campaignsStore.state.metadata;
  return generateScoreScale(Math.floor(minScore), Math.ceil(maxScore));
});

const dynamicTimeScale = computed(() => {
  const { minDate, maxDate, globalMinDate, globalMaxDate } = campaignsStore.state.metadata;
  return generateTimeScale(minDate, maxDate, globalMinDate, globalMaxDate);
});

const dynamicLogsPerIpScale = computed(() => {
  const { minLogsPerIp, maxLogsPerIp } = campaignsStore.state.metadata;
  return generateSmartScale(minLogsPerIp, maxLogsPerIp);
});

// Logica paginazione standard
const inputPage = ref(page.value);
watch(page, (newVal) => {
  inputPage.value = newVal;
});

function goToPage() {
  const p = parseInt(inputPage.value);
  if (isNaN(p)) {
    inputPage.value = page.value;
    return;
  }
  const max = Math.ceil(total.value / pageSize.value);
  if (p < 1) page.value = 1;
  else if (p > max) page.value = max;
  else page.value = p;
}

function formatDate(ts) {
  return formatFullDateTime(ts);
}

function computeDuration(start, end) {
  if (!start || !end) return '-';
  const diff = dayjs(end).diff(dayjs(start), 'second');
  return formatHumanDuration(diff, t);
}

function goToDetail(hash) {
  const query = {
    timeMode: campaignsStore.state.filters.timeMode,
    agoValue: campaignsStore.state.filters.agoValue,
    agoUnit: campaignsStore.state.filters.agoUnit,
    minScore: campaignsStore.state.filters.minScore,
    protocol: campaignsStore.state.filters.protocol
  };

  if (campaignsStore.state.filters.startDate) query.customStartTime = campaignsStore.state.filters.startDate;
  if (campaignsStore.state.filters.endDate) query.customEndTime = campaignsStore.state.filters.endDate;

  router.push({
    name: 'CampaignDetail',
    params: { hash },
    query
  });
}

function goToHome() {
  router.push('/');
}

function goToAttacks() {
  router.push('/attacks');
}

function goToLogs() {
  router.push('/threatlogs');
}
</script>

<style scoped src="./CampaignsList.css"></style>
<style scoped>
@import "./CampaignsListCyber.css";
</style>
