import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import { fetchJobs, fetchJobStatus, stopJob, purgeJob, createJob, type AnalysisJob, JobStatus } from '../api/jobs';

export const useJobStore = defineStore('jobs', () => {
    const jobs = ref<AnalysisJob[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const activeJobs = reactive<Record<string, AnalysisJob>>({});
    
    const finishingJobs = new Set<string>();
    const terminalIds = new Set<string>();
    let pollInterval: any = null;
    let loadRecentTimeout: any = null;

    /**
     * Helper to check if a status is terminal
     */
    function isTerminal(status: JobStatus | string): boolean {
        return status === JobStatus.COMPLETED || status === JobStatus.FAILED || status === JobStatus.CANCELLED;
    }

    /**
     * Debounced version of loadRecentJobs
     */
    function debouncedLoadRecentJobs() {
        if (loadRecentTimeout) clearTimeout(loadRecentTimeout);
        loadRecentTimeout = setTimeout(() => {
            loadRecentJobs();
            loadRecentTimeout = null;
        }, 300);
    }

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
            terminalIds.delete(jobId);
            finishingJobs.delete(jobId);
            jobs.value = jobs.value.filter(j => j._id !== jobId);
            await loadRecentJobs();
        } catch (err: any) {
            error.value = 'Impossibile rimuovere il job';
            console.error(`[JobStore] Error purging job ${jobId}:`, err);
        }
    }

    function monitorJobs(jobIds: string[]) {
        jobIds.forEach(id => {
            if (terminalIds.has(id)) return; // Mai riaggiungere job già finiti

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
            const ids = Object.keys(activeJobs).filter(id => !finishingJobs.has(id));
            if (ids.length === 0 && finishingJobs.size === 0) {
                stopPolling();
                return;
            }

            if (ids.length === 0) return;

            const promises = ids.map(id => fetchJobStatus(id));
            const results = await Promise.allSettled(promises);

            results.forEach((res, index) => {
                const id = ids[index];
                if (res.status === 'fulfilled') {
                    const job = res.value;
                    
                    // Solo se lo stato ricevuto è "più avanzato" o uguale a quello attuale
                    // Evitiamo che un poll ritardato sovrascriva uno stato terminale
                    const currentJob = activeJobs[id];
                    if (currentJob && isTerminal(currentJob.status)) {
                        return; 
                    }

                    activeJobs[id] = job;
                    
                    if (isTerminal(job.status)) {
                        scheduleJobRemoval(id);
                    }
                } else {
                    console.error(`[JobStore] Failed to poll job ${id}:`, res.reason);
                }
            });
        }, 2000);
    }

    function scheduleJobRemoval(jobId: string) {
        if (finishingJobs.has(jobId)) return;
        
        terminalIds.add(jobId); // Marcalo come terminale per sempre (o finché la pagina non viene ricaricata)
        finishingJobs.add(jobId);
        setTimeout(() => {
            delete activeJobs[jobId];
            finishingJobs.delete(jobId);
            debouncedLoadRecentJobs();
        }, 5000);
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
        // Se il job è già marcato come in rimozione o definitivamente terminale in questa sessione, ignoriamo l'evento
        if (terminalIds.has(jobId) || finishingJobs.has(jobId)) {
            return;
        }

        if (activeJobs[jobId]) {
            // Se lo stato attuale è già terminale, non accettiamo aggiornamenti non terminali (race condition socket/poll)
            if (isTerminal(activeJobs[jobId].status) && !isTerminal(updates.status || '')) {
                return;
            }

            Object.assign(activeJobs[jobId], updates);
            
            if (updates.status && isTerminal(updates.status)) {
                scheduleJobRemoval(jobId);
            }
        } else {
            // Se non lo stiamo monitorando ma arriva un aggiornamento (es. appena creato), lo aggiungiamo
            // A meno che non sia già terminale (evita di mostrare job già finiti se arriva l'evento in ritardo)
            if (updates.status && isTerminal(updates.status)) {
                return;
            }

            if (updates.status === JobStatus.RUNNING || updates.status === JobStatus.PENDING) {
                // Inizializziamo con dati di default per evitare errori di template (metadata mancanti)
                activeJobs[jobId] = { 
                    _id: jobId, 
                    status: updates.status,
                    progress: updates.progress || 0,
                    type: updates.type || 'unknown',
                    metadata: { processed: 0, total: 0, errors: [], params: {} },
                    createdAt: new Date().toISOString(),
                    ...updates 
                } as any;
                if (!pollInterval) startPolling();
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
