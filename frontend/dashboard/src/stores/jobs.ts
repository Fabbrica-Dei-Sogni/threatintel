import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import { fetchJobs, fetchJobStatus, stopJob, purgeJob, createJob, type AnalysisJob, JobStatus } from '../api/jobs';

export const useJobStore = defineStore('jobs', () => {
    const jobs = ref<AnalysisJob[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const activeJobs = reactive<Record<string, AnalysisJob>>({});
    
    let pollInterval: any = null;

    async function loadRecentJobs() {
        loading.value = true;
        try {
            const fetchedJobs = await fetchJobs(10);
            jobs.value = fetchedJobs;
            
            // Auto-monitor any running/pending jobs
            const active = fetchedJobs.filter(j => 
                j.status === JobStatus.RUNNING || j.status === JobStatus.PENDING
            );
            if (active.length > 0) {
                monitorJobs(active.map(j => j._id));
            }
        } catch (err: any) {
            error.value = 'Errore caricamento storico job';
            console.error('[JobStore] Error loading jobs:', err);
        } finally {
            loading.value = false;
        }
    }

    async function cancelJob(jobId: string) {
        try {
            await stopJob(jobId);
            // Non cancelliamo subito per permettere al polling di aggiornare lo stato a CANCELLED
            // ma forziamo un aggiornamento immediato dello storico
            setTimeout(loadRecentJobs, 1000);
        } catch (err: any) {
            error.value = 'Impossibile fermare il job';
            console.error(`[JobStore] Error stopping job ${jobId}:`, err);
        }
    }

    async function deleteJob(jobId: string) {
        try {
            await purgeJob(jobId);
            delete activeJobs[jobId];
            jobs.value = jobs.value.filter(j => j._id !== jobId);
            await loadRecentJobs();
        } catch (err: any) {
            error.value = 'Impossibile rimuovere il job';
            console.error(`[JobStore] Error purging job ${jobId}:`, err);
        }
    }

    function monitorJobs(jobIds: string[]) {
        jobIds.forEach(id => {
            if (!activeJobs[id]) {
                const existing = jobs.value.find(j => j._id === id);
                if (existing) {
                    activeJobs[id] = { ...existing };
                } else {
                    activeJobs[id] = { 
                        _id: id, 
                        status: JobStatus.PENDING, 
                        progress: 0,
                        type: 'initializing...',
                        metadata: { processed: 0, total: 0, errors: [], params: {} },
                        createdAt: new Date().toISOString()
                    } as any;
                }
            }
        });

        if (!pollInterval) {
            startPolling();
        }
    }

    function startPolling() {
        if (pollInterval) return;
        
        pollInterval = setInterval(async () => {
            const ids = Object.keys(activeJobs);
            if (ids.length === 0) {
                stopPolling();
                return;
            }

            const promises = ids.map(id => fetchJobStatus(id));
            const results = await Promise.allSettled(promises);

            results.forEach((res, index) => {
                const id = ids[index];
                if (res.status === 'fulfilled') {
                    const job = res.value;
                    activeJobs[id] = job;
                    
                    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED || job.status === JobStatus.CANCELLED) {
                        setTimeout(() => {
                            delete activeJobs[id];
                            loadRecentJobs();
                        }, 5000);
                    }
                } else {
                    console.error(`[JobStore] Failed to poll job ${id}:`, res.reason);
                }
            });
        }, 2000);
    }

    function stopPolling() {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    }

    async function runJob(type: string, params: any = {}) {
        try {
            const result = await createJob(type, params);
            if (result && result.jobId) {
                monitorJobs([result.jobId]);
                return result;
            }
        } catch (err: any) {
            error.value = `Impossibile avviare il job ${type}`;
            console.error(`[JobStore] Error triggering job ${type}:`, err);
            throw err;
        }
    }

    function updateJobStatus(jobId: string, updates: Partial<AnalysisJob>) {
        if (activeJobs[jobId]) {
            Object.assign(activeJobs[jobId], updates);
            
            // Se il job è terminato, lo spostiamo nello storico dopo un po'
            if (updates.status === JobStatus.COMPLETED || updates.status === JobStatus.FAILED || updates.status === JobStatus.CANCELLED) {
                setTimeout(() => {
                    delete activeJobs[jobId];
                    loadRecentJobs();
                }, 5000);
            }
        } else {
            // Se non lo stiamo monitorando ma arriva un aggiornamento (es. appena creato), lo aggiungiamo
            if (updates.status === JobStatus.RUNNING || updates.status === JobStatus.PENDING) {
                activeJobs[jobId] = { _id: jobId, ...updates } as any;
            }
        }
    }

    return {
        jobs,
        activeJobs,
        loading,
        error,
        loadRecentJobs,
        cancelJob,
        deleteJob,
        monitorJobs,
        stopPolling,
        runJob,
        updateJobStatus
    };
});
