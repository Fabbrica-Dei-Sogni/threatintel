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
          <div class="target-uri-container" v-if="campaign.request?.url">
             <span class="target-label">{{ t('common.sample_url').toUpperCase() }}:</span>
             <span class="target-value">{{ campaign.request.url }}</span>
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

      <!-- Common Techniques / Indicators -->
      <section class="forensic-grid">
        <div class="forensic-card full-width">
          <div class="card-title">{{ t('campaignDetail.commonTechniques') }}</div>
          <div class="techniques-list">
             <div v-for="tech in (campaign.attackPatterns || [])" :key="tech" class="tech-tag">
                {{ tech }}
             </div>
             <div v-if="(!campaign.attackPatterns || campaign.attackPatterns.length === 0)" class="no-tech">
                {{ t('common.noDataFound') }}
             </div>
          </div>
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

      <!-- Cluster Nodes Map -->
      <section class="cluster-section">
        <div class="card-title">{{ t('campaignDetail.ipList') }}</div>
        <div class="cluster-nodes-grid">
          <div v-for="node in (campaign.ips || [])" :key="node" class="node-card">
            <div class="node-info">
              <div class="node-ip" @click="goToIp(node)">{{ node }}</div>
              <div class="node-meta">NODE_PARTICIPANT_ID: {{ node.split('.').pop() }}</div>
            </div>
            <div class="node-action">
              <button class="sync-btn-mini" @click="goToIp(node)">👁️</button>
            </div>
          </div>
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
import { useViewSettingsStore } from '../../stores/viewSettings';
import { fetchCampaignDetail } from '../../api';
import GlobalHeader from '../../components/GlobalHeader.vue';
import { formatFullDateTime, formatHumanDuration } from '../../utils/dateUtils';
import dayjs from 'dayjs';

const props = defineProps({
  hash: { type: String, required: true },
  minLogsForAttack: { type: Number, default: 1 },
  minScore: { type: Number, default: 0 },
  timeMode: { type: String, default: 'ago' },
  agoValue: { type: Number, default: 30 },
  agoUnit: { type: String, default: 'days' }
});

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const viewStore = useViewSettingsStore();
const { dashboardSkin: currentSkin } = storeToRefs(viewStore);

const campaign = ref(null);
const loading = ref(true);

async function loadCampaign() {
  loading.value = true;
  try {
    const data = await fetchCampaignDetail({
      hash: props.hash,
      ips: [], 
      minLogsForAttack: props.minLogsForAttack,
      minScore: props.minScore,
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

function computeDuration(start, end) {
  if (!start || !end) return '-';
  const diff = dayjs(end).diff(dayjs(start), 'second');
  return formatHumanDuration(diff, t);
}

function goToIp(ip) {
  router.push(`/ip/${ip}`);
}
</script>

<style scoped src="./CampaignDetail.css"></style>
