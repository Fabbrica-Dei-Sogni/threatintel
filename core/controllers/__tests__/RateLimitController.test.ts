import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import { getComponent, container } from '../../di/container';
import { RateLimitController } from '../RateLimitController';

import { Logger } from 'winston';
import { LOGGER_TOKEN, ROUTER_HUB_TOKEN, RATE_LIMIT_SERVICE_TOKEN } from '../../di/tokens';

import { setupContainer } from '../../di/registry';
import { RouterHub } from '../../registry/RouterHub';

// Mock AuthMiddleware
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

const mockRateLimitService = {
    getEventsByIp: jest.fn(),
    countEventsByIp: jest.fn(),
};

const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
} as unknown as Logger;

// Initialize DI
setupContainer(container);
container.clearInstances();

container.registerInstance(RATE_LIMIT_SERVICE_TOKEN, mockRateLimitService);
container.registerInstance(LOGGER_TOKEN, mockLogger);

const app = express();
app.use(express.json());

// Registrazione e bind tramite RouterHub
const hub = getComponent<RouterHub>(ROUTER_HUB_TOKEN);
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
