import 'reflect-metadata';
import { container } from 'tsyringe';
import express from 'express';
import request from 'supertest';

// Mocks for all controllers and middlewares
const mockMiddleware = (req: any, res: any, next: any) => next();
const mockRouter = express.Router();
mockRouter.get('/test', (req, res) => res.status(200).send('ok'));

// [REMOVED] Legacy route factory mocks

// Mocking logging and DI container
jest.mock('../../logger', () => ({ logger: { info: jest.fn() } }));

// Mocking ThreatLogger and RateLimitMiddleware
const mockThreatLogger = { middleware: jest.fn(() => mockMiddleware) };
const mockRateLimitMiddleware = { 
    handle: jest.fn(() => mockMiddleware),
    violationTracker: jest.fn(() => mockMiddleware),
    ddosProtectionLimiter: jest.fn(() => mockMiddleware),
    applicationLimiter: jest.fn(() => mockMiddleware),
    criticalEndpointsLimiter: jest.fn(() => mockMiddleware),
    trapEndpointsLimiter: jest.fn(() => mockMiddleware)
};

const mockRouterHub = {
    register: jest.fn(),
    bindHttp: jest.fn((router) => {
        router.get('/test', (req: any, res: any) => res.status(200).send('ok'));
    })
};

// I resolve them via container mock later or just mock the getComponent
jest.mock('../di/container', () => ({
    getComponent: jest.fn((token) => {
        // Ritorno un oggetto vuoto o una funzione middleware a seconda del caso
        if (token && token.name === 'ThreatLogger') return mockThreatLogger;
        if (token && token.name === 'RateLimitMiddleware') return mockRateLimitMiddleware;
        if (token && token.name === 'RouterHub') return mockRouterHub;
        if (token && token.name === 'AuthMiddleware') return { 
            isAuthenticated: jest.fn(() => (req: any, res: any, next: any) => next()),
            isAuthorized: jest.fn(() => (req: any, res: any, next: any) => next()),
            hasRole: jest.fn(() => (req: any, res: any, next: any) => next()),
            isIdentified: jest.fn(() => (req: any, res: any, next: any) => next())
        };
        return (req: any, res: any, next: any) => next(); 
    }),
    container: {
        resolve: jest.fn((token) => {
            if (token && token.name === 'RouterHub') return mockRouterHub;
            return {};
        })
    }
}));

// Impedisci il tentativo di connessione ioredis
beforeAll(() => {
    process.env.REDIS_HOST = '';
});

describe('Endpoint Router Rate Limits', () => {
    let endpointRouter: any;

    beforeAll(() => {
        // Import after mocks are set
        endpointRouter = require('../endpoint').default;
    });

    it('should be defined', () => {
        expect(endpointRouter).toBeDefined();
    });

    it('should have registered all routes', async () => {
        const app = express();
        app.use('/', endpointRouter);

        const response = await request(app).get('/test');
        expect(response.status).toBe(200);
        expect(response.text).toBe('ok');
    });

    it('should have applied violationTracker globally to frontend endpoints', () => {
        expect(mockRateLimitMiddleware.violationTracker).toHaveBeenCalled();
    });

    it('should have applied ddosProtectionLimiter globally to frontend endpoints', () => {
        expect(mockRateLimitMiddleware.ddosProtectionLimiter).toHaveBeenCalled();
    });

    it('should have applied applicationLimiter globally to frontend endpoints', () => {
        expect(mockRateLimitMiddleware.applicationLimiter).toHaveBeenCalled();
    });
});
