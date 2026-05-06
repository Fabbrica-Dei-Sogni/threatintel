import { describe, it, expect, vi, beforeEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { fetchJobs, fetchJobStatus, stopJob, purgeJob, createJob, JobStatus } from '../jobs';
import { apiClient } from '../index';

describe('API jobs', () => {
    let mock: MockAdapter;

    beforeEach(() => {
        mock = new MockAdapter(apiClient);
        vi.clearAllMocks();
    });

    it('should fetch recent jobs', async () => {
        const mockData = [{ _id: '1', type: 'test', status: JobStatus.COMPLETED }];
        mock.onGet('/jobs').reply(200, mockData);

        const result = await fetchJobs(5);
        expect(result).toEqual(mockData);
    });

    it('should fetch job status', async () => {
        const mockData = { _id: '1', status: JobStatus.RUNNING };
        mock.onGet('/jobs/1').reply(200, mockData);

        const result = await fetchJobStatus('1');
        expect(result).toEqual(mockData);
    });

    it('should stop a job', async () => {
        mock.onDelete('/jobs/1').reply(200, { message: 'ok' });
        await stopJob('1');
        expect(mock.history.delete.length).toBe(1);
    });

    it('should purge a job', async () => {
        mock.onDelete('/jobs/1/purge').reply(200, { message: 'ok' });
        await purgeJob('1');
        expect(mock.history.delete.length).toBe(1);
    });

    it('should create a job', async () => {
        const mockResponse = { jobId: '123', status: 'pending' };
        mock.onPost('/jobs').reply(200, mockResponse);

        const result = await createJob('test_type', { param1: 'val' });
        expect(result).toEqual(mockResponse);
    });
});
