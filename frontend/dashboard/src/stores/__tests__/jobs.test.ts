import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useJobStore } from '../jobs';
import * as jobsApi from '../../api/jobs';
import { JobStatus } from '../../api/jobs';

vi.mock('../../api/jobs', () => ({
    fetchJobs: vi.fn(),
    fetchJobStatus: vi.fn(),
    stopJob: vi.fn(),
    purgeJob: vi.fn(),
    JobStatus: {
        PENDING: 'pending',
        RUNNING: 'running',
        COMPLETED: 'completed',
        FAILED: 'failed',
        CANCELLED: 'cancelled'
    }
}));

describe('Job Store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    it('should load recent jobs and start monitoring if active', async () => {
        const mockJobs = [
            { _id: '1', status: JobStatus.RUNNING, type: 'test' },
            { _id: '2', status: JobStatus.COMPLETED, type: 'test' }
        ];
        (jobsApi.fetchJobs as any).mockResolvedValue(mockJobs);
        
        const store = useJobStore();
        await store.loadRecentJobs();

        expect(store.jobs).toEqual(mockJobs);
        expect(store.activeJobs['1']).toBeDefined();
        expect(store.activeJobs['2']).toBeUndefined();
    });

    it('should cancel a job', async () => {
        (jobsApi.stopJob as any).mockResolvedValue(undefined);
        const store = useJobStore();
        
        await store.cancelJob('123');
        expect(jobsApi.stopJob).toHaveBeenCalledWith('123');
    });

    it('should delete a job', async () => {
        (jobsApi.purgeJob as any).mockResolvedValue(undefined);
        const store = useJobStore();
        store.activeJobs['123'] = { _id: '123' } as any;
        
        await store.deleteJob('123');
        expect(jobsApi.purgeJob).toHaveBeenCalledWith('123');
        expect(store.activeJobs['123']).toBeUndefined();
    });

    it('should monitor jobs', async () => {
        const store = useJobStore();
        store.monitorJobs(['job1']);
        
        expect(store.activeJobs['job1']).toBeDefined();
        expect(store.activeJobs['job1'].status).toBe(JobStatus.PENDING);
    });
});
