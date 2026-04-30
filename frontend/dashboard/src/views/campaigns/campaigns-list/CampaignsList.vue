<!--
  ThreatIntel - Reference Implementation Dashboard
  
  This frontend application is provided as a reference implementation of the 
  ThreatIntel Distributed Forensics Engine. 
  
  Copyright (C) 2026 Alessandro Modica. All rights reserved.
  
  Use of this frontend for educational, research, and non-commercial purposes 
  is permitted. Production or commercial use of this specific dashboard 
  interface requires a valid commercial license from the author.
  
  See root LICENSE.md for core engine licensing details.
-->
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
              <ProtocolSelector v-model="campaignsStore.state.filters.protocol" theme="phosphorus" />
              <button class="reset-btn-mini filter-reset-btn" @click="campaignsStore.resetFilters" :title="t('telemetry.reset_filters')">
                <div class="reset-ascii">
                  <span></span>
                  <span></span>
                </div>
              </button>
            </div>
          </div>

          <div class="filter-group">
            <UriFilterPicker 
              :selected-uris="campaignsStore.state.filters.selectedUris"
              :protocol="campaignsStore.state.filters.protocol"
              :min-ips="campaignsStore.state.filters.minIps"
              :min-score="campaignsStore.state.filters.minScore"
              :time-config="{
                timeMode: campaignsStore.state.filters.timeMode,
                agoValue: campaignsStore.state.filters.agoValue,
                agoUnit: campaignsStore.state.filters.agoUnit,
                startTime: campaignsStore.state.filters.startDate,
                endTime: campaignsStore.state.filters.endDate
              }"
              @toggle-uri="campaignsStore.toggleUri"
              @clear-uris="campaignsStore.clearUris"
            />
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
                @click="campaignsStore.state.filters.minIps = (campaignsStore.state.filters.minIps === val ? 1 : val)">
                {{ val }}
              </button>
            </div>
          </div>

          <div class="filter-group" v-if="dynamicScoreScale.length > 0 && campaignsStore.state.metadata.maxScore > 0">
            <label class="cyber-label">{{ t('telemetry.filter_score_label') }}</label>
            <div class="tabs-row">
              <button v-for="val in dynamicScoreScale" :key="val" class="tab-btn"
                :class="{ active: minScore === val }"
                @click="minScore = (minScore === val ? 0 : val)">
                {{ val === 0 ? 'INFO' : val }}
              </button>
            </div>
          </div>

          <div class="filter-group" v-if="dynamicLogsPerIpScale.length > 0 && campaignsStore.state.metadata.maxLogsPerIp > 0">
            <label class="cyber-label">LOGS/IP</label>
            <div class="tabs-row">
              <button v-for="val in dynamicLogsPerIpScale" :key="val" class="tab-btn"
                :class="{ active: minLogsPerIp === val }"
                @click="minLogsPerIp = (minLogsPerIp === val ? 1 : val)">
                {{ val }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Top Pager -->
      <div v-if="total > 0" class="pagination-wrapper top-pager">
        <CyberPager v-model:page="page" v-model:pageSize="pageSize" :total="total" />
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
          
          <!-- Card Header: Fixed height for consistent alignment -->
          <div class="card-header-tech">
            <div class="header-spacer"></div>
            <div v-if="campaign.correlationHubsCount > 0" class="correlation-signal" :class="{ 'high-intensity': campaign.correlationHubsCount > 2 }">
              <span class="signal-icon">📡</span>
              <span class="signal-text">HUB: {{ campaign.correlationHubsCount }}</span>
              <div class="signal-pulse"></div>
            </div>
            <!-- Se non ci sono Hub, l'header rimane vuoto ma mantiene lo spazio -->
          </div>

          <!-- Core Metrics: Fixed Grid -->
          <div class="card-metrics-row">
            <div class="metric-item">
              <span class="m-label">{{ t('campaigns.table.ips').toUpperCase() }}</span>
              <span class="m-value">{{ campaign.ipCount }}</span>
            </div>
            <div class="metric-item">
              <span class="m-label">{{ t('campaigns.table.logs').toUpperCase() }}</span>
              <span class="m-value">{{ campaign.totaleLogs }}</span>
            </div>
            <div class="metric-item" :class="getScoreClass(campaign.averageScore)">
              <span class="m-label">SCORE</span>
              <span class="m-value">{{ campaign.averageScore?.toFixed(1) || '0.0' }}</span>
            </div>
          </div>

          <div class="card-target-section">
             <span class="t-label">{{ t('common.sample_url').toUpperCase() }}</span>
             <div class="t-value-wrap">{{ campaign.sampleUrl || '/' }}</div>
          </div>

          <div v-if="campaign.attackPatterns?.length" class="card-techniques-area">
              <div class="tech-mini-list">
                 <span v-for="tech in campaign.attackPatterns.slice(0, 3)" :key="tech" class="tech-mini-tag">
                    {{ tech }}
                 </span>
                 <span v-if="campaign.attackPatterns.length > 3" class="tech-more">+{{ campaign.attackPatterns.length - 3 }}</span>
              </div>
          </div>

          <div class="card-footer-timeline">
            <div class="time-block">
              <span class="time-label">FIRST_SEEN</span>
              <span class="time-val">{{ formatDate(campaign.firstSeen) }}</span>
            </div>
            <div class="go-action">
              <span class="arrow-icon">▶</span>
            </div>
          </div>
        </div>
      </transition-group>

      <!-- Bottom Pager -->
      <div v-if="total > 0" class="pagination-wrapper bottom-pager">
        <CyberPager v-model:page="page" v-model:pageSize="pageSize" :total="total" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, toRef, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useViewSettingsStore } from '../../../stores/viewSettings';
import { useCampaignsStore } from '../../../stores/campaigns';
import { useCampaignsDiscovery } from '../../../composable/useCampaignsDiscovery';
import GlobalHeader from '../../../components/GlobalHeader.vue';
import ProtocolSelector from '../../../components/common/ProtocolSelector.vue';
import CyberPager from '../../../components/common/CyberPager.vue';
import UriFilterPicker from '../../../components/campaigns/UriFilterPicker.vue';
import { formatFullDateTime, formatHumanDuration } from '../../../utils/dateUtils';
import { generateSmartScale, generateScoreScale, generateTimeScale } from '../../../utils/filterUtils';
import dayjs from 'dayjs';

const props = defineProps({
  initialPage: Number,
  initialMinIps: Number,
  initialMinScore: Number,
  initialMinLogsPerIp: Number,
  initialProtocol: String,
  initTimeMode: String,
  initAgoValue: Number,
  initAgoUnit: String,
  initialUris: String // Comma separated string from query
});

const { t } = useI18n();
const router = useRouter();
const viewStore = useViewSettingsStore();
const campaignsStore = useCampaignsStore();
const { dashboardSkin: currentSkin } = storeToRefs(viewStore);

onMounted(() => {
  if (props.initialPage !== undefined) campaignsStore.state.pagination.page = props.initialPage;
  if (props.initialMinIps !== undefined) campaignsStore.state.filters.minIps = props.initialMinIps;
  if (props.initialMinScore !== undefined) campaignsStore.state.filters.minScore = props.initialMinScore;
  if (props.initialMinLogsPerIp !== undefined) campaignsStore.state.filters.minLogsPerIp = props.initialMinLogsPerIp;
  if (props.initialProtocol !== undefined) campaignsStore.state.filters.protocol = props.initialProtocol;
  if (props.initTimeMode !== undefined) campaignsStore.state.filters.timeMode = props.initTimeMode;
  if (props.initAgoValue !== undefined) campaignsStore.state.filters.agoValue = props.initAgoValue;
  if (props.initAgoUnit !== undefined) campaignsStore.state.filters.agoUnit = props.initAgoUnit;
  if (props.initialUris) campaignsStore.state.filters.selectedUris = props.initialUris.split(',');
});

watch(
  [
    () => campaignsStore.state.pagination.page,
    () => campaignsStore.state.filters.minIps,
    () => campaignsStore.state.filters.minScore,
    () => campaignsStore.state.filters.minLogsPerIp,
    () => campaignsStore.state.filters.protocol,
    () => campaignsStore.state.filters.timeMode,
    () => campaignsStore.state.filters.agoValue,
    () => campaignsStore.state.filters.agoUnit,
    () => campaignsStore.state.filters.selectedUris
  ],
  ([page, minIps, minScore, minLogsPerIp, protocol, timeMode, agoValue, agoUnit, uris]) => {
    const query = {};
    if (page > 1) query.page = page;
    if (minIps > 1) query.minIps = minIps;
    if (minScore > 0) query.minScore = minScore;
    if (minLogsPerIp > 1) query.minLogsPerIp = minLogsPerIp;
    if (protocol && protocol !== 'http') query.protocol = protocol;
    if (timeMode && timeMode !== 'ago') query.timeMode = timeMode;
    if (agoValue && agoValue !== 7) query.agoValue = agoValue;
    if (agoUnit && agoUnit !== 'days') query.agoUnit = agoUnit;
    if (uris && uris.length > 0) query.uris = uris.join(',');

    router.replace({ name: 'Campaigns', query }).catch(() => {});
  },
  { deep: true }
);

// Integrazione composable
const {
  campaigns,
  loading,
  error,
  total,
  page,
  pageSize,
  minIps,
  minScore,
  minLogsPerIp,
  protocol,
  timeMode,
  agoValue,
  agoUnit,
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
  toRef(campaignsStore.state.filters, 'endDate'),
  toRef(campaignsStore.state.filters, 'selectedUris')
);

// Scale dinamiche calcolate dai metadati del backend
const dynamicIpScale = computed(() => {
  const { minIpCount, maxIpCount } = campaignsStore.state.metadata;
  return generateSmartScale(minIpCount, maxIpCount, 6, minIps.value);
});

const dynamicScoreScale = computed(() => {
  const { minScore: metaMin, maxScore: metaMax } = campaignsStore.state.metadata;
  return generateScoreScale(Math.floor(metaMin), Math.ceil(metaMax), minScore.value);
});

const dynamicTimeScale = computed(() => {
  const { minDate, maxDate, globalMinDate, globalMaxDate } = campaignsStore.state.metadata;
  return generateTimeScale(minDate, maxDate, globalMinDate, globalMaxDate);
});

const dynamicLogsPerIpScale = computed(() => {
  const { minLogsPerIp: metaMin, maxLogsPerIp: metaMax } = campaignsStore.state.metadata;
  return generateSmartScale(metaMin, metaMax, 6, minLogsPerIp.value);
});

function formatDate(ts) {
  return formatFullDateTime(ts);
}

function computeDuration(start, end) {
  if (!start || !end) return '-';
  const diff = dayjs(end).diff(dayjs(start), 'second');
  return formatHumanDuration(diff, t);
}

function getScoreClass(score) {
  if (score >= 80) return 'danger-high';
  if (score >= 50) return 'danger-medium';
  if (score >= 20) return 'danger-low';
  return 'danger-info';
}

function goToDetail(hash) {
  const query = {
    timeMode: campaignsStore.state.filters.timeMode,
    agoValue: campaignsStore.state.filters.agoValue,
    agoUnit: campaignsStore.state.filters.agoUnit,
    minScore: campaignsStore.state.filters.minScore,
    minLogsPerIp: campaignsStore.state.filters.minLogsPerIp,
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
