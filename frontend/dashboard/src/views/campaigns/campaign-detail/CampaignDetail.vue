<template>
  <div class="campaign-detail-page" :class="'skin-' + currentSkin">
    <GlobalHeader context="campaign_detail" extraClass="cyber-sticky-area cyber-sticky-top-0">
      <template #title>
        <h1 class="header-main-title">
          {{ t('campaignDetail.title').toUpperCase() }}<span class="blinking-cursor">_</span>
        </h1>
      </template>
    </GlobalHeader>
    <div class="actions cyber-sticky-area cyber-sticky-top-1">
      <div class="nav-actions">
        <button @click="router.back()" class="btn-action">
          ← {{ t('common.back').toUpperCase() }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-overlay">
      <div class="ascii-loader">[ ANALYZING CLUSTER DNA... ]</div>
    </div>

    <div v-else-if="campaign" class="campaign-detail-container">
      <header class="detail-header">
        <div class="title-section">
          <span class="hash-title">{{ t('campaigns.patternHash') }}: {{ hash }}</span>
          <div class="target-uri-container" v-if="campaign.sampleUrl">
             <span class="target-label">{{ t('common.sample_url').toUpperCase() }}:</span>
             <span class="target-value">{{ campaign.sampleUrl }}</span>
          </div>
        </div>
      </header>

      <!-- Forensic Summary Cards -->
      <section class="forensic-grid">
        <div class="forensic-card">
          <div class="card-title">{{ t('campaignDetail.involvedIps') }}</div>
          <div class="metric-big">{{ campaign.ipCount || 0 }}</div>
        </div>
        <div class="forensic-card">
          <div class="card-title">{{ t('campaigns.totalLogs') }}</div>
          <div class="metric-big">{{ campaign.totaleLogs || 0 }}</div>
        </div>
        <div class="forensic-card">
          <div class="card-title">{{ t('attackDetail.avgScore') }}</div>
          <div class="metric-big">{{ campaign.averageScore?.toFixed(2) || '0.00' }}</div>
        </div>
      </section>

      <!-- Campaign Timeline Summary -->
      <section class="forensic-grid">
        <div class="forensic-card">
          <div class="card-title">{{ t('campaigns.firstSeen') }}</div>
          <div class="metric-med">{{ formatDate(campaign.firstSeen) }}</div>
        </div>
        <div class="forensic-card">
          <div class="card-title">{{ t('campaigns.lastSeen') }}</div>
          <div class="metric-med">{{ formatDate(campaign.lastSeen) }}</div>
        </div>
        <div class="forensic-card" v-if="campaign.lastSeen && campaign.firstSeen && campaign.lastSeen !== campaign.firstSeen">
          <div class="card-title">{{ t('common.duration_label') }}</div>
          <div class="metric-med duration-highlight">{{ computeDuration(campaign.firstSeen, campaign.lastSeen) }}</div>
        </div>
      </section>

      <!-- Enriched Cluster Nodes List -->
      <section class="cluster-section">
        <div class="section-header">
           <h2 class="card-title">{{ t('campaignDetail.ipList') }}</h2>
           <div class="header-cluster-actions">
              <button v-if="campaign && campaign.allIps?.length" 
                      @click="investigateCluster" 
                      class="btn-action btn-investigate-cluster">
                🚀 {{ t('campaignDetail.investigateCluster').toUpperCase() }}
              </button>
              <div class="pager-mini-wrapper" v-if="campaign.ipCount > pageSize">
                <CyberPager v-model:page="nodesPage" :pageSize="pageSize" :total="campaign.ipCount" simple size="mini" @change="loadCampaign" />
              </div>
           </div>
        </div>

        <div class="nodes-list">
          <div v-for="node in campaign.nodes" :key="node.ip" class="enriched-node-card">
            <div class="node-header">
              <div class="ip-info">
                <CountryFlag :countryCode="node.geoInfo?.ipinfo?.country" 
                             :tooltip="node.geoInfo?.ipinfo ? `${node.geoInfo.ipinfo.country} - ${node.geoInfo.ipinfo.org}` : 'N/A'" />
                <span class="ip-val" @click="goToIp(node.ip)">{{ node.ip }}</span>
              </div>
              <div class="score-badge" :class="getScoreClass(node.averageScore)">
                SCORE: {{ node.averageScore?.toFixed(1) }}
              </div>
            </div>

            <div class="node-stats-row">
              <div class="stat">
                <span class="stat-label">LOGS:</span>
                <span class="stat-value">{{ node.totaleLogs }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">DURATA:</span>
                <span class="stat-value">{{ computeDuration(node.firstSeen, node.lastSeen) }}</span>
              </div>
            </div>

            <div class="node-techniques" v-if="node.attackPatterns?.length">
              <div class="tech-mini-tags">
                <span v-for="tech in node.attackPatterns" :key="tech" class="tech-mini-tag">{{ tech }}</span>
              </div>
            </div>

            <div class="node-timeline">
              <div class="time-point">
                <span class="point-label">FIRST:</span> {{ formatTimePoint(node.firstSeen) }}
              </div>
              <div class="time-point">
                <span class="point-label">LAST:</span> {{ formatTimePoint(node.lastSeen) }}
              </div>
            </div>
            
            <div class="node-footer-actions">
              <button class="intel-det-btn-mini btn-profile" @click="goToIp(node.ip)">
                {{ t('campaignDetail.viewProfile') }}
              </button>
              <button class="intel-det-btn-mini btn-investigate" @click="investigateIp(node.ip)">
                {{ t('campaignDetail.investigate') }}
              </button>
            </div>
          </div>
        </div>

        <div class="pager-footer-wrapper" v-if="campaign.ipCount > pageSize">
          <CyberPager v-model:page="nodesPage" v-model:pageSize="pageSize" :total="campaign.ipCount" @change="loadCampaign" />
        </div>
      </section>
    </div>
    
    <div v-else class="no-campaigns-detail">
       <div class="ascii-art">( ! )</div>
       <p>{{ t('common.noDataFound') }}</p>
       <button class="btn-action" @click="router.back()">{{ t('common.back').toUpperCase() }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useViewSettingsStore } from '../../../stores/viewSettings';
import { fetchCampaignDetail } from '../../../api';
import GlobalHeader from '../../../components/GlobalHeader.vue';
import CyberPager from '../../../components/common/CyberPager.vue';
import CountryFlag from '../../../components/CountryFlag.vue';
import { formatFullDateTime, formatHumanDuration, formatDateTime } from '../../../utils/dateUtils';
import dayjs from 'dayjs';

const props = defineProps({
  hash: { type: String, required: true },
  minLogsPerIp: { type: Number, default: 1 },
  minScore: { type: Number, default: 0 },
  protocol: { type: String, default: null },
  timeMode: { type: String, default: 'ago' },
  agoValue: { type: [Number, null], default: null },
  agoUnit: { type: [String, null], default: null }
});

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const viewStore = useViewSettingsStore();
const { dashboardSkin: currentSkin } = storeToRefs(viewStore);

const campaign = ref(null);
const loading = ref(true);
const nodesPage = ref(1);
const pageSize = ref(10);

async function loadCampaign() {
  loading.value = true;
  try {
    const data = await fetchCampaignDetail({
      hash: props.hash,
      minLogsPerIp: props.minLogsPerIp,
      minScore: props.minScore,
      protocol: props.protocol,
      page: nodesPage.value,
      pageSize: pageSize.value,
      timeConfig: {
        startTime: route.query.customStartTime,
        endTime: route.query.customEndTime,
        timeMode: props.timeMode,
        agoValue: props.agoValue,
        agoUnit: props.agoUnit
      }
    });
    
    campaign.value = data;
  } catch (err) {
    console.error('[CampaignDetail] Error loading campaign:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(loadCampaign);

function formatDate(ts) {
  return formatFullDateTime(ts);
}

function formatTimePoint(ts) {
  return formatDateTime(ts);
}

function computeDuration(start, end) {
  if (!start || !end) return '-';
  const diff = dayjs(end).diff(dayjs(start), 'second');
  if (diff < 1) return '< 1s';
  return formatHumanDuration(diff, t);
}

function getScoreClass(score) {
  if (score >= 80) return 'danger-high';
  if (score >= 50) return 'danger-medium';
  if (score >= 20) return 'danger-low';
  return 'danger-info';
}

function investigateIp(ip) {
  const query = {
    timeMode: props.timeMode,
    agoValue: props.agoValue,
    agoUnit: props.agoUnit,
    minLogsForAttack: props.minLogsPerIp || 1
  };
  
  // Gestione date custom per coerenza con AttackDetail
  if (route.query.customStartTime || route.query.customEndTime) {
    query.dateRange = JSON.stringify([
      route.query.customStartTime || null,
      route.query.customEndTime || null
    ]);
  }

  router.push({
    name: 'AttackDetail',
    params: { ip },
    query
  });
}

function goToIp(ip) {
  router.push(`/ip/${ip}`);
}

function investigateCluster() {
  if (!campaign.value || !campaign.value.allIps || campaign.value.allIps.length === 0) return;
  
  const query = {
    timeMode: props.timeMode,
    agoValue: props.agoValue,
    agoUnit: props.agoUnit,
    minLogsForAttack: props.minLogsPerIp || 1,
    ipList: JSON.stringify(campaign.value.allIps)
  };
  
  if (route.query.customStartTime || route.query.customEndTime) {
    query.dateRange = JSON.stringify([
      route.query.customStartTime || null,
      route.query.customEndTime || null
    ]);
  }

  router.push({
    name: 'AttackDetail',
    params: { ip: campaign.value.allIps[0] },
    query
  });
}
</script>

<style scoped src="./CampaignDetail.css"></style>
<style scoped>
@import "./CampaignDetailCyber.css";

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 15px;
  flex-wrap: wrap;
}

.header-cluster-actions {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .header-cluster-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .btn-investigate-cluster {
    flex: 1;
    text-align: center;
  }
}

.nodes-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

@media (max-width: 480px) {
  .nodes-list {
    grid-template-columns: 1fr;
  }
}

.enriched-node-card {
  background: rgba(var(--cy-primary-rgb, 0, 255, 65), 0.05);
  border: 1px solid var(--cy-border, rgba(0, 255, 65, 0.2));
  border-left: 3px solid var(--cy-primary, #00FF41);
  padding: 18px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%);
  font-family: 'JetBrains Mono', monospace;
  overflow: hidden;
}

.enriched-node-card::after {
  content: 'PARTICIPANT_NODE';
  position: absolute;
  bottom: 6px;
  right: 15px;
  font-size: 0.5rem;
  opacity: 0.3;
  color: var(--cy-primary, #00FF41);
  letter-spacing: 1px;
}

.enriched-node-card:hover {
  background: rgba(var(--cy-primary-rgb, 0, 255, 65), 0.12);
  border-color: var(--cy-primary, #00FF41);
  box-shadow: 0 0 25px rgba(var(--cy-primary-rgb, 0, 255, 65), 0.15);
  transform: translateY(-3px);
}

.node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  border-bottom: 1px solid rgba(var(--cy-primary-rgb, 0, 255, 65), 0.15);
  padding-bottom: 10px;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 480px) {
  .node-header {
    flex-direction: column;
    align-items: flex-start;
  }
}

.ip-info {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 100%;
}

.ip-val {
  font-weight: 900;
  color: #fff;
  cursor: pointer;
  font-size: 1.05rem;
  letter-spacing: -0.5px;
  word-break: break-all;
}

.ip-val:hover {
  color: var(--cy-primary, #00FF41);
  text-shadow: 0 0 10px var(--cy-primary, #00FF41);
}

.score-badge {
  font-size: 0.65rem;
  padding: 3px 8px;
  border-radius: 0;
  border: 1px solid currentColor;
  font-weight: 800;
  background: rgba(0, 0, 0, 0.3);
  white-space: nowrap;
}

.danger-high { color: #ff3366; border-color: #ff3366; }
.danger-medium { color: #f39c12; border-color: #f39c12; }
.danger-low { color: #3498db; border-color: #3498db; }
.danger-info { color: var(--cy-primary, #00FF41); border-color: var(--cy-primary, #00FF41); }

.node-stats-row {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 15px;
  margin-bottom: 15px;
}

@media (max-width: 400px) {
  .node-stats-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 0.55rem;
  opacity: 0.5;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.stat-value {
  font-weight: 800;
  font-size: 0.95rem;
  color: var(--cy-primary, #00FF41);
}

.tech-mini-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 18px;
  min-height: 20px;
}

.tech-mini-tag {
  font-size: 0.5rem;
  padding: 1px 6px;
  background: rgba(var(--cy-primary-rgb, 0, 255, 65), 0.08);
  border: 1px solid rgba(var(--cy-primary-rgb, 0, 255, 65), 0.3);
  color: #fff;
  border-radius: 10px;
  text-transform: uppercase;
  font-weight: bold;
}

.node-timeline {
  font-size: 0.65rem;
  background: rgba(0, 0, 0, 0.2);
  padding: 8px 10px;
  border-radius: 2px;
  margin-bottom: 15px;
}

.time-point {
  margin-bottom: 4px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.time-point:last-child { margin-bottom: 0; }

.point-label {
  opacity: 0.5;
  font-weight: normal;
  white-space: nowrap;
}

.node-footer-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.intel-det-btn-mini {
  flex: 1;
  background: transparent;
  border: 1px solid var(--cy-primary, #00FF41);
  color: var(--cy-primary, #00FF41);
  font-size: 0.6rem;
  padding: 8px 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: bold;
  letter-spacing: 1px;
  clip-path: polygon(5px 0, 100% 0, 100% 100%, 0 100%, 0 5px);
  min-width: 100px;
}

.btn-profile {
  opacity: 0.8;
  border-color: rgba(var(--cy-primary-rgb, 0, 255, 65), 0.5);
}

.btn-investigate {
  background: rgba(var(--cy-primary-rgb, 0, 255, 65), 0.1);
}

.intel-det-btn-mini:hover {
  background: var(--cy-primary, #00FF41);
  color: #000;
  opacity: 1;
  box-shadow: 0 0 15px rgba(var(--cy-primary-rgb, 0, 255, 65), 0.4);
}
</style>
