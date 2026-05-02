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
import { ManageLimitController } from '../ManageLimitController';
import { RateLimitMiddleware } from '../../rateLimitMiddleware';
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

const mockRateLimitMiddleware = {
    manualBlacklistIP: jest.fn(),
    removeIPFromBlacklist: jest.fn(),
};

const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
} as unknown as Logger;

container.register(RateLimitMiddleware, { useValue: mockRateLimitMiddleware as any });
container.register(LOGGER_TOKEN, { useValue: mockLogger });

const app = express();
app.use(express.json());

// Registrazione e bind tramite RouterHub
const hub = container.resolve(RouterHub);
hub.register(ManageLimitController);
hub.bindHttp(app, container);

describe('ManageLimitRoutes API', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/blacklist-ip', () => {
        it('should blacklist an IP successfully', async () => {
            mockRateLimitMiddleware.manualBlacklistIP.mockResolvedValue(undefined);

            const response = await request(app)
                .post('/api/blacklist-ip')
                .send({ ip: '1.2.3.4' });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('IP 1.2.3.4 inserito con successo in blacklist.');
            expect(mockRateLimitMiddleware.manualBlacklistIP).toHaveBeenCalledWith('1.2.3.4');
        });

        it('should return 400 if IP is missing', async () => {
            const response = await request(app)
                .post('/api/blacklist-ip')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('IP mancante nel corpo della richiesta');
        });

        it('should return 500 if blacklisting fails', async () => {
            const errorMessage = 'Redis error';
            mockRateLimitMiddleware.manualBlacklistIP.mockRejectedValue(new Error(errorMessage));

            const response = await request(app)
                .post('/api/blacklist-ip')
                .send({ ip: '1.2.3.4' });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Errore interno durante la blacklist dell\'IP');
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
});
