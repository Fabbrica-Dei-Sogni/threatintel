<template>
  <div class="campaign-detail-page" :class="'skin-' + currentSkin">
    <GlobalHeader context="campaign_detail" extraClass="cyber-sticky-area cyber-sticky-top-0" />
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
          <h1>{{ t('campaignDetail.title').toUpperCase() }}</h1>
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
             <div v-for="tech in (campaign.techniques || [])" :key="tech" class="tech-tag">
                {{ tech }}
             </div>
             <div v-if="(!campaign.techniques || campaign.techniques.length === 0)" class="no-tech">
                {{ t('common.noDataFound') }}
             </div>
          </div>
        </div>
      </section>

      <!-- Distributed Timeline Placeholder -->
      <section class="forensic-card">
        <div class="card-title">{{ t('campaignDetail.distributedTimeline') }}</div>
        <div class="timeline-visualization">
            <!-- Qui andrà il componente grafico della timeline distribuita -->
            <div class="placeholder-msg">
                [ TIMELINE AGGREGATA: {{ formatDate(campaign.firstSeen) }} -> {{ formatDate(campaign.lastSeen) }} ]
            </div>
        </div>
      </section>

      <!-- Cluster Nodes Map (Moved to Bottom) -->
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
import { formatFullDateTime } from '../../utils/dateUtils';

const props = defineProps({
  hash: { type: String, required: true },
  minLogsForAttack: { type: Number, default: 1 },
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
    const timeConfig = props.timeMode === 'ago' 
      ? { [props.agoUnit]: props.agoValue } 
      : {};

    const data = await fetchCampaignDetail({
      hash: props.hash,
      minLogsForAttack: props.minLogsForAttack,
      timeConfig
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

function goToIp(ip) {
  router.push(`/ip/${ip}`);
}
</script>

<style scoped src="./CampaignDetail.css"></style>
