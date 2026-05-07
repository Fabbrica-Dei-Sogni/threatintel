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


            <div class="maintenance-advanced">
                <div class="monitor-separator"></div>
                <div class="commands-grid">
                    <!-- Pruning Toggle Button -->
                    <div class="cmd-wrapper" :class="{ 'is-active': showPruningControls }">
                        <button class="cmd-btn" @click="showPruningControls = !showPruningControls">
                            <span class="cmd-icon">🗄️</span>
                            <div class="cmd-text">
                                <span class="cmd-name">ARCHIVIO & PRUNING LOG</span>
                                <span class="cmd-desc">Gestione ritenzione e pulizia dati</span>
                            </div>
                        </button>
                    </div>

                    <!-- Reanalyze Command -->
                    <div class="cmd-wrapper" :class="{ 'is-confirming': confirmingReanalyze }">
                        <button class="cmd-btn warning" @click="handleReanalyzeClick" :disabled="isAnyReanalyzeRunning">
                            <span class="cmd-icon">{{ confirmingReanalyze ? '❓' : '🔄' }}</span>
                            <div class="cmd-text">
                                <span class="cmd-name">{{ confirmingReanalyze ? t('ops.confirmAction') : t('ops.commands.reanalyzeName') }}</span>
                                <span class="cmd-desc">{{ t('ops.commands.reanalyzeDesc') }}</span>
                            </div>
                        </button>
                        <button v-if="confirmingReanalyze" class="cancel-cmd" @click="confirmingReanalyze = false">✕</button>
                    </div>

                    <!-- RAG Reindex Command -->
                    <div class="cmd-wrapper" :class="{ 'is-confirming': confirmingRagReindex }">
                        <button class="cmd-btn" @click="handleRagClick" :disabled="isRagReindexRunning">
                            <span class="cmd-icon">{{ confirmingRagReindex ? '❓' : '🧠' }}</span>
                            <div class="cmd-text">
                                <span class="cmd-name">{{ confirmingRagReindex ? t('ops.confirmAction') : t('ops.commands.ragReindexName') }}</span>
                                <span class="cmd-desc">{{ t('ops.commands.ragReindexDesc') }}</span>
                            </div>
                        </button>
                        <button v-if="confirmingRagReindex" class="cancel-cmd" @click="confirmingRagReindex = false">✕</button>
                    </div>

                    <!-- Tactical Engine Tuning Toggle -->
                    <div class="cmd-wrapper" :class="{ 'is-active': showTacticalTuning }">
                        <button class="cmd-btn" @click="showTacticalTuning = !showTacticalTuning">
                            <span class="cmd-icon">📡</span>
                            <div class="cmd-text">
                                <span class="cmd-name">TACTICAL ENGINE TUNING</span>
                                <span class="cmd-desc">Calibrazione parametri e pesi TTP</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Expandable Pruning Console -->
            <transition name="expand">
                <div class="maintenance-controls" v-if="showPruningControls" :class="{ 'emergency-mode': pruningParams.resetAllToActive }">
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
            </transition>

            <!-- Expandable Tactical Engine Hub -->
            <transition name="expand">
                <TacticalEngineHub 
                    v-if="showTacticalTuning"
                    :configs="filteredConfigs"
                    :loading="loading"
                    :saving="saving"
                    :error="error"
                    :status="engineStatus"
                    v-model:search-query="searchQuery"
                    @save="handleSave"
                    @retry="loadConfigs"
                />
            </transition>
        </div>

        <!-- System Operations Hub (Permanent) -->
        <div class="job-monitor-section">
            <JobMonitor 
                :active-jobs="activeJobs" 
                :history="jobs"
                @cancel="jobStore.cancelJob" 
                @purge="handlePurge"
            />
        </div>

        <!-- Content Area (Empty if Tuning is open, otherwise can show other things or be removed) -->
        <div class="config-content-scroll scrollable-body" v-if="!showTacticalTuning">
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
import { useDashboardStore } from '../../stores/dashboard';
import { storeToRefs } from 'pinia';
import ConfigEditor from '../../components/ConfigEditor.vue';
import TacticalEngineHub from '../../components/forensic/TacticalEngineHub.vue';
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

const showPruningControls = ref(false);
const showTacticalTuning = ref(false);
const confirmingReanalyze = ref(false);
const confirmingRagReindex = ref(false);

const dashboardStore = useDashboardStore();

const engineStatus = computed(() => {
    // Se lo store dice che stiamo sincronizzando (via Socket), diamo priorità a quello
    if (dashboardStore.state.engineStatus === 'SYNCING') return 'SYNCING';
    
    if (saving.value) return 'TUNING';
    if (loading.value) return 'INITIALIZING';
    if (isAnyReanalyzeRunning.value || isRagReindexRunning.value) return 'SYNCING';
    return dashboardStore.state.engineStatus || 'OPTIMIZED';
});

const isAnyReanalyzeRunning = computed(() => {
    return Object.values(activeJobs.value).some(job => 
        (job.type === 'threat_reanalyze' || job.type === 'ssh_reanalyze') && 
        (job.status === 'running' || job.status === 'pending')
    );
});

const isRagReindexRunning = computed(() => {
    return Object.values(activeJobs.value).some(job => 
        job.type === 'rag_reindex' && 
        (job.status === 'running' || job.status === 'pending')
    );
});

async function handleReanalyzeClick() {
    if (confirmingReanalyze.value) {
        await handleReanalyze();
        confirmingReanalyze.value = false;
    } else {
        confirmingReanalyze.value = true;
        setTimeout(() => { confirmingReanalyze.value = false; }, 5000);
    }
}

async function handleRagClick() {
    if (confirmingRagReindex.value) {
        await handleRagReindex();
        confirmingRagReindex.value = false;
    } else {
        confirmingRagReindex.value = true;
        setTimeout(() => { confirmingRagReindex.value = false; }, 5000);
    }
}

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

watch(() => dashboardStore.state.lastSystemUpdate, () => {
    fetchLogStats();
});
watch(() => profileStore.activeProfileId, () => {
    loadConfigs();
    jobStore.loadRecentJobs();
    fetchLogStats();
});
</script>

<style scoped src="./ConfigPage.css"></style>

<style scoped>
/* Decoupled Command Grid Styles (Imported from JobMonitor) */
.commands-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
    gap: 20px;
    margin-top: 15px;
}

.cmd-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.cmd-btn {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 16px 24px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    cursor: pointer;
    text-align: left;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.cmd-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-2px);
}

.cmd-btn.warning:hover:not(:disabled) {
    border-color: rgba(245, 158, 11, 0.4);
    background: rgba(245, 158, 11, 0.05);
}

.cmd-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    filter: grayscale(1);
}

.cmd-icon {
    font-size: 1.4rem;
    min-width: 30px;
    display: flex;
    justify-content: center;
}

.cmd-text {
    display: flex;
    flex-direction: column;
}

.cmd-name {
    font-weight: 800;
    font-size: 0.75rem;
    color: #fff;
    letter-spacing: 1px;
    text-transform: uppercase;
}

.cmd-desc {
    font-size: 0.6rem;
    color: #64748b;
    margin-top: 2px;
}

.cmd-wrapper.is-confirming .cmd-btn,
.cmd-wrapper.is-active .cmd-btn {
    background: rgba(99, 102, 241, 0.1);
    border-color: #6366f1;
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.2);
}

.cmd-wrapper.is-confirming .cmd-btn {
    background: rgba(245, 158, 11, 0.1);
    border-color: #f59e0b;
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.2);
}

.cancel-cmd {
    position: absolute;
    right: -8px;
    top: -8px;
    width: 22px;
    height: 22px;
    background: #1e293b;
    border: 2px solid #0f172a;
    border-radius: 50%;
    color: #94a3b8;
    font-size: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 5;
}

.cancel-cmd:hover {
    background: #ef4444;
    color: #fff;
}

.maintenance-advanced {
    margin-top: 25px;
}

.monitor-separator {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    margin: 10px 0 25px 0;
}

/* Expand Transition */
.expand-enter-active, .expand-leave-active {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    max-height: 500px;
    overflow: hidden;
    opacity: 1;
}

.expand-enter-from, .expand-leave-to {
    max-height: 0;
    opacity: 0;
    transform: translateY(-10px);
    margin-top: 0;
}
</style>
