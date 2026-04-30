<template>
  <div class="dashboard" :class="'skin-' + currentSkin">
    <GlobalHeader context="home" extraClass="header-top" />

    <div class="dashboard-hero">
      <div class="hero-container">
        <h1>{{ t('home.title').toUpperCase() }}</h1>
        <button @click="dashboardStore.resetToDefaults" class="reset-btn-mini global-reset"
          :title="t('common.reset_layout')">
          <div class="reset-ascii">
            <span></span>
            <span></span>
          </div>
        </button>
      </div>
    </div>

    <!-- Breaking News Row -->
    <div class="breaking-news-row" v-if="showTicker">
      <BreakingNews mode="ticker" :attacks="recentAttacks" :sessions="recentSessions" :logs="recentLogs"
        :isVisible="showTicker" />
    </div>

    <section class="intel-center">
      <section class="actions">
        <button @click="dashboardStore.toggleWidget('telemetries')"
          :class="{ active: dashboardStore.isWidgetActive('telemetries') }" class="btn-action">📊 {{
            t('home.telemetries').toUpperCase() }}</button>
        <button @click="dashboardStore.toggleWidget('attacks')"
          :class="{ active: dashboardStore.isWidgetActive('attacks') }" class="btn-action">🛰️ {{
            t('home.attacks').toUpperCase() }}</button>
        <button @click="dashboardStore.toggleWidget('campaigns')"
          :class="{ active: dashboardStore.isWidgetActive('campaigns') }" class="btn-action">🧬 {{
            t('campaigns.homeButton').toUpperCase() }}</button>
        <button @click="dashboardStore.toggleWidget('logs')" :class="{ active: dashboardStore.isWidgetActive('logs') }"
          class="btn-action">🗄️ {{ t('home.logRequests').toUpperCase() }}</button>
        <button @click="dashboardStore.toggleWidget('sessions')"
          :class="{ active: dashboardStore.isWidgetActive('sessions') }" class="btn-action">📟 {{
            t('home.telnet').toUpperCase() }}</button>
        <button @click="dashboardStore.toggleWidget('dossiers')"
          :class="{ active: dashboardStore.isWidgetActive('dossiers') }" class="btn-action">📁 {{
            t('home.archive').toUpperCase() }}</button>
      </section>

      <transition-group name="widget-dynamic" tag="div" class="widgets-container">
        <div v-for="widget in dashboardState.activeWidgets" :key="widget" class="widget-item">
          <!-- TELEMETRIES -->
          <div v-if="widget === 'telemetries'" class="telemetry-wrapper">
            <TelemetryStats />
          </div>

          <!-- ATTACKS -->
          <div v-if="widget === 'attacks'" class="intel-ranking-container">
            <IntelRanking :title="$t('home.recentAttacks')" :items="recentAttacks" :loading="loadingAttacks"
              :error="errorAttacks" v-model:page="dashboardState.rankings.attackPage" :pageSize="10"
              :total="attackTotal" itemStyle="anomalies-ranking">
              <template #header-actions>
                <ProtocolSelector v-model="dashboardState.rankings.attackProtocol" :options="['http', 'https', 'ssh']"
                  theme="dark" />
                <button class="reset-btn-mini" @click="dashboardStore.resetAttacks"
                  :title="t('telemetry.reset_filters')">
                  <div class="reset-ascii">
                    <span></span>
                    <span></span>
                  </div>
                </button>
              </template>

              <template #filters>
                <div class="filters-row">
                  <!-- Time Range -->
                  <div class="filter-item">
                    <span class="filter-label">{{ t('telemetry.filter_label') }}: <span class="active-val">{{
                      dashboardState.rankings.attackTimeValue === null ? t('common.all').toUpperCase() :
                        (dashboardState.rankings.attackTimeValue + (dashboardState.rankings.attackTimeUnit === 'days' ?
                        'D' : 'H')) }}</span></span>
                    <div class="tabs-row log-threshold-tabs">
                      <button v-for="opt in dynamicTimeScaleHome" :key="opt.l" class="tab-btn"
                        :class="{ active: dashboardState.rankings.attackTimeValue === opt.v && (opt.v === null || dashboardState.rankings.attackTimeUnit === opt.u) }"
                        @click="dashboardState.rankings.attackTimeValue = opt.v; dashboardState.rankings.attackTimeUnit = opt.u">
                        {{ opt.v === null ? t('common.all').toUpperCase() : opt.l }}
                      </button>
                    </div>
                  </div>

                  <!-- Log Threshold Only -->
                  <div class="filter-item">
                    <span class="filter-label">{{ t('telemetry.filter_log_threshold_label') }}: <span
                        class="active-val">{{ dashboardState.rankings.attackMinLogs }}</span></span>
                    <div class="tabs-row log-threshold-tabs">
                      <button v-for="val in [3, 5, 10, 20, 40, 50]" :key="val" class="tab-btn"
                        :class="{ active: dashboardState.rankings.attackMinLogs === val }"
                        @click="dashboardState.rankings.attackMinLogs = val">
                        {{ val }}
                      </button>
                    </div>
                  </div>

                  <!-- Defcon Level (Multi-select) -->
                  <div class="filter-item">
                    <span class="filter-label">{{ t('telemetry.filter_defcon_label') }}: <span class="active-val">{{
                      (dashboardState.rankings.dangerLevels || []).length === 0 ? t('common.all').toUpperCase() :
                        [...(dashboardState.rankings.dangerLevels || [])].sort().join(',') }}</span></span>
                    <div class="tabs-row log-threshold-tabs">
                      <button v-for="lvl in [1, 2, 3, 4, 5]" :key="lvl" class="tab-btn"
                        :class="['defcon-btn-' + lvl, { active: (dashboardState.rankings.dangerLevels || []).includes(lvl) }]"
                        @click="dashboardStore.toggleDefconLevel(lvl)">
                        {{ lvl }}
                      </button>
                    </div>
                  </div>
                </div>
              </template>

              <template #title-meta>
                <div class="ranking-header-actions">
                  <button class="btn-ranking-action" @click="goToAttacks(false)">
                    {{ t('common.more_info') }}
                  </button>
                  <button class="sync-btn-header" @click="goToAttacks(true)" :title="t('common.syncFilters')">
                    🔍
                  </button>
                </div>
              </template>

              <template #item="{ item }">
                <!-- Origin Col -->
                <div class="item-col item-col-origin">
                  <div class="indicator-group">
                    <CountryFlag :countryCode="item.ipDetails?.ipinfo?.country"
                      :tooltip="item.ipDetails?.ipinfo ? `${item.ipDetails.ipinfo.country} - ${item.ipDetails.ipinfo.org || t('common.notAvailable')}` : t('common.notAvailable')" />
                    <DefconIndicator :level="item.dangerLevel" :dangerScore="item.dangerScore" mode="dot" />
                    <router-link :to="{
                      name: 'AttackDetail',
                      params: { ip: item.request.ip },
                      query: {
                        timeMode: 'ago',
                        agoValue: dashboardState.rankings.attackTimeValue,
                        agoUnit: dashboardState.rankings.attackTimeUnit,
                        minLogsForAttack: dashboardState.rankings.attackMinLogs
                      }
                    }" class="intel-det-btn" :data-noc-tooltip="t('common.detail')">
                      DET
                    </router-link>
                    <button class="sync-btn-mini" @click="syncSingleAttackToSearch(item)"
                      :data-noc-tooltip="t('common.syncFilters')">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Subject Col -->
                <div class="item-col item-col-subject">
                  <span @click="goToIpDetails(item.request.ip)" class="ip-link">{{ item.request.ip }}</span>
                </div>

                <!-- Forensics Col -->
                <div class="item-col item-col-forensics">
                  <div class="time-row" :data-noc-tooltip="$t('attacks.table.firstSeen')">
                    <span class="date-part">{{ formatDateOnly(item.firstSeen) }}</span>
                    <span class="time-part">{{ formatTimeOnly(item.firstSeen) }}</span>
                  </div>
                  <span class="duration-badge" v-if="item.lastSeen && item.lastSeen !== item.firstSeen">
                    ({{ computeDuration(item.firstSeen, item.lastSeen) }})
                  </span>
                </div>

                <!-- Metrics Col -->
                <div class="item-col item-col-metrics">
                  <div class="activity-badge">
                    <div class="badge-content" :class="{ 'high-interaction': (item.totaleLogs || 0) > 50 }"
                      :data-noc-tooltip="$t('attacks.table.totalLogs')">
                      <span class="badge-icon">📋</span>
                      <span class="badge-value">{{ item.totaleLogs || 0 }}</span>
                    </div>
                  </div>
                </div>
              </template>
            </IntelRanking>
          </div>

          <!-- LOGS -->
          <div v-if="widget === 'logs'" class="secondary-intel">
            <div class="widget">
              <IntelRanking :title="$t('home.recentLogs')" :items="recentLogs" :loading="loadingLogs" :error="errorLogs"
                v-model:page="dashboardState.rankings.logPage" :pageSize="10" :total="logTotal"
                itemStyle="logs-ranking">
                <template #header-actions>
                  <ProtocolSelector v-model="dashboardState.rankings.logProtocol" :options="['http', 'https', 'ssh']"
                    theme="dark" />
                  <button class="reset-btn-mini" @click="dashboardStore.resetLogs"
                    :title="t('telemetry.reset_filters')">
                    <div class="reset-ascii">
                      <span></span>
                      <span></span>
                    </div>
                  </button>
                </template>

                <template #title-meta>
                  <button class="btn-ranking-action" @click="goToLogs">
                    {{ t('common.more_info') }}
                  </button>
                </template>

                <template #item="{ item }">
                  <!-- Origin Col -->
                  <div class="item-col item-col-origin">
                    <div class="indicator-group"
                      :data-noc-tooltip="`URI: ${item.request?.url || 'N/A'}\nDATE: ${formatDate(item.timestamp)}`">
                      <CountryFlag :countryCode="item.ipDetailsId?.ipinfo?.country"
                        :tooltip="item.ipDetailsId?.ipinfo ? `${item.ipDetailsId.ipinfo.country} - ${item.ipDetailsId.ipinfo.org || t('common.notAvailable')}` : t('common.notAvailable')" />
                      <router-link v-if="item.id || item._id"
                        :to="{ name: 'ThreatLog', params: { id: String(item.id || item._id) } }" class="intel-det-btn"
                        :data-noc-tooltip="t('common.detail')">
                        DET
                      </router-link>
                    </div>
                  </div>

                  <!-- Subject Col -->
                  <div class="item-col item-col-subject">
                    <span @click="goToIpDetails(item.request.ip)" class="ip-link">{{ item.request.ip }}</span>
                  </div>

                  <!-- Forensics Col -->
                  <div class="item-col item-col-forensics">
                    <div class="time-row">
                      <span class="date-part">{{ formatDateOnly(item.timestamp) }}</span>
                      <span class="time-part">{{ formatTimeOnly(item.timestamp) }}</span>
                    </div>
                  </div>

                  <!-- Metrics Col -->
                  <div class="item-col item-col-metrics">
                    <div class="activity-badge">
                      <div class="badge-content" :data-noc-tooltip="$t('threatLog.method')">
                        <span class="badge-icon">🌐</span>
                        <span class="badge-value">{{ item.request.method }}</span>
                      </div>
                    </div>
                  </div>
                </template>
              </IntelRanking>
            </div>
          </div>

          <!-- SESSIONS -->
          <div v-if="widget === 'sessions'" class="intel-ranking-container">
            <IntelRanking :title="$t('home.recentSessions')" :items="recentSessions" :loading="loadingSessions"
              :error="errorSessions" v-model:page="dashboardState.rankings.sessionPage" :pageSize="10"
              :total="sessionTotal" itemStyle="sessions-ranking">
              <template #header-actions>
                <CowrieCategorySelector v-model="dashboardState.rankings.sessionCategory" size="mini" />
                <button class="reset-btn-mini" @click="dashboardStore.resetSessions"
                  :title="t('telemetry.reset_filters')">
                  <div class="reset-ascii">
                    <span></span>
                    <span></span>
                  </div>
                </button>
              </template>

              <template #title-meta>
                <button class="btn-ranking-action" @click="goToTelnet">
                  {{ t('common.more_info') }}
                </button>
              </template>

              <template #item="{ item }">
                <!-- Origin Col -->
                <div class="item-col item-col-origin">
                  <div class="indicator-group"
                    :data-noc-tooltip="`PROTOCOL: ${item.protocol || 'N/A'}\nDATE: ${formatDate(item.starttime)}`">
                    <CountryFlag :countryCode="item.ipDetailsId?.ipinfo?.country"
                      :tooltip="item.ipDetailsId?.ipinfo ? `${item.ipDetailsId.ipinfo.country} - ${item.ipDetailsId.ipinfo.org || t('common.notAvailable')}` : t('common.notAvailable')" />
                    <router-link v-if="item.session || item.id || item._id"
                      :to="{ name: 'CowrieAttackDetail', params: { id: String(item.session || item.id || item._id) } }"
                      class="intel-det-btn" :data-noc-tooltip="t('common.detail')">
                      DET
                    </router-link>
                  </div>
                </div>

                <!-- Subject Col -->
                <div class="item-col item-col-subject">
                  <span @click="goToIpDetails(item.src_ip)" class="ip-link">{{ item.src_ip }}</span>
                </div>

                <!-- Forensics Col -->
                <div class="item-col item-col-forensics">
                  <div class="time-row" :data-noc-tooltip="$t('attacks.table.firstSeen')">
                    <span class="date-part">{{ formatDateOnly(item.starttime) }}</span>
                    <span class="time-part">{{ formatTimeOnly(item.starttime) }}</span>
                  </div>
                  <span class="duration-badge" v-if="item.endtime || item.isAggregated">
                    ({{ formatAggregatedDurationHome(item) }})
                  </span>
                </div>

                <!-- Metrics Col -->
                <div class="item-col item-col-metrics">
                  <div class="activity-badge">
                    <!-- Aggregated Scanner occurrences -->
                    <div v-if="item.isAggregated" class="badge-content occurrence"
                      :data-noc-tooltip="$t('cowrie.sessions.table.occurrences')">
                      <span class="badge-icon">🔢</span>
                      <span class="badge-value">{{ item.occurrenceCount }}</span>
                    </div>
                    <!-- Standard interaction events -->
                    <div v-else class="badge-content" :class="{ 'high-interaction': (item.eventCount || 0) > 10 }"
                      :data-noc-tooltip="$t('sessionChart.activity')">
                      <span class="badge-icon">⚡</span>
                      <span class="badge-value">{{ item.eventCount || 0 }}</span>
                    </div>
                  </div>
                </div>
              </template>
            </IntelRanking>
          </div>

          <!-- DOSSIERS -->
          <div v-if="widget === 'dossiers'" class="intel-ranking-container">
            <IntelRanking v-if="authStore.isAuthenticated" :title="$t('home.recentDossiers')" :items="recentDossiers"
              :loading="loadingDossiers" :error="errorDossiers" :pageSize="5" :showRank="false"
              itemStyle="dossier-ranking">
              <template #title-meta>
                <div class="ranking-header-actions">
                  <button class="btn-ranking-action" @click="goToArchive">
                    {{ t('common.more_info') }}
                  </button>
                </div>
              </template>

              <template #item="{ item }">
                <!-- Origin Col -->
                <div class="item-col item-col-origin">
                  <div class="indicator-group" :data-noc-tooltip="`Status: ${item.status}\nID: ${item._id}`">
                    <span class="status-dot-mini" :class="item.status.toLowerCase()"></span>
                    <span class="badge-icon">📂</span>
                  </div>
                </div>

                <!-- Subject Col -->
                <div class="item-col item-col-subject">
                  <span class="subject-link" @click="router.push(`/dossiers/${item._id}`)">{{ item.title }}</span>
                </div>

                <!-- Forensics Col -->
                <div class="item-col item-col-forensics">
                  <div class="time-row">
                    <span class="date-part">{{ formatDateOnly(item.createdAt) }}</span>
                    <span class="time-part">{{ formatTimeOnly(item.createdAt) }}</span>
                  </div>
                </div>

                <!-- Metrics Col -->
                <div class="item-col item-col-metrics">
                  <div class="activity-badge">
                    <div class="badge-content" :data-noc-tooltip="t('common.sections')">
                      <span class="badge-icon">📑</span>
                      <span class="badge-value">{{ item.sections?.length || 0 }}</span>
                    </div>
                  </div>
                </div>
              </template>
            </IntelRanking>

            <!-- Restricted View (Anonymous) -->
            <div v-else class="glass-card">
              <div class="widget-header">
                <h3>{{ $t('home.recentDossiers').toUpperCase() }}</h3>
              </div>
              <RestrictedIntelligenceGate />
            </div>
          </div>

          <!-- CAMPAIGNS -->
          <div v-if="widget === 'campaigns'" class="intel-ranking-container">
            <IntelRanking :title="t('campaigns.discovery')" :items="recentCampaigns" :loading="loadingCampaigns"
              :error="errorCampaigns" v-model:page="dashboardState.rankings.campaignPage" :pageSize="10"
              :total="campaignTotal" itemStyle="campaigns-ranking">
              
               <template #header-actions>
                  <ProtocolSelector v-model="dashboardState.rankings.campaignProtocol" :options="['http', 'https', 'ssh']"
                    theme="dark" />
                  <button class="reset-btn-mini" @click="dashboardStore.resetCampaigns"
                   :title="t('telemetry.reset_filters')">
                  <div class="reset-ascii">
                    <span></span>
                    <span></span>
                  </div>
                </button>
               </template>

              <template #filters>
                <div class="filters-column-layout">
                  <div class="filters-row">
                    <!-- Time Range -->
                    <div class="filter-item">
                      <span class="filter-label">{{ t('telemetry.filter_label') }}: <span class="active-val">{{
                        dashboardState.rankings.campaignTimeValue === null ? t('common.all').toUpperCase() :
                          (dashboardState.rankings.campaignTimeValue + (dashboardState.rankings.campaignTimeUnit === 'days' ?
                          'D' : 'H')) }}</span></span>
                      <div class="tabs-row log-threshold-tabs">
                        <button v-for="opt in dynamicTimeScaleHome" :key="opt.l" class="tab-btn"
                          :class="{ active: dashboardState.rankings.campaignTimeValue === opt.v && (opt.v === null || dashboardState.rankings.campaignTimeUnit === opt.u) }"
                          @click="dashboardState.rankings.campaignTimeValue = opt.v; dashboardState.rankings.campaignTimeUnit = opt.u">
                          {{ opt.v === null ? t('common.all').toUpperCase() : opt.l }}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="filters-row dynamic-row-separator" v-if="campaignsStore.state.metadata.maxIpCount > 0 || campaignsStore.state.metadata.maxScore > 0">
                    <!-- Min IPs -->
                    <div class="filter-item" v-if="campaignsStore.state.metadata.maxIpCount > 0">
                      <span class="filter-label">{{ t('telemetry.filter_ip_threshold_label') }}: <span
                          class="active-val">{{ dashboardState.rankings.campaignMinIps }}</span></span>
                      <div class="tabs-row log-threshold-tabs">
                        <button v-for="val in dynamicIpScaleHome" :key="val" class="tab-btn"
                          :class="{ active: dashboardState.rankings.campaignMinIps === val }"
                          @click="dashboardState.rankings.campaignMinIps = (dashboardState.rankings.campaignMinIps === val ? 3 : val)">
                          {{ val }}
                        </button>
                      </div>
                    </div>

                    <!-- Min Score -->
                    <div class="filter-item" v-if="dynamicScoreScaleHome.length > 0 && campaignsStore.state.metadata.maxScore > 0">
                      <span class="filter-label">{{ t('telemetry.filter_score_label') }}: <span
                          class="active-val">{{ dashboardState.rankings.campaignMinScore }}</span></span>
                      <div class="tabs-row log-threshold-tabs">
                        <button v-for="val in dynamicScoreScaleHome" :key="val" class="tab-btn"
                          :class="{ active: dashboardState.rankings.campaignMinScore === val }"
                          @click="dashboardState.rankings.campaignMinScore = (dashboardState.rankings.campaignMinScore === val ? 0 : val)">
                          {{ val === 0 ? 'INFO' : val }}
                        </button>
                      </div>
                    </div>

                    <!-- Logs per IP -->
                    <div class="filter-item" v-if="dynamicLogsPerIpScaleHome.length > 0 && campaignsStore.state.metadata.maxLogsPerIp > 0">
                      <span class="filter-label">LOGS/IP: <span
                          class="active-val">{{ dashboardState.rankings.campaignMinLogsPerIp }}</span></span>
                      <div class="tabs-row log-threshold-tabs">
                        <button v-for="val in dynamicLogsPerIpScaleHome" :key="val" class="tab-btn"
                          :class="{ active: dashboardState.rankings.campaignMinLogsPerIp === val }"
                          @click="dashboardState.rankings.campaignMinLogsPerIp = (dashboardState.rankings.campaignMinLogsPerIp === val ? 1 : val)">
                          {{ val }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <template #title-meta>
                <div class="ranking-header-actions">
                  <button class="btn-ranking-action" @click="router.push('/campaigns')">
                    {{ t('common.more_info') }}
                  </button>
                </div>
              </template>

              <template #item="{ item }">
                <!-- Origin Col (using Pattern DNA as title) -->
                <div class="item-col item-col-origin">
                  <div class="indicator-group">
                    <span class="badge-icon" :title="'Avg Score: ' + item.averageScore?.toFixed(1)">🧬</span>
                    <router-link :to="{
                      name: 'CampaignDetail',
                      params: { hash: item.hash },
                      query: {
                        minLogsPerIp: dashboardState.rankings.campaignMinLogsPerIp,
                        minScore: dashboardState.rankings.campaignMinScore,
                        timeMode: 'ago',
                        agoValue: dashboardState.rankings.campaignTimeValue,
                        agoUnit: dashboardState.rankings.campaignTimeUnit,
                        protocol: dashboardState.rankings.campaignProtocol
                      }
                    }" class="intel-det-btn" :data-noc-tooltip="t('common.detail')">
                      DET
                    </router-link>
                  </div>
                </div>

                <!-- Subject Col -->
                <div class="item-col item-col-subject" :data-noc-tooltip="'PATTERN_DNA: ' + item.hash">
                  <span class="hash-link url-target">{{ item.sampleUrl || '/' }}</span>
                  <div class="campaign-tech-list">
                    <span v-for="tech in (item.attackPatterns || [])" :key="tech" class="tech-mini-tag">
                      {{ tech }}
                    </span>
                  </div>
                </div>

                <!-- Forensics Col -->
                <div class="item-col item-col-forensics">
                    <div v-if="item.correlationHubsCount > 0" class="mini-signal-indicator" 
                         :class="{ 'high-intensity': item.correlationHubsCount > 2 }"
                         :data-noc-tooltip="$t('campaigns.hubSignal', { count: item.correlationHubsCount })">
                      <span class="signal-icon">📡</span>
                      <span class="signal-val">{{ item.correlationHubsCount }}</span>
                    </div>
                    <div class="time-row" :data-noc-tooltip="$t('campaigns.firstSeen')">
                      <span class="date-part">{{ formatDateOnly(item.firstSeen) }}</span>
                      <span class="time-part">{{ formatTimeOnly(item.firstSeen) }}</span>
                    </div>
                  <span class="duration-badge" v-if="item.lastSeen && item.lastSeen !== item.firstSeen">
                    ({{ computeDuration(item.firstSeen, item.lastSeen) }})
                  </span>
                </div>

                <!-- Metrics Col -->
                <div class="item-col item-col-metrics">
                   <div class="activity-badge">
                    <div class="badge-content occurrence" :data-noc-tooltip="$t('campaigns.ipsInvolved', { count: item.ipCount })">
                      <span class="badge-icon">👤</span>
                      <span class="badge-value">{{ item.ipCount }}</span>
                    </div>
                    <div class="badge-content" :data-noc-tooltip="$t('campaigns.totalLogs')">
                      <span class="badge-icon">📋</span>
                      <span class="badge-value">{{ item.totaleLogs }}</span>
                    </div>
                  </div>
                </div>
              </template>
            </IntelRanking>
          </div>
        </div>
      </transition-group>

      <!-- Screensaver empty state -->
      <transition name="fade">
        <div v-if="dashboardState.activeWidgets.length === 0" class="screensaver-wrapper">
          <CyberScreensaver />
        </div>
      </transition>
    </section>

  </div>
</template>

<script setup>
// Import composable customizzati
import { useLogsFilter } from '../../composable/useLogsFilter';
import { useAttacksFilter } from '../../composable/useAttacksFilter';
import { useCowrieSessions } from '../../composable/useCowrieSessions';
import { useCampaignsDiscovery } from '../../composable/useCampaignsDiscovery';
import { useCampaignsStore } from '../../stores/campaigns';
import { generateSmartScale, generateScoreScale, generateTimeScale } from '../../utils/filterUtils';
import { useRouter } from 'vue-router'
import { computed, onMounted, watch, ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchDossiers } from '../../api';
import { useDossierStore } from '../../stores/dossier';
import { useAuthStore } from '../../stores/auth';
import dayjs from 'dayjs';
import CountryFlag from '../../components/CountryFlag.vue';
import BreakingNews from '../../components/BreakingNews.vue';
import GlobalHeader from '../../components/GlobalHeader.vue';
import ProtocolSelector from '../../components/common/ProtocolSelector.vue';
import DefconIndicator from '../../components/DefconIndicator.vue';
import TelemetryStats from '../../components/TelemetryStats.vue';
import RestrictedIntelligenceGate from '../../components/common/RestrictedIntelligenceGate.vue';
import CowrieCategorySelector from '../../components/common/CowrieCategorySelector.vue';
import IntelRanking from '../../components/common/IntelRanking.vue';
import CyberScreensaver from '../../components/CyberScreensaver.vue';
import { formatDateTime, formatDateOnly, formatTimeOnly, formatHumanDuration, formatFullDateTime } from '../../utils/dateUtils';

const { t } = useI18n();

import { useDashboardStore } from '../../stores/dashboard';
import { useViewSettingsStore } from '../../stores/viewSettings';
import { storeToRefs } from 'pinia';

import { useAttacksStore } from '../../stores/attacks';

const attacksStore = useAttacksStore();
const dashboardStore = useDashboardStore();
const viewStore = useViewSettingsStore();
const campaignsStore = useCampaignsStore();
const { state: dashboardState } = dashboardStore;
const { dashboardSkin: currentSkin } = storeToRefs(viewStore);

const showTicker = ref(true);

// Navigazione
const router = useRouter()
function goToAttacks(sync = false) {
  if (sync) {
    // Sincronizzazione filtri verso AttacksStore
    attacksStore.state.filters.protocol = dashboardState.rankings.attackProtocol;

    // Gestione Timeframe: Se ALL (null), impostiamo un valore molto alto per coprire tutto
    if (dashboardState.rankings.attackTimeValue === null) {
      attacksStore.state.filters.timeMode = 'ago';
      attacksStore.state.filters.agoValue = 10;
      attacksStore.state.filters.agoUnit = 'years';
    } else {
      attacksStore.state.filters.timeMode = 'ago';
      attacksStore.state.filters.agoValue = dashboardState.rankings.attackTimeValue;
      attacksStore.state.filters.agoUnit = dashboardState.rankings.attackTimeUnit || 'days';
    }

    attacksStore.state.filters.minLogs = dashboardState.rankings.attackMinLogs;
    attacksStore.state.filters.dangerLevels = [...(dashboardState.rankings.dangerLevels || [])];
    attacksStore.state.filters.ip = ''; // Reset IP se sincronizziamo i filtri globali
    attacksStore.state.pagination.page = 1;
  }

  router.push('/attacks')
}
function goToLogs() {
  router.push('/threatlogs')
}
function goToTelnet() {
  router.push('/telnet-sessions')
}

function goToArchive() {
  router.push('/dossiers')
}

function goToIpDetails(ip) {
  router.push(`/ip/${ip}`)
}

function syncSingleAttackToSearch(item) {
  // Sincronizzazione filtri verso AttacksStore
  attacksStore.state.filters.ip = item.request?.ip || '';
  attacksStore.state.filters.protocol = dashboardState.rankings.attackProtocol;

  // Gestione Timeframe per singolo attacco
  if (dashboardState.rankings.attackTimeValue === null) {
    attacksStore.state.filters.timeMode = 'ago';
    attacksStore.state.filters.agoValue = 10;
    attacksStore.state.filters.agoUnit = 'years';
  } else {
    attacksStore.state.filters.timeMode = 'ago';
    attacksStore.state.filters.agoValue = dashboardState.rankings.attackTimeValue;
    attacksStore.state.filters.agoUnit = dashboardState.rankings.attackTimeUnit || 'days';
  }

  attacksStore.state.filters.minLogs = dashboardState.rankings.attackMinLogs;
  attacksStore.state.filters.dangerLevels = [...(dashboardState.rankings.dangerLevels || [])];

  attacksStore.state.pagination.page = 1;
  router.push('/attacks');
}

// Funzioni per template
function formatDate(timestamp) {
  return formatFullDateTime(timestamp);
};

function computeDuration(start, end) {
  if (!start || !end) return '-';
  const s = dayjs(start);
  const e = dayjs(end);
  const diffSeconds = e.diff(s, 'second');
  return formatHumanDuration(diffSeconds, t);
};

const formatAggregatedDurationHome = (session) => {
  if (session.isAggregated && session.duration !== undefined) {
    return formatHumanDuration(session.duration, t);
  }
  return computeDuration(session.starttime, session.endtime);
};

// Anomalie - chiamata base: ora collegata direttamente allo store persistente tramite toRef
const {
  attacks,
  loading: loadingAttacks,
  error: errorAttacks,
  total: attackTotal,
  fetchData: fetchAttacks
} = useAttacksFilter(
  '',
  toRef(dashboardState.rankings, 'attackProtocol'),
  toRef(dashboardState.rankings, 'attackPage'),
  toRef(dashboardState.rankings, 'attackMinLogs'),
  'ago',
  toRef(dashboardState.rankings, 'attackTimeValue'),
  toRef(dashboardState.rankings, 'attackTimeUnit'),
  null, null, null, null, null, { firstSeen: -1 }, 10,
  toRef(dashboardState.rankings, 'dangerLevels')
)

const recentAttacks = computed(() => attacks.value)

const {
  logs,
  loading: loadingLogs,
  error: errorLogs,
  total: logTotal,
  fetchData: fetchLogs
} = useLogsFilter(
  '', '',
  toRef(dashboardState.rankings, 'logProtocol'),
  toRef(dashboardState.rankings, 'logPage'),
  { timestamp: -1 }, 10
)

const recentLogs = computed(() => logs.value)

const {
  sessions,
  loading: loadingSessions,
  error: errorSessions,
  total: sessionTotal,
  fetchData: fetchSessions
} = useCowrieSessions(
  toRef(dashboardState.rankings, 'sessionPage'),
  10, { starttime: -1 }, '',
  toRef(dashboardState.rankings, 'sessionCategory')
);

const recentSessions = computed(() => sessions.value)

// Campagne
const {
  campaigns,
  loading: loadingCampaigns,
  error: errorCampaigns,
  total: campaignTotal,
  fetchData: fetchCampaigns
} = useCampaignsDiscovery(
  toRef(dashboardState.rankings, 'campaignPage'),
  toRef(dashboardState.rankings, 'campaignMinIps'),
  toRef(dashboardState.rankings, 'campaignMinScore'),
  toRef(dashboardState.rankings, 'campaignProtocol'),
  'ago', // initialTimeMode
  toRef(dashboardState.rankings, 'campaignTimeValue'),
  toRef(dashboardState.rankings, 'campaignTimeUnit'),
  10,
  toRef(dashboardState.rankings, 'campaignMinLogsPerIp')
);

const recentCampaigns = computed(() => campaigns.value)

// Scale dinamiche Home basate sui metadati globali delle campagne
const dynamicIpScaleHome = computed(() => {
  const { minIpCount, maxIpCount } = campaignsStore.state.metadata;
  return generateSmartScale(minIpCount, maxIpCount, 6, dashboardState.rankings.campaignMinIps);
});

const dynamicScoreScaleHome = computed(() => {
  const { minScore, maxScore } = campaignsStore.state.metadata;
  return generateScoreScale(Math.floor(minScore), Math.ceil(maxScore), dashboardState.rankings.campaignMinScore);
});

const dynamicTimeScaleHome = computed(() => {
  const { minDate, maxDate, globalMinDate, globalMaxDate } = campaignsStore.state.metadata;
  return generateTimeScale(minDate, maxDate, globalMinDate, globalMaxDate);
});

const dynamicLogsPerIpScaleHome = computed(() => {
  const { minLogsPerIp, maxLogsPerIp } = campaignsStore.state.metadata;
  return generateSmartScale(minLogsPerIp, maxLogsPerIp, 6, dashboardState.rankings.campaignMinLogsPerIp);
});

// Dossier - ultimi 5
const recentDossiers = ref([]);
const loadingDossiers = ref(false);
const errorDossiers = ref(false);

const fetchRecentDossiers = async () => {
  if (!authStore.isAuthenticated) return;

  loadingDossiers.value = true;
  errorDossiers.value = false;
  try {
    const response = await fetchDossiers({ page: 1, pageSize: 5 });
    recentDossiers.value = response.items || [];
  } catch (error) {
    console.error('Error loading recent dossiers:', error);
    errorDossiers.value = true;
  } finally {
    loadingDossiers.value = false;
  }
};


import { useProfileStore } from '../../stores/profiles';

const profileStore = useProfileStore();
const dossierStore = useDossierStore();
const authStore = useAuthStore();



// Carica i dati solo una volta per la dashboard, ma ricarica se cambia il profilo
const loadAll = () => {
  fetchAttacks();
  fetchLogs();
  fetchSessions();
  fetchCampaigns();
  fetchRecentDossiers();
};

onMounted(loadAll);
watch(() => profileStore.activeProfileId, loadAll);
watch(() => dossierStore.lastSavedAt, fetchRecentDossiers);

// Sincronizzazione automatica dei filtri con ricaricamento dati
// Osserviamo l'intero oggetto rankings per reagire a qualsiasi cambio di filtro o pagina
watch(() => dashboardState.rankings, (newRankings, oldRankings) => {
  // Se è cambiata la pagina o un filtro degli attacchi, ricarichiamo gli attacchi
  fetchAttacks();
  // Idem per log e sessioni
  fetchLogs();
  fetchSessions();
  fetchCampaigns();
}, { deep: true });

</script>

<style scoped src="./Home.css"></style>
<style scoped>
@import "./HomeCyber.css";

/* Stunning Cyber-Red Reset Button with ASCII Lines */
.reset-btn-mini {
  background: transparent;
  border: 1px solid rgba(255, 51, 102, 0.4);
  color: #ff3366;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  margin-left: 12px;
  position: relative;
  clip-path: polygon(15% 0%, 100% 0, 100% 85%, 85% 100%, 0 100%, 0% 15%);
  padding: 0;
  overflow: hidden;
}

.global-reset {
  margin: 0 !important;
}

.reset-ascii {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: center;
  transition: all 0.3s ease;
}

.reset-ascii span {
  display: block;
  width: 12px;
  height: 2px;
  background: #ff3366;
  box-shadow: 0 0 5px rgba(255, 51, 102, 0.6);
  transition: all 0.3s ease;
}

/* Sfasamento orizzontale come richiesto */
.reset-ascii span:nth-child(1) {
  transform: translateX(-3px);
}

.reset-ascii span:nth-child(2) {
  transform: translateX(3px);
}

.status-dot-mini.archived {
  background: #64748b;
}

.item-col-subject {
  flex: 1 !important;
  min-width: 0;
  text-align: left;
}

/* Campaign Specific Multi-line Layout */
.campaigns-ranking {
  --col-subject-direction: column;
  --col-subject-align: flex-start;
  --col-subject-gap: 8px;
  --ranking-item-min-height: 72px; /* Diamo più spazio alle campagne */
}

.url-target {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.8rem;
  color: #fff;
  text-transform: none;
  letter-spacing: -0.2px;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
  text-shadow: 0 0 10px rgba(255,255,255,0.1);
  line-height: 1.2;
}

.campaign-tech-list {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  padding-left: 2px;
  margin-top: 2px;
}

@media (max-width: 768px) {
  .url-target {
    max-width: 140px; /* Ridotto leggermente per far spazio alle icone */
    font-size: 0.75rem;
  }
  
  .item-col-subject {
    flex: 1 1 auto !important; /* Permette alla colonna di espandersi */
  }

  .campaigns-ranking {
    --col-subject-gap: 4px;
  }
  
  /* Nascondiamo la colonna Forensics (date) su mobile per le campagne 
     per dare spazio vitale all'URI e ai Tags tecnici */
  .campaigns-ranking :deep(.item-col-forensics) {
    display: none !important;
  }

  /* Ridimensioniamo l'origine per guadagnare spazio */
  .campaigns-ranking :deep(.item-col-origin) {
    flex: 0 0 90px !important;
  }

  .tech-mini-tag {
    font-size: 0.5rem;
    padding: 0px 4px;
    line-height: 1.4;
  }
}

.tech-mini-tag {
  font-size: 0.55rem;
  padding: 1px 6px;
  background: rgba(var(--theme-primary-rgb, 0, 255, 65), 0.05);
  border: 1px solid rgba(var(--theme-primary-rgb, 0, 255, 65), 0.3);
  color: var(--theme-primary);
  border-radius: 10px;
  text-transform: uppercase;
  font-weight: 800;
  letter-spacing: 0.4px;
  opacity: 0.8;
}

.subject-link {
  color: var(--theme-primary, #5FA5FF);
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
  width: 100%;
}

.subject-link:hover {
  text-decoration: underline;
  filter: brightness(1.2);
}

.skin-cyber .subject-link {
  color: var(--neon-cyan);
  text-shadow: 0 0 5px rgba(0, 255, 255, 0.3);
}

.reset-btn-mini:hover {
  background: rgba(255, 51, 102, 0.1);
  border-color: #ff3366;
  box-shadow: 0 0 15px rgba(255, 51, 102, 0.4);
}

.reset-btn-mini:hover .reset-ascii {
  transform: rotate(180deg);
}

/* Al hover le linee si allineano e brillano (effetto ricalibrazione) */
.reset-btn-mini:hover .reset-ascii span {
  transform: translateX(0);
  background: #fff;
  box-shadow: 0 0 10px #fff;
  width: 14px;
}

.reset-btn-mini:active {
  transform: scale(0.8);
  background: #ff3366;
}

/* Skin Cyber specific */
.skin-cyber .reset-btn-mini {
  border-style: double;
  /* Doppia linea per un tocco più hardware */
  border-width: 1px;
}

/* Skin Classic override */
.skin-classic .reset-btn-mini {
  clip-path: none;
  border-radius: 4px;
  border-color: #c0392b;
}

.skin-classic .reset-ascii span {
  background: #c0392b;
  box-shadow: none;
}

.screensaver-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: stretch;
  flex: 1;
  min-height: 450px;
  padding: 0;
  margin: 0;
}

/* Scanning Line for Dossiers */
.full-width-widget {
  position: relative;
  overflow: hidden;
}

.dossier-ranking .scanning-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(to right, transparent, #6366f1, transparent);
  box-shadow: 0 0 15px #6366f1;
  animation: scan-dossier 7s linear infinite;
  z-index: 5;
  opacity: 0.25;
  pointer-events: none;
}

@keyframes scan-dossier {
  0% {
    top: 0;
  }

  100% {
    top: 100%;
  }
}

/* Sync Button Styles */
.sync-btn-mini {
  border: 1px solid rgba(255, 51, 102, 0.4);
  background: rgba(255, 51, 102, 0.05);
  color: var(--neon-pink, #ff3366);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 4px;
  padding: 0;
  flex-shrink: 0;
}

.sync-btn-mini:hover {
  background: rgba(255, 51, 102, 0.1);
  border-color: var(--theme-primary, #ff3366);
  box-shadow: 0 0 10px rgba(255, 51, 102, 0.3);
}

.intel-det-btn {
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Header Sync Styles */
.ranking-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
}

/* Rimuoviamo il margine superiore dal pulsante originale quando è nel container di sync */
.ranking-header-actions :deep(.btn-ranking-action) {
  margin-top: 0 !important;
  height: 36px;
  display: flex;
  align-items: center;
}

.sync-btn-header {
  background: rgba(255, 51, 102, 0.08);
  border: 1px solid rgba(255, 51, 102, 0.3);
  color: var(--theme-primary, #ff3366);
  padding: 0;
  width: 36px;
  height: 36px;
  /* Uguale all'altezza del pulsante accanto */
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  align-self: center;
}

.sync-btn-header:hover {
  background: rgba(255, 51, 102, 0.15);
  border-color: var(--theme-primary, #ff3366);
  box-shadow: 0 0 15px rgba(255, 51, 102, 0.4);
  transform: translateY(-1px);
}

.sync-btn-header:active {
  transform: scale(0.9);
  background: var(--theme-primary, #ff3366);
  color: #fff;
}

.skin-cyber .ranking-header-actions :deep(.btn-ranking-action) {
  height: 38px;
}

.skin-cyber .sync-btn-header {
  background: transparent !important;
  border-radius: 0 !important;
  border: 1px solid var(--neon-pink) !important;
  color: var(--neon-pink) !important;
  height: 38px;
  width: 38px;
}
</style>
