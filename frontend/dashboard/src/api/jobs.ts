import { apiClient } from './index';

export enum JobStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled'
}

export interface AnalysisJob {
    _id: string;
    type: string;
    status: JobStatus;
    progress: number;
    metadata: {
        processed: number;
        total: number;
        errors: string[];
        params: any;
        updated?: number;
    };
    startedAt?: string;
    completedAt?: string;
    error?: string;
    createdBy?: string;
    createdAt: string;
}

/**
 * Recupera l'elenco dei job recenti
 */
export async function fetchJobs(limit: number = 10): Promise<AnalysisJob[]> {
    const response = await apiClient.get<AnalysisJob[]>('/jobs', { params: { limit } });
    return response.data;
}

/**
 * Recupera lo stato di un singolo job
 */
export async function fetchJobStatus(jobId: string): Promise<AnalysisJob> {
    const response = await apiClient.get<AnalysisJob>(`/jobs/${jobId}`);
    return response.data;
}

/**
 * Ferma un job in corso
 */
export async function stopJob(jobId: string): Promise<void> {
    await apiClient.delete(`/jobs/${jobId}`);
}

/**
 * Rimuove definitivamente un job dal database
 */
export async function purgeJob(jobId: string): Promise<void> {
    await apiClient.delete(`/jobs/${jobId}/purge`);
}

/**
 * Avvia un nuovo job manualmente
 */
export async function createJob(type: string, params: any = {}): Promise<{ jobId: string, status: string }> {
    const response = await apiClient.post('/jobs', { type, params });
    return response.data;
}
