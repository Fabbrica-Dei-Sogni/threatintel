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
import { getComponent, container } from '../../di/container';
import { setupContainer } from '../../di/registry';
import { AttackLogController } from '../../controllers/AttackLogController';
import * as Tokens from '../../di/tokens';

import { RouterHub } from '../../registry/RouterHub';

jest.mock('../../middlewares/AuthMiddleware', () => {
    return {
        AuthMiddleware: jest.fn().mockImplementation(() => {
            return {
                isAuthenticated: jest.fn().mockReturnValue((_req: any, _res: any, next: any) => next()),
                isIdentified: jest.fn().mockReturnValue((_req: any, _res: any, next: any) => next()),
                hasRole: jest.fn().mockReturnValue((_req: any, _res: any, next: any) => next()),
            };
        })
    };
});

describe('AttackLogController API', () => {
    let app: express.Express;
    let mockAttackLogService: any;
    let mockLogger: any;

    beforeAll(() => {
        // Initialize DI
        setupContainer(container);
        container.clearInstances();

        mockAttackLogService = {
            getAttacks: jest.fn(),
            getAttackDetail: jest.fn(),
            getDistributedAttackDetail: jest.fn(),
        };

        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        };

        // Register mocks using Tokens
        container.registerInstance(Tokens.ATTACK_LOG_SERVICE_TOKEN, mockAttackLogService);
        container.registerInstance(Tokens.LOGGER_TOKEN, mockLogger);

        app = express();
        app.use(express.json());

        const hub = getComponent<RouterHub>(Tokens.ROUTER_HUB_TOKEN);
        hub.register(AttackLogController);
        hub.bindHttp(app, container);
    });

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
