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
        <!-- Reset Button -->
        <button class="reset-btn-mini reset-view-control" @click="campaignsStore.resetFilters" :title="t('telemetry.reset_filters')">
          <div class="reset-ascii">
            <span></span>
            <span></span>
          </div>
        </button>
      </div>
    </div>

    <div class="campaigns-container">

      <!-- Filters -->
      <section class="campaigns-filters">
        <div class="filter-group">
          <label class="cyber-label">{{ t('campaigns.minIpsLabel') }}</label>
          <div class="tabs-row">
            <button v-for="val in [2, 3, 5, 10, 20]" :key="val" class="tab-btn"
              :class="{ active: campaignsStore.state.filters.minIps === val }"
              @click="campaignsStore.state.filters.minIps = val">
              {{ val }}
            </button>
          </div>
        </div>

        <div class="filter-group">
          <label class="cyber-label">{{ t('telemetry.filter_label') }}</label>
          <div class="tabs-row">
            <button v-for="opt in [
              { v: 1, u: 'hours', l: '1H' },
              { v: 24, u: 'hours', l: '24H' },
              { v: 7, u: 'days', l: '7D' },
              { v: 30, u: 'days', l: '1M' },
              { v: 90, u: 'days', l: '3M' }
            ]" :key="opt.l" class="tab-btn"
              :class="{ active: campaignsStore.state.filters.agoValue === opt.v && campaignsStore.state.filters.agoUnit === opt.u }"
              @click="campaignsStore.state.filters.agoValue = opt.v; campaignsStore.state.filters.agoUnit = opt.u">
              {{ opt.l }}
            </button>
          </div>
        </div>
      </section>

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
              DNA: {{ campaign.hash.substring(0, 8) }}
            </div>
            <div class="cluster-size">
              <span class="size-val">{{ campaign.ipCount }}</span>
              <span class="size-label">IP NODES</span>
            </div>
          </div>

          <div class="card-metrics">
            <div class="metric-item">
              <span class="metric-label">{{ t('campaigns.totalLogs') }}</span>
              <span class="metric-value">{{ campaign.totalLogs }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">SAMPLE URL</span>
              <span class="metric-value" :title="campaign.sampleUrl">{{ campaign.sampleUrl || '/' }}</span>
            </div>
          </div>

          <div class="card-footer">
            <div class="timeline-info">
              <div>{{ t('campaigns.firstSeen') }}: {{ formatDate(campaign.firstSeen) }}</div>
              <div v-if="campaign.lastSeen !== campaign.firstSeen">
                DURATA: {{ computeDuration(campaign.firstSeen, campaign.lastSeen) }}
              </div>
            </div>
            <div class="go-btn">
              <span class="badge-icon">👉</span>
            </div>
          </div>
        </div>
      </transition-group>

      <!-- Pagination -->
      <div v-if="total > pageSize" class="pagination cyber-pagination">
        <button :disabled="page === 1" @click="page--">◄ {{ t('common.prev') }}</button>
        <span class="pagination-info cyber-pagination-info">
          {{ t('common.page') }} {{ page }} {{ t('common.of') }} {{ Math.ceil(total / pageSize) }}
        </span>
        <button :disabled="page >= Math.ceil(total / pageSize)" @click="page++">
          {{ t('common.next') }} ►
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, toRef, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useViewSettingsStore } from '../../stores/viewSettings';
import { useCampaignsStore } from '../../stores/campaigns';
import { useCampaignsDiscovery } from '../../composable/useCampaignsDiscovery';
import GlobalHeader from '../../components/GlobalHeader.vue';
import { formatFullDateTime, formatHumanDuration } from '../../utils/dateUtils';
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
  toRef(campaignsStore.state.filters, 'timeMode'),
  toRef(campaignsStore.state.filters, 'agoValue'),
  toRef(campaignsStore.state.filters, 'agoUnit'),
  toRef(campaignsStore.state.pagination, 'pageSize')
);

onMounted(fetchData);

function formatDate(ts) {
  return formatFullDateTime(ts);
}

function computeDuration(start, end) {
  if (!start || !end) return '-';
  const diff = dayjs(end).diff(dayjs(start), 'second');
  return formatHumanDuration(diff, t);
}

function goToDetail(hash) {
  router.push({
    name: 'CampaignDetail',
    params: { hash },
    query: {
      timeMode: campaignsStore.state.filters.timeMode,
      agoValue: campaignsStore.state.filters.agoValue,
      agoUnit: campaignsStore.state.filters.agoUnit
    }
  });
}

function goToHome() {
  router.push('/');
}

function goToAttacks() {
  router.push('/attacks');
}

function goToLogs() {
  router.push('/logs');
}
</script>

<style scoped src="./CampaignsList.css"></style>
