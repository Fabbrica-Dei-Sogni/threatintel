<template>
  <div class="telemetry-stats-component">
    <!-- Header with Reset -->
    <div class="telemetry-header">
      <div class="header-left">
        <h3>{{ t('telemetry.title') }}</h3>
      </div>
      <div class="header-right">
        <button class="reset-btn" @click="resetFilters">
          <i class="el-icon-refresh"></i>
          <span>{{ t('telemetry.reset_filters') }}</span>
        </button>
      </div>
    </div>

    <!-- Filters Section -->
    <div class="filter-sections">
      <!-- Timeframe -->
      <div class="filter-group">
        <span class="group-label">{{ t('telemetry.filter_label') }}</span>
        <div class="tabs-row">
          <button 
            v-for="tf in ['24h', '1w', '1m', '1y', 'all']" 
            :key="tf"
            class="tab-btn"
            :class="{ active: selectedTimeframe === tf }"
            @click="setTimeframe(tf)"
          >
            {{ tf.toUpperCase().replace('1W', '7D') }}
          </button>
        </div>
      </div>

      <!-- Risk Level -->
      <div class="filter-group">
        <span class="group-label">{{ t('telemetry.filter_score_label') }}</span>
        <div class="tabs-row">
          <button 
            v-for="lvl in ['info', 'low', 'med', 'high']" 
            :key="lvl"
            class="tab-btn"
            :class="['risk-' + lvl, { active: selectedLevel === lvl }]"
            @click="setScore(dynamicThresholds[lvl], lvl)"
          >
            {{ t('telemetry.risk_level_' + lvl) }}
          </button>
        </div>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid" v-loading="loading" element-loading-background="rgba(0,0,0,0.3)">
      <div class="stat-card">
        <div class="stat-lbl">{{ t('telemetry.label_traffic') }}</div>
        <div class="stat-val">{{ stats?.totalRequests || 0 }}</div>
      </div>
      <div class="stat-card pink">
        <div class="stat-lbl">{{ t('telemetry.label_threats') }}</div>
        <div class="stat-val">{{ stats?.suspiciousRequests || 0 }}</div>
      </div>
      <!-- Nodi Unici hidden as requested -->
      <!-- 
      <div class="stat-card">
        <div class="stat-lbl">{{ t('telemetry.label_unique_nodes') }}</div>
        <div class="stat-val">{{ stats?.uniqueIPs?.length || 0 }}</div>
      </div> 
      -->
    </div>

    <!-- Top Ranking Filter (between stats and lists) -->
    <div class="ranking-filter-row">
      <div class="filter-group">
        <span class="group-label">{{ t('telemetry.top_ranking') }}</span>
        <div class="tabs-row">
          <button 
            v-for="top in ['5', '10', '20', 'all']" 
            :key="top"
            class="tab-btn"
            :class="{ active: selectedTop === top }"
            @click="setTop(top)"
          >
            {{ top.toUpperCase() }}
          </button>
        </div>
      </div>
    </div>

    <!-- Data Lists (Countries & Indicators) -->
    <div v-if="stats" class="data-lists-row">
      <!-- Countries -->
      <div class="data-panel">
        <h4>{{ t('telemetry.top_countries', { count: selectedTop }) }}</h4>
        <ul class="list-items">
          <li v-for="(count, key) in stats.topCountries" :key="key" class="list-row">
            <div class="row-label">
              <country-flag :country-code="key" size="mini" />
              <span>{{ key }}</span>
            </div>
            <div class="row-value">{{ count }}</div>
          </li>
          <li v-if="Object.keys(stats.topCountries || {}).length === 0" class="list-row empty">
            {{ t('common.noDataFound') }}
          </li>
        </ul>
      </div>

      <!-- Indicators -->
      <div class="data-panel">
        <h4>{{ t('telemetry.top_indicators', { count: selectedTop }) }}</h4>
        <ul class="list-items">
          <li v-for="(count, key) in stats.topIndicators" :key="key" class="list-row">
            <div class="row-label">
              <defcon-indicator :level="getIndicatorLevel(key)" mode="dot" hide-label />
              <span>{{ key }}</span>
            </div>
            <div class="row-value">{{ count }}</div>
          </li>
          <li v-if="Object.keys(stats.topIndicators || {}).length === 0" class="list-row empty">
            {{ t('common.noDataFound') }}
          </li>
        </ul>
      </div>
    </div>

    <!-- Error/Loading states handled via v-loading or local template if needed -->
    <div v-if="error" class="cyber-error">
      <p>{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStats } from '../composable/useStats';
import CountryFlag from './CountryFlag.vue';
import DefconIndicator from './DefconIndicator.vue';
import './TelemetryStatsCyber.css';

const { t } = useI18n();
const {
  loading,
  error,
  stats,
  selectedTimeframe,
  selectedScore,
  selectedLevel,
  selectedTop,
  dynamicThresholds,
  loadStats,
  setTimeframe,
  setScore,
  setTop,
  resetFilters
} = useStats();

onMounted(() => {
  loadStats();
});

// Helper for Defcon levels mapping to numeric 1-5
const getIndicatorLevel = (indicator) => {
  const lower = indicator.toLowerCase();
  if (lower.includes('brute') || lower.includes('exploit')) return 2; // High
  if (lower.includes('scan') || lower.includes('crawl')) return 3; // Med
  return 4; // Low
};
</script>

<style scoped>
/* Local overrides if necessary, but most is in TelemetryStatsCyber.css */
.empty {
  opacity: 0.5;
  font-style: italic;
  font-size: 0.8rem;
  justify-content: center !important;
}
</style>
