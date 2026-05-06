import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import { container, getComponent } from '../../di/container';
import { setupContainer } from '../../di/registry';
import { ManageLimitController } from '../ManageLimitController';
import * as Tokens from '../../di/tokens';

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

describe('ManageLimitRoutes API', () => {
    let app: express.Express;
    let mockRateLimitMiddleware: any;
    let mockLogger: any;

    beforeAll(() => {
        // Initialize DI
        setupContainer(container);
        container.clearInstances();

        mockRateLimitMiddleware = {
            manualBlacklistIP: jest.fn(),
            removeIPFromBlacklist: jest.fn(),
        };

        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        };

        // Register mocks using Tokens
        container.registerInstance(Tokens.RATE_LIMIT_MIDDLEWARE_TOKEN, mockRateLimitMiddleware);
        container.registerInstance(Tokens.LOGGER_TOKEN, mockLogger);

        app = express();
        app.use(express.json());

        // Registrazione e bind tramite RouterHub
        const hub = getComponent<RouterHub>(Tokens.ROUTER_HUB_TOKEN);
        hub.register(ManageLimitController);
        hub.bindHttp(app, container);
    });

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
