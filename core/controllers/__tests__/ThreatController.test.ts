/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import { container } from 'tsyringe';
import { ThreatController } from '../../controllers/ThreatController';
import { ThreatLogService } from '../../services/ThreatLogService';
import { IpDetailsService } from '../../services/IpDetailsService';
import { SshLogService } from '../../services/SshLogService';
import { LOGGER_TOKEN } from '../../di/tokens';
import { Logger } from 'winston';
import { AuthMiddleware } from '../../middlewares/AuthMiddleware';
import { RouterHub } from '../../registry/RouterHub';

// Mock AuthMiddleware PRIMA di importare il controller se possibile, 
// ma qui lo facciamo con jest.mock
jest.mock('../../middlewares/AuthMiddleware', () => {
    return {
        AuthMiddleware: jest.fn().mockImplementation(() => {
            return {
                isAuthenticated: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
                isIdentified: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
                hasRole: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
            };
        })
    };
});

// Mock dei servizi e del logger
const mockThreatLogService = {
    getStats: jest.fn(),
    getTopThreats: jest.fn(),
    getLogs: jest.fn(),
    countLogs: jest.fn(),
    getLogById: jest.fn(),
    getDistinctIPs: jest.fn(),
    assignIpDetailsToLogs: jest.fn(),
    analyzeLogs: jest.fn(),
    dryRunAnalyzeLogs: jest.fn(),
};

const mockIpDetailsService = {
    enrichWithAbuse: jest.fn(),
    getAndSaveReportsAbuseIpDb: jest.fn(),
    getIpDetails: jest.fn(),
    findOrCreate: jest.fn(),
};

const mockSshLogService = {
    analyzeSshLogs: jest.fn(),
};

const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
} as unknown as Logger;

// Iniezione dei mock nel container di tsyringe
container.register<ThreatLogService>(ThreatLogService, { useValue: mockThreatLogService as any });
container.register<IpDetailsService>(IpDetailsService, { useValue: mockIpDetailsService as any });
container.register<SshLogService>(SshLogService, { useValue: mockSshLogService as any });
container.register<Logger>(LOGGER_TOKEN, { useValue: mockLogger });

// Creazione istanza dell'app express
const app = express();
app.use(express.json());

// Registrazione e bind tramite RouterHub
const hub = container.resolve(RouterHub);
hub.register(ThreatController);
hub.bindHttp(app, container);


describe('ThreatRoutes API', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/stats', () => {
        it('should return stats and top threats', async () => {
            mockThreatLogService.getStats.mockResolvedValue({ total: 100 });
            mockThreatLogService.getTopThreats.mockResolvedValue([{ ip: '1.1.1.1', count: 10 }]);
            const response = await request(app).get('/api/stats');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('stats');
            expect(response.body).toHaveProperty('topThreats');
        });

        it('should return 500 on error', async () => {
            mockThreatLogService.getStats.mockRejectedValue(new Error('DB Error'));
            const response = await request(app).get('/api/stats');
            expect(response.status).toBe(500);
        });
    });

    describe('POST /api/search', () => {
        it('should return logs based on search criteria', async () => {
            mockThreatLogService.getLogs.mockResolvedValue([{ id: '1', ip: '1.1.1.1' }]);
            mockThreatLogService.countLogs.mockResolvedValue(1);
            const response = await request(app).post('/api/search').send({ filters: { ip: '1.1.1.1' } });
            expect(response.status).toBe(200);
            expect(response.body.logs.length).toBe(1);
            expect(response.body.total).toBe(1);
        });
    });
    

    describe('GET /api/logs/:id', () => {
        it('should return a log by its ID', async () => {
            mockThreatLogService.getLogById.mockResolvedValue({ id: 'log1', message: 'test log' });
            const response = await request(app).get('/api/logs/log1');
            expect(response.status).toBe(200);
            expect(response.body.id).toBe('log1');
        });

        it('should return 404 if log is not found', async () => {
            mockThreatLogService.getLogById.mockResolvedValue(null);
            const response = await request(app).get('/api/logs/notfound');
            expect(response.status).toBe(404);
        });
    });

    describe('GET /api/reputationscore/:ip', () => {
        it('should return reputation score for an IP', async () => {
            mockIpDetailsService.enrichWithAbuse.mockResolvedValue({ score: 100 });
            const response = await request(app).get('/api/reputationscore/1.1.1.1');
            expect(response.status).toBe(200);
            expect(response.body.score).toBe(100);
        });
    });
    
    describe('POST /api/enrichreports/:ip', () => {
        it('should enrich and return reports for an IP', async () => {
            mockIpDetailsService.getAndSaveReportsAbuseIpDb.mockResolvedValue([{ report: 'data' }]);
            const response = await request(app).post('/api/enrichreports/1.1.1.1');
            expect(response.status).toBe(200);
            expect(response.body.length).toBe(1);
        });
    });

    describe('GET /api/ipdetail/:ip', () => {
        it('should return IP details', async () => {
            mockIpDetailsService.getIpDetails.mockResolvedValue({ ip: '1.1.1.1', country: 'USA' });
            const response = await request(app).get('/api/ipdetail/1.1.1.1');
            expect(response.status).toBe(200);
            expect(response.body.ip).toBe('1.1.1.1');
        });
    });

    describe('POST /api/enrich/:ip', () => {
        it('should trigger enrichment for a single IP', async () => {
            mockIpDetailsService.findOrCreate.mockResolvedValue('detailsId');
            const response = await request(app).post('/api/enrich/1.1.1.1');
            expect(response.status).toBe(200);
            expect(mockIpDetailsService.findOrCreate).toHaveBeenCalledWith('1.1.1.1', true);
            expect(mockThreatLogService.assignIpDetailsToLogs).toHaveBeenCalledWith('1.1.1.1', 'detailsId');
        });
    });

    describe('POST /api/enrich', () => {
        it('should trigger batch enrichment for all unique IPs', async () => {
            mockThreatLogService.getDistinctIPs.mockResolvedValue(['1.1.1.1', '2.2.2.2']);
            mockIpDetailsService.findOrCreate.mockResolvedValue('detailsId');
            const response = await request(app).post('/api/enrich');
            expect(response.status).toBe(200);
            expect(mockThreatLogService.getDistinctIPs).toHaveBeenCalled();
            expect(mockIpDetailsService.findOrCreate).toHaveBeenCalledTimes(2);
        });
    });
    
    describe('POST /api/reanalyze-all', () => {
        it('should trigger a full reanalysis of logs', async () => {
            mockThreatLogService.analyzeLogs.mockResolvedValue({ processed: 10, suspicious: 5 });
            const response = await request(app).post('/api/reanalyze-all').send({});
            expect(response.status).toBe(200);
            expect(response.body.http.processed).toBe(10);
        });
    });

    describe('GET /api/analyze-preview', () => {
        it('should return a dry-run analysis preview', async () => {
            mockThreatLogService.dryRunAnalyzeLogs.mockResolvedValue({ message: "Dry run complete" });
            const response = await request(app).get('/api/analyze-preview');
            expect(response.status).toBe(200);
            expect(response.body.message).toBe("Dry run complete");
        });
    });
});
