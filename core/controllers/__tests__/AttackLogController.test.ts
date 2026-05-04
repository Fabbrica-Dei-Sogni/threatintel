/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */
import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import { container } from 'tsyringe';
import { AttackLogController } from '../../controllers/AttackLogController';
import { AttackLogService } from '../../services/AttackLogService';
import { LOGGER_TOKEN } from '../../di/tokens';
import { Logger } from 'winston';
import { AuthMiddleware } from '../../middlewares/AuthMiddleware';
import { RouterHub } from '../../registry/RouterHub';

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

const mockAttackLogService = {
    getAttacks: jest.fn(),
    getAttackDetail: jest.fn(),
    getDistributedAttackDetail: jest.fn(),
};

const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
} as unknown as Logger;

container.register<AttackLogService>(AttackLogService, { useValue: mockAttackLogService as any });
container.register<Logger>(LOGGER_TOKEN, { useValue: mockLogger });

const app = express();
app.use(express.json());

const hub = container.resolve(RouterHub);
hub.register(AttackLogController);
hub.bindHttp(app, container);

describe('AttackLogController API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/attack/search', () => {
        it('should return attacks based on search criteria', async () => {
            mockAttackLogService.getAttacks.mockResolvedValue({ items: [{ ip: '1.1.1.1', count: 50 }], totalCount: 1 });
            const response = await request(app).post('/api/attack/search').send({ filters: { country: 'USA' }});
            expect(response.status).toBe(200);
            expect(response.body.attacks.length).toBe(1);
            expect(response.body.total).toBe(1);
            expect(mockAttackLogService.getAttacks).toHaveBeenCalled();
        });
    });

    describe('POST /api/attack/details', () => {
        it('should return attack details for a given IP', async () => {
            mockAttackLogService.getAttackDetail.mockResolvedValue({ ip: '1.1.1.1', logs: [] });
            const response = await request(app).post('/api/attack/details').send({ ip: '1.1.1.1' });
            expect(response.status).toBe(200);
            expect(response.body.ip).toBe('1.1.1.1');
        });

        it('should return 400 if IP is missing', async () => {
            const response = await request(app).post('/api/attack/details').send({});
            expect(response.status).toBe(400);
        });

        it('should return 404 if attack is not found', async () => {
            mockAttackLogService.getAttackDetail.mockResolvedValue(null);
            const response = await request(app).post('/api/attack/details').send({ ip: '1.1.1.1' });
            expect(response.status).toBe(404);
        });
    });

    describe('POST /api/attack/distributed', () => {
        it('should return distributed attack details', async () => {
            mockAttackLogService.getDistributedAttackDetail.mockResolvedValue({ ipCount: 2, totalLogs: 100 });
            const response = await request(app).post('/api/attack/distributed').send({ ipList: ['1.1.1.1', '2.2.2.2'] });
            expect(response.status).toBe(200);
            expect(response.body.ipCount).toBe(2);
        });

        it('should return 400 if ipList is missing or empty', async () => {
            const response = await request(app).post('/api/attack/distributed').send({ ipList: [] });
            expect(response.status).toBe(400);
        });
    });
});
