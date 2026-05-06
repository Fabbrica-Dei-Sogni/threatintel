<template>
    <div class="job-monitor-container card-glass">
        <div class="monitor-header">
            <div class="header-title">
                <span class="header-icon">🛰️</span>
                <h3>{{ t('ops.hubTitle') }}</h3>
            </div>
            <div class="header-status" v-if="Object.keys(activeJobs).length > 0">
                <span class="pulse-dot"></span>
                {{ t('ops.activeMissions') }}
            </div>
        </div>

        <!-- Available Commands Section -->
        <div class="commands-section">
            <h4 class="section-label">{{ t('ops.availableCommands') }}</h4>
            <div class="commands-grid">
                <!-- Reanalyze Command with Inline Confirmation -->
                <div class="cmd-wrapper" :class="{ 'is-confirming': confirmingReanalyze }">
                    <button 
                        class="cmd-btn warning" 
                        @click="handleTriggerClick"
                        :disabled="isAnyReanalyzeRunning"
                    >
                        <span class="cmd-icon">{{ confirmingReanalyze ? '❓' : '🔄' }}</span>
                        <div class="cmd-text">
                            <span class="cmd-name">
                                {{ confirmingReanalyze ? t('ops.confirmAction') : t('ops.commands.reanalyzeName') }}
                            </span>
                            <span class="cmd-desc">{{ t('ops.commands.reanalyzeDesc') }}</span>
                        </div>
                    </button>
                    <button v-if="confirmingReanalyze" class="cancel-cmd" @click="confirmingReanalyze = false">✕</button>
                </div>
                


                <!-- RAG Reindex Command -->
                <div class="cmd-wrapper" :class="{ 'is-confirming': confirmingRagReindex }">
                    <button 
                        class="cmd-btn" 
                        @click="handleRagClick"
                        :disabled="isRagReindexRunning"
                    >
                        <span class="cmd-icon">{{ confirmingRagReindex ? '❓' : '🧠' }}</span>
                        <div class="cmd-text">
                            <span class="cmd-name">
                                {{ confirmingRagReindex ? t('ops.confirmAction') : t('ops.commands.ragReindexName') }}
                            </span>
                            <span class="cmd-desc">{{ t('ops.commands.ragReindexDesc') }}</span>
                        </div>
                    </button>
                    <button v-if="confirmingRagReindex" class="cancel-cmd" @click="confirmingRagReindex = false">✕</button>
                </div>
            </div>
        </div>

        <!-- Active Operations Section -->
        <div class="active-section">
            <h4 class="section-label">{{ t('ops.activeOps') }}</h4>
            <div v-if="Object.keys(activeJobs).length === 0" class="no-jobs-msg">
                {{ t('ops.noActiveOps') }}
            </div>
            <div v-else class="jobs-list">
                <div v-for="(job, id) in activeJobs" :key="id" class="job-item">
                    <div class="job-info">
                        <span class="job-type">{{ job.type.toUpperCase().replace('_', ' ') }}</span>
                        <span class="job-status" :class="job.status">{{ t(`ops.status.${job.status}`).toUpperCase() }}</span>
                    </div>
                    
                    <div class="progress-container">
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" :style="{ width: job.progress + '%' }"></div>
                        </div>
                        <span class="progress-text">{{ job.progress }}%</span>
                    </div>

                    <div class="job-metadata">
                        <span>PROCESSED: {{ job.metadata.processed }} / {{ job.metadata.total }}</span>
                        <span v-if="job.metadata.updated !== undefined">UPDATED: {{ job.metadata.updated }}</span>
                    </div>

                    <div class="job-actions">
                        <button 
                            v-if="job.status === 'running' || job.status === 'pending'" 
                            class="btn-stop" 
                            @click="$emit('cancel', job._id)"
                        >
                            {{ t('ops.terminateMission') }}
                        </button>
                        <button 
                            v-else
                            class="btn-purge" 
                            @click="$emit('purge', job._id)"
                        >
                            {{ t('common.delete') }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- History Section -->
        <div class="history-section" v-if="history && history.length > 0">
            <div class="section-header-toggle" @click="showHistory = !showHistory">
                <h4 class="section-label">{{ t('ops.recentLogs') }}</h4>
                <button class="toggle-btn">
                    {{ showHistory ? '▲ ' + t('common.hide') : '▼ ' + t('common.show') }}
                </button>
            </div>
            
            <div v-if="showHistory" class="history-list">
                <div v-for="h in history" :key="h._id" class="history-item">
                    <div class="h-main-info">
                        <span class="h-type">{{ h.type.toUpperCase().replace('_', ' ') }}</span>
                        <span class="h-date">{{ formatDate(h.createdAt) }}</span>
                        <span class="h-status" :class="h.status">{{ t(`ops.status.${h.status}`).toUpperCase() }}</span>
                    </div>
                    <button class="btn-purge-mini" @click="$emit('purge', h._id)" :title="t('common.delete')">✕</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { AnalysisJob } from '../../api/jobs';

const props = defineProps<{
    activeJobs: Record<string, AnalysisJob>,
    history?: AnalysisJob[]
}>();

const emit = defineEmits(['cancel', 'purge', 'trigger-reanalyze', 'trigger-rag-reindex']);
const { t } = useI18n();

const confirmingReanalyze = ref(false);
const confirmingRagReindex = ref(false);
const showHistory = ref(false);

function handleTriggerClick() {
    if (confirmingReanalyze.value) {
        emit('trigger-reanalyze');
        confirmingReanalyze.value = false;
    } else {
        confirmingReanalyze.value = true;
        // Auto-reset confirmation after 5 seconds
        setTimeout(() => {
            confirmingReanalyze.value = false;
        }, 5000);
    }
}

function handleRagClick() {
    if (confirmingRagReindex.value) {
        emit('trigger-rag-reindex');
        confirmingRagReindex.value = false;
    } else {
        confirmingRagReindex.value = true;
        // Auto-reset confirmation after 5 seconds
        setTimeout(() => {
            confirmingRagReindex.value = false;
        }, 5000);
    }
}

const isAnyReanalyzeRunning = computed(() => {
    return Object.values(props.activeJobs).some(job => 
        (job.type === 'threat_reanalyze' || job.type === 'ssh_reanalyze') && 
        (job.status === 'running' || job.status === 'pending')
    );
});

const isRagReindexRunning = computed(() => {
    return Object.values(props.activeJobs).some(job => 
        job.type === 'rag_reindex' && 
        (job.status === 'running' || job.status === 'pending')
    );
});

function formatDate(dateStr: string) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
</script>

<style scoped>
.job-monitor-container {
    padding: 25px;
    margin-bottom: 30px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(15, 23, 42, 0.4) 100%);
}

.monitor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 15px;
}

.header-title {
    display: flex;
    align-items: center;
    gap: 12px;
}

.header-icon { font-size: 1.4rem; }
.header-title h3 {
    font-size: 1rem;
    font-weight: 900;
    letter-spacing: 3px;
    color: #fff;
    margin: 0;
    text-shadow: 0 0 15px rgba(99, 102, 241, 0.3);
}

.header-status {
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 1.5px;
    color: #3b82f6;
    display: flex;
    align-items: center;
    gap: 8px;
}

.pulse-dot {
    width: 6px;
    height: 6px;
    background: #3b82f6;
    border-radius: 50%;
    box-shadow: 0 0 10px #3b82f6;
    animation: pulse-blue 2s infinite;
}

@keyframes pulse-blue {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.5); opacity: 0.5; }
    100% { transform: scale(1); opacity: 1; }
}

.section-label {
    font-size: 0.65rem;
    font-weight: 900;
    color: #64748b;
    letter-spacing: 2px;
    margin: 0 0 15px 0;
}

/* Commands Grid */
.commands-section {
    margin-bottom: 30px;
}

.commands-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 15px;
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
    gap: 15px;
    padding: 15px 20px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    cursor: pointer;
    text-align: left;
    transition: all 0.3s;
}

.cmd-wrapper.is-confirming .cmd-btn {
    background: rgba(245, 158, 11, 0.1);
    border-color: #f59e0b;
    animation: pulse-confirm 1s infinite alternate;
}

@keyframes pulse-confirm {
    from { box-shadow: 0 0 5px rgba(245, 158, 11, 0.2); }
    to { box-shadow: 0 0 20px rgba(245, 158, 11, 0.4); }
}

.cmd-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
}

.cmd-btn.warning:hover:not(:disabled) {
    border-color: #f59e0b;
    box-shadow: 0 5px 20px rgba(245, 158, 11, 0.1);
}

.cmd-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.cancel-cmd {
    position: absolute;
    right: -10px;
    top: -10px;
    width: 24px;
    height: 24px;
    background: #475569;
    border: none;
    border-radius: 50%;
    color: #fff;
    font-size: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
}

.cmd-icon { font-size: 1.5rem; }
.cmd-text { display: flex; flex-direction: column; }
.cmd-name { font-weight: 800; font-size: 0.8rem; color: #fff; letter-spacing: 1px; }
.cmd-desc { font-size: 0.65rem; color: #94a3b8; }

/* Active Section */
.active-section {
    margin-bottom: 25px;
}

.no-jobs-msg {
    padding: 20px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px dashed rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    text-align: center;
    font-size: 0.7rem;
    color: #475569;
    letter-spacing: 1px;
}

.job-item {
    background: rgba(99, 102, 241, 0.05);
    border: 1px solid rgba(99, 102, 241, 0.1);
    border-radius: 12px;
    padding: 18px;
    margin-bottom: 12px;
}

.job-info { display: flex; justify-content: space-between; margin-bottom: 12px; }
.job-type { font-weight: 900; font-size: 0.8rem; color: #fff; }
.job-status { font-size: 0.6rem; padding: 2px 8px; border-radius: 4px; font-weight: 900; }
.job-status.pending { background: rgba(234, 179, 8, 0.2); color: #eab308; }
.job-status.running { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.job-status.completed { background: rgba(34, 197, 94, 0.2); color: #10b981; }
.job-status.failed { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
.job-status.cancelled { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }

.progress-container { display: flex; align-items: center; gap: 15px; margin-bottom: 12px; }
.progress-bar-bg { flex: 1; height: 6px; background: rgba(255, 255, 255, 0.05); border-radius: 3px; overflow: hidden; }
.progress-bar-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #6366f1); transition: width 0.4s ease; }
.progress-text { font-size: 0.75rem; font-weight: 900; color: #3b82f6; min-width: 35px; }

.job-metadata { display: flex; gap: 20px; font-size: 0.65rem; color: #64748b; margin-bottom: 12px; font-family: monospace; }
.btn-stop { background: #ef4444; color: #fff; border: none; font-size: 0.65rem; font-weight: 900; padding: 6px 15px; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
.btn-stop:hover { background: #dc2626; transform: scale(1.05); }

.btn-purge { background: rgba(255, 255, 255, 0.05); color: #94a3b8; border: 1px solid rgba(255, 255, 255, 0.1); font-size: 0.6rem; font-weight: 900; padding: 4px 10px; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
.btn-purge:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.2); }

/* History Section */
.section-header-toggle {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    margin-bottom: 15px;
    padding: 5px 0;
    transition: opacity 0.2s;
}

.section-header-toggle:hover {
    opacity: 0.8;
}

.section-header-toggle .section-label {
    margin-bottom: 0;
}

.toggle-btn {
    background: transparent;
    border: none;
    color: #3b82f6;
    font-size: 0.6rem;
    font-weight: 800;
    letter-spacing: 1px;
    cursor: pointer;
    text-transform: uppercase;
}

.history-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.history-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 15px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 6px;
    font-size: 0.65rem;
    color: #94a3b8;
}

.h-main-info {
    display: flex;
    flex: 1;
    justify-content: space-between;
    margin-right: 15px;
}

.btn-purge-mini {
    background: transparent;
    border: none;
    color: #475569;
    font-size: 0.8rem;
    cursor: pointer;
    padding: 2px 5px;
    transition: all 0.2s;
}

.btn-purge-mini:hover {
    color: #ef4444;
}

.h-status.completed { color: #10b981; }
.h-status.failed { color: #ef4444; }
.h-status.cancelled { color: #f59e0b; }
</style>
