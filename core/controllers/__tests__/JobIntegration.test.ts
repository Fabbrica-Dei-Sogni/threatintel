import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import { container } from '../../di/container';
import { JobController } from '../../controllers/JobController';
import { ThreatController } from '../../controllers/ThreatController';
import { LOGGER_TOKEN, ROUTER_HUB_TOKEN, BACKGROUND_JOB_MANAGER_TOKEN, THREAT_LOG_SERVICE_TOKEN, IP_DETAILS_SERVICE_TOKEN, STATUS_MANAGER_SERVICE_TOKEN } from '../../di/tokens';
import { Logger } from 'winston';
import { setupContainer } from '../../di/registry';
import { RouterHub } from '../../registry/RouterHub';

// Mock AuthMiddleware
jest.mock('../../middlewares/AuthMiddleware', () => {
    return {
        AuthMiddleware: jest.fn().mockImplementation(() => {
            return {
                isAuthenticated: jest.fn().mockReturnValue((_req: any, _res: any, next: any) => next()),
                hasRole: jest.fn().mockReturnValue((_req: any, _res: any, next: any) => next()),
            };
        })
    };
});

// Mock BackgroundJobManager
const mockJobManager = {
    startJob: jest.fn(),
    stopJob: jest.fn(),
    getJobStatus: jest.fn(),
    listJobs: jest.fn(),
};

const mockThreatLogService = {
    getStats: jest.fn(),
    getTopThreats: jest.fn(),
    searchLogs: jest.fn(),
    getLogs: jest.fn(),
    countLogs: jest.fn(),
};

const mockIpDetailsService = {};
const mockStatusManager = {};

const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
} as unknown as Logger;

// Setup
setupContainer(container);
container.clearInstances();
container.registerInstance(BACKGROUND_JOB_MANAGER_TOKEN, mockJobManager);
container.registerInstance(THREAT_LOG_SERVICE_TOKEN, mockThreatLogService);
container.registerInstance(IP_DETAILS_SERVICE_TOKEN, mockIpDetailsService);
container.registerInstance(STATUS_MANAGER_SERVICE_TOKEN, mockStatusManager);
container.registerInstance(LOGGER_TOKEN, mockLogger);

const app = express();
app.use(express.json());
const hub = container.resolve<RouterHub>(ROUTER_HUB_TOKEN);
hub.register(JobController);
hub.register(ThreatController);
hub.bindHttp(app, container);

describe('Asynchronous Jobs Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('ThreatController - POST /api/reanalyze-all', () => {
        it('should start HTTP and SSH reanalysis jobs asynchronously', async () => {
            mockJobManager.startJob.mockResolvedValueOnce({ id: 'job-http', status: 'pending' });
            mockJobManager.startJob.mockResolvedValueOnce({ id: 'job-ssh', status: 'pending' });

            const response = await request(app).post('/api/reanalyze-all').send({ batchSize: 50 });

            expect(response.status).toBe(202);
            expect(response.body.message).toContain('avviati in background');
            expect(response.body.jobs.http.jobId).toBe('job-http');
            expect(response.body.jobs.ssh.jobId).toBe('job-ssh');
            
            expect(mockJobManager.startJob).toHaveBeenCalledWith('threat_reanalyze', { batchSize: 50, updateDatabase: true }, expect.any(String));
            expect(mockJobManager.startJob).toHaveBeenCalledWith('ssh_reanalyze', { batchSize: 50 }, expect.any(String));
        });
    });

    describe('JobController API', () => {
        it('GET /api/jobs should list recent jobs', async () => {
            mockJobManager.listJobs.mockResolvedValue([{ id: 'job1', type: 'ssh_reanalyze' }]);
            
            const response = await request(app).get('/api/jobs');
            
            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body[0].id).toBe('job1');
        });

        it('POST /api/jobs should start a custom job', async () => {
            mockJobManager.startJob.mockResolvedValue({ id: 'custom-job', status: 'pending' });
            
            const response = await request(app).post('/api/jobs').send({ type: 'threat_reanalyze', params: { batchSize: 10 } });
            
            expect(response.status).toBe(202);
            expect(response.body.jobId).toBe('custom-job');
            expect(mockJobManager.startJob).toHaveBeenCalledWith('threat_reanalyze', { batchSize: 10 }, expect.any(String));
        });

        it('GET /api/jobs/:id should return job status', async () => {
            mockJobManager.getJobStatus.mockResolvedValue({ id: 'job123', status: 'running', progress: 45 });
            
            const response = await request(app).get('/api/jobs/job123');
            
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('running');
            expect(response.body.progress).toBe(45);
        });

        it('DELETE /api/jobs/:id should stop a job', async () => {
            const response = await request(app).delete('/api/jobs/job123');
            
            expect(response.status).toBe(200);
            expect(mockJobManager.stopJob).toHaveBeenCalledWith('job123');
        });
    });
});
