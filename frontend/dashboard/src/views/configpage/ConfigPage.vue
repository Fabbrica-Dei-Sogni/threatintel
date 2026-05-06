<template>
    <div class="config-page-view" :class="'skin-' + dashboardSkin" v-if="authStore.isAdmin">
        <!-- Dashboard Header -->
        <GlobalHeader context="config-page">
            <template #actions>
                <button class="back-accent-btn" @click="goBack">
                    <span class="btn-icon-back">←</span>
                </button>
            </template>
            <template #title>
                <div class="hub-title-group">
                    <h1 class="hub-page-title">{{ t('config.title').toUpperCase() }}</h1>
                    <span class="system-status-indicator">● ALGORITHM ENGINE ACTIVE</span>
                </div>
            </template>
        </GlobalHeader>

        <!-- Tactical Toolbar (Search Only) -->
        <div class="forensic-toolbar glass-morphism">
            <div class="search-input-tactical">
                <span class="search-indicator">🔎</span>
                <input type="text" v-model="searchQuery" :placeholder="t('config.searchPlaceholder')" />
                <button v-if="searchQuery" class="clear-input" @click="searchQuery = ''">✕</button>
            </div>
        </div>

        <!-- System Operations Hub (Permanent) -->
        <div class="job-monitor-section">
            <JobMonitor 
                :active-jobs="activeJobs" 
                :history="jobs"
                @cancel="jobStore.cancelJob" 
                @purge="handlePurge"
                @trigger-reanalyze="handleReanalyze"
            />
        </div>
        <!-- Content Area -->
        <div class="config-content-scroll scrollable-body">
            <!-- Loading State -->
            <div v-if="loading" class="loading-hud">
                <div class="pulse-ring"></div>
                <div class="hud-text">{{ t('common.loading').toUpperCase() }}...</div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="error-hud card-glass">
                <span class="error-icon">⚠️</span>
                <p class="error-text">{{ error }}</p>
                <button class="btn btn-hud-action" @click="loadConfigs">{{ t('config.retry').toUpperCase() }}</button>
            </div>

            <!-- Empty State -->
            <div v-else-if="filteredConfigs.length === 0" class="empty-hud card-glass">
                <span class="empty-icon">📭</span>
                <p>{{ searchQuery ? t('config.noSearchResults') : t('config.noConfigs') }}</p>
            </div>

            <!-- Config List Grid -->
            <div v-else class="algorithm-grid">
                <ConfigEditor v-for="config in filteredConfigs" :key="config.key" :config-key="config.key"
                    :model-value="config.value" :saving="saving" @save="handleSave" @delete="handleDelete" />
            </div>
        </div>

        <!-- Tactical Reanalyze Progress Modal -->
        <div v-if="isReanalyzing" class="reanalyze-overlay glass-morphism">
            <div class="radar-container">
                <div class="radar-circle"></div>
                <div class="radar-sweep"></div>
                <div class="radar-content">
                    <span class="radar-label">ENGINE RE-SCAN</span>
                    <span class="radar-sub">SYNCING ALGORITHMS...</span>
                </div>
            </div>
            <div class="scanning-dots">
                <span v-for="i in 3" :key="i" class="dot">.</span>
            </div>
        </div>

        <!-- Success Toast -->
        <Transition name="toast">
            <div v-if="successMessage" class="toast toast-success">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                {{ successMessage }}
            </div>
        </Transition>
    </div>
    <div v-else class="config-page-view forbidden-view">
        <div class="error-hud card-glass">
            <span class="error-icon">🚫</span>
            <p class="error-text">ACCESSO NEGATO: PERMESSI INSUFFICIENTI</p>
            <button class="btn btn-hud-action" @click="router.push('/')">TORNA AL CRUSCOTTO</button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useConfig } from '../../composable/useConfig';
import { useJobStore } from '../../stores/jobs';
import { useProfileStore } from '../../stores/profiles';
import { useAuthStore } from '../../stores/auth';
import { useViewSettingsStore } from '../../stores/viewSettings';
import { storeToRefs } from 'pinia';
import ConfigEditor from '../../components/ConfigEditor.vue';
import JobMonitor from '../../components/forensic/JobMonitor.vue';
import GlobalHeader from '../../components/GlobalHeader.vue';

const { t } = useI18n();
const router = useRouter();
const profileStore = useProfileStore();
const authStore = useAuthStore();
const viewStore = useViewSettingsStore();
const { dashboardSkin } = storeToRefs(viewStore);

// Composable per la gestione delle configurazioni e dei job
const {
    filteredConfigs,
    loading,
    saving,
    error,
    searchQuery,
    loadConfigs,
    upsertConfig,
    removeConfig,
    reanalyzeAll
} = useConfig();

const jobStore = useJobStore();
const { activeJobs, jobs } = storeToRefs(jobStore);

// Caricamento stati
const isReanalyzing = ref(false);
const successMessage = ref('');

// Navigation
function goBack() {
    router.push('/settings');
}

// CRUD handlers
async function handleSave(key: string, value: string) {
    const success = await upsertConfig(key, value);
    if (success) {
        showSuccess(t('config.configSaved'));
    }
}

async function handleDelete(key: string) {
    const success = await removeConfig(key);
    if (success) {
        showSuccess(t('config.configDeleted'));
    }
}

async function handleReanalyze() {
    console.log('[ConfigPage] Reanalyze button clicked');

    try {
        console.log('[ConfigPage] Starting reanalysis...');
        const result = await reanalyzeAll() as any;
        console.log('[ConfigPage] Reanalyze response:', result);
        
        if (result && result.jobs) {
            const jobIds = [result.jobs.http.jobId, result.jobs.ssh.jobId];
            console.log('[ConfigPage] Monitoring jobs:', jobIds);
            jobStore.monitorJobs(jobIds);
            showSuccess(t('config.reanalyzeStarted') || 'Rianalisi avviata in background');
        } else {
            console.warn('[ConfigPage] No jobs found in response');
        }
    } catch (err) {
        console.error('[ConfigPage] Failed to start reanalysis:', err);
    }
}

async function handlePurge(jobId: string) {
    await jobStore.deleteJob(jobId);
}

function showSuccess(message: string) {
    successMessage.value = message;
    setTimeout(() => {
        successMessage.value = '';
    }, 3000);
}

// Carica al mount e quando cambia profilo
onMounted(() => {
    loadConfigs();
    jobStore.loadRecentJobs();
});
watch(() => profileStore.activeProfileId, () => {
    loadConfigs();
    jobStore.loadRecentJobs();
});
</script>

<style scoped src="./ConfigPage.css"></style>
