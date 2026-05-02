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
import { RateLimitController } from '../RateLimitController';
import { RateLimitService } from '../../services/RateLimitService';
import { RouterHub } from '../../registry/RouterHub';
import { Logger } from 'winston';
import { LOGGER_TOKEN } from '../../di/tokens';
import { AuthMiddleware } from '../../middlewares/AuthMiddleware';

// Mock AuthMiddleware
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

const mockRateLimitService = {
    getEventsByIp: jest.fn(),
    countEventsByIp: jest.fn(),
};

const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
} as unknown as Logger;

container.register(RateLimitService, { useValue: mockRateLimitService as any });
container.register(LOGGER_TOKEN, { useValue: mockLogger });

const app = express();
app.use(express.json());

// Registrazione e bind tramite RouterHub
const hub = container.resolve(RouterHub);
hub.register(RateLimitController);
hub.bindHttp(app, container);

describe('RateLimitRoutes API', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/ratelimit/search', () => {
        it('should return rate limit events successfully', async () => {
            mockRateLimitService.getEventsByIp.mockResolvedValue([{ ip: '1.2.3.4', count: 1 }]);
            mockRateLimitService.countEventsByIp.mockResolvedValue(1);

            const response = await request(app)
                .post('/api/ratelimit/search')
                .send({ page: 1, pageSize: 10 });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('bobjs');
            expect(response.body).toHaveProperty('total');
            expect(response.body.bobjs.length).toBe(1);
            expect(response.body.total).toBe(1);
        });

        it('should handle default pagination', async () => {
            mockRateLimitService.getEventsByIp.mockResolvedValue([]);
            mockRateLimitService.countEventsByIp.mockResolvedValue(0);

            await request(app)
                .post('/api/ratelimit/search')
                .send({});
            
            expect(mockRateLimitService.getEventsByIp).toHaveBeenCalledWith({
                page: 1,
                pageSize: 20,
                filters: {},
            });
        });

        it('should return 500 if service fails', async () => {
            mockRateLimitService.getEventsByIp.mockRejectedValue(new Error('DB Error'));

            const response = await request(app)
                .post('/api/ratelimit/search')
                .send({});

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Errore recupero ratelimits');
        });
    });
});
