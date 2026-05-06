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

        <!-- Maintenance & Pruning Hub -->
        <div class="maintenance-hub glass-morphism">
            <div class="maintenance-header">
                <div class="maintenance-title">
                    <span class="m-icon">🧹</span>
                    <h3>{{ t('maintenance.title') }}</h3>
                </div>
                <p class="maintenance-desc">{{ t('maintenance.pruning.desc') }}</p>
                
                <!-- Log Statistics Dashboard -->
                <div class="maintenance-stats">
                    <div class="stat-pill">
                        <span class="s-label">{{ t('maintenance.pruning.stats.active') }}</span>
                        <span class="s-value">{{ logStats.active.toLocaleString() }}</span>
                    </div>
                    <div class="stat-pill">
                        <span class="s-label">{{ t('maintenance.pruning.stats.archived') }}</span>
                        <span class="s-value">{{ logStats.archived.toLocaleString() }}</span>
                    </div>
                    <div class="stat-pill">
                        <span class="s-label">{{ t('maintenance.pruning.stats.trash') }}</span>
                        <span class="s-value">{{ logStats.deleted.toLocaleString() }}</span>
                    </div>
                    <div class="stat-pill warning" v-if="logStats.legacy > 0">
                        <span class="s-label">{{ t('maintenance.pruning.stats.legacy') }}</span>
                        <span class="s-value">{{ logStats.legacy.toLocaleString() }}</span>
                    </div>
                </div>
            </div>

            <div class="maintenance-controls" :class="{ 'emergency-mode': pruningParams.resetAllToActive }">
                <div class="emergency-toggle">
                    <label class="switch-container">
                        <input type="checkbox" v-model="pruningParams.resetAllToActive">
                        <span class="switch-slider"></span>
                    </label>
                    <div class="emergency-text">
                        <span class="e-label">{{ t('maintenance.pruning.emergencyReset') }}</span>
                        <span class="e-help">{{ t('maintenance.pruning.emergencyResetHelp') }}</span>
                    </div>
                </div>

                <template v-if="!pruningParams.resetAllToActive">
                    <div class="param-input">
                        <label>{{ t('maintenance.pruning.archiveDays') }}</label>
                        <input type="number" v-model="pruningParams.archiveDays" min="1" max="365" />
                        <span class="unit">DAYS</span>
                    </div>
                    <div class="param-input">
                        <label>{{ t('maintenance.pruning.retentionDays') }}</label>
                        <input type="number" v-model="pruningParams.retentionDays" min="1" max="365" />
                        <span class="unit">DAYS</span>
                    </div>
                    <div class="param-input">
                        <label>{{ t('maintenance.pruning.deletionDays') }}</label>
                        <input type="number" v-model="pruningParams.deletionDays" min="1" max="1000" />
                        <span class="unit">DAYS</span>
                    </div>
                </template>
                
                <button class="btn-maintenance-run" :class="{ 'btn-emergency': pruningParams.resetAllToActive }" @click="handleRunPruning">
                    <span class="btn-glow"></span>
                    {{ t('maintenance.pruning.runCleanup').toUpperCase() }}
                </button>
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
                @trigger-rag-reindex="handleRagReindex"
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

        <!-- Tactical Confirmation Modal -->
        <TacticalModal 
            :show="showConfirmModal"
            :title="confirmModalConfig.title"
            :message="confirmModalConfig.message"
            :is-danger="confirmModalConfig.isDanger"
            @confirm="executePendingAction"
            @cancel="showConfirmModal = false"
        />
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
import { ref, onMounted, watch, computed } from 'vue';
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
import TacticalModal from '../../components/TacticalModal.vue';
import { fetchSearch } from '../../api';

const { t } = useI18n();
const router = useRouter();
const profileStore = useProfileStore();
const authStore = useAuthStore();
const viewStore = useViewSettingsStore();
const { dashboardSkin } = storeToRefs(viewStore);

// Stato Modale di Conferma
const showConfirmModal = ref(false);
const confirmModalConfig = ref({
    title: '',
    message: '',
    isDanger: false
});
let pendingAction: (() => Promise<void>) | null = null;

// Composable per la gestione delle configurazioni e dei job
const {
    filteredConfigs,
    loading,
    saving,
    error,
    searchQuery,
    loadConfigs,
    upsertConfig,
    removeConfig
} = useConfig();

const jobStore = useJobStore();
const { activeJobs, jobs } = storeToRefs(jobStore);

// Caricamento stati
const isReanalyzing = ref(false);
const successMessage = ref('');

// Parametri Pruning (Default)
const pruningParams = ref({
    archiveDays: 90,
    retentionDays: 30,
    deletionDays: 180,
    resetAllToActive: false
});

const logStats = ref({
    active: 0,
    archived: 0,
    deleted: 0,
    legacy: 0
});

async function fetchLogStats() {
    try {
        const [activeRes, archivedRes, deletedRes] = await Promise.all([
            fetchSearch({ page: 1, pageSize: 1, filters: { status: 'active' }, sortFields: null }),
            fetchSearch({ page: 1, pageSize: 1, filters: { status: 'archived' }, sortFields: null }),
            fetchSearch({ page: 1, pageSize: 1, filters: { status: 'deleted' }, sortFields: null })
        ]);

        logStats.value = {
            active: activeRes.total || 0,
            archived: archivedRes.total || 0,
            deleted: deletedRes.total || 0,
            legacy: 0
        };
    } catch (err) {
        console.error('[ConfigPage] Failed to fetch log stats via search API:', err);
    }
}

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
    confirmModalConfig.value = {
        title: 'RIANALISI COMPLETA',
        message: 'Questa operazione scansionerà tutti i log HTTP e SSH. Potrebbe richiedere tempo.',
        isDanger: false
    };
    
    pendingAction = async () => {
        try {
            await jobStore.runJob('reanalyze', { batchSize: 200 });
            showSuccess(t('config.reanalyzeStarted') || 'Rianalisi avviata in background');
        } catch (err) {
            console.error('[ConfigPage] Failed to start reanalysis:', err);
        }
    };
    
    showConfirmModal.value = true;
}

async function handleRagReindex() {
    confirmModalConfig.value = {
        title: 'RE-INDICIZZAZIONE RAG',
        message: 'Aggiornamento memoria vettoriale Qdrant. I log non indicizzati verranno processati.',
        isDanger: false
    };
    
    pendingAction = async () => {
        try {
            await jobStore.runJob('rag_reindex', { batchSize: 50 });
            showSuccess(t('ops.activeMissions') || 'Re-indicizzazione RAG avviata');
        } catch (err) {
            console.error('[ConfigPage] Failed to start RAG reindex:', err);
        }
    };
    
    showConfirmModal.value = true;
}

async function handleRunPruning() {
    confirmModalConfig.value = {
        title: pruningParams.value.resetAllToActive ? 'RESET EMERGENZA' : t('maintenance.pruning.title'),
        message: t('maintenance.pruning.confirm'),
        isDanger: pruningParams.value.resetAllToActive
    };
    
    pendingAction = async () => {
        try {
            await jobStore.runJob('pruning', pruningParams.value);
            showSuccess(t('ops.activeMissions') || 'Operazione database avviata');
        } catch (err) {
            console.error('[ConfigPage] Failed to start pruning:', err);
        }
    };
    
    showConfirmModal.value = true;
}

async function executePendingAction() {
    showConfirmModal.value = false;
    if (pendingAction) {
        await pendingAction();
        pendingAction = null;
        // Refresh stats after a short delay to allow background job to start/update
        setTimeout(fetchLogStats, 1000);
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
    fetchLogStats();
});
watch(() => profileStore.activeProfileId, () => {
    loadConfigs();
    jobStore.loadRecentJobs();
    fetchLogStats();
});
</script>

<style scoped src="./ConfigPage.css"></style>
