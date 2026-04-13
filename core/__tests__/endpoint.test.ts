import 'reflect-metadata';
import { container } from 'tsyringe';
import express from 'express';
import request from 'supertest';

// Mocks for all controllers and middlewares
const mockMiddleware = (req: any, res: any, next: any) => next();
const mockRouter = express.Router();
mockRouter.get('/test', (req, res) => res.status(200).send('ok'));

// Mocking the route factories
jest.mock('../apis/threatroutes', () => jest.fn(() => mockRouter));
jest.mock('../apis/reportroutes', () => jest.fn(() => mockRouter));
jest.mock('../apis/ratelimitroutes', () => jest.fn(() => mockRouter));
jest.mock('../apis/configroutes', () => jest.fn(() => mockRouter));
jest.mock('../apis/cowrieroutes', () => jest.fn(() => mockRouter));
jest.mock('../apis/dossierroutes', () => jest.fn(() => mockRouter));
jest.mock('../apis/managelimitroutes', () => jest.fn(() => mockRouter));
jest.mock('../apis/routes', () => jest.fn(() => mockRouter));

// Mocking logging and DI container
jest.mock('../../logger', () => ({ logger: { info: jest.fn() } }));

// Mocking ThreatLogger and RateLimitMiddleware
const mockThreatLogger = { middleware: jest.fn(() => mockMiddleware) };
const mockRateLimitMiddleware = { 
    handle: jest.fn(() => mockMiddleware),
    violationTracker: jest.fn(() => mockMiddleware),
    ddosProtectionLimiter: jest.fn(() => mockMiddleware),
    applicationLimiter: jest.fn(() => mockMiddleware)
};

// I resolve them via container mock later or just mock the getComponent
jest.mock('../di/container', () => ({
    getComponent: jest.fn((token) => {
        // Ritorno un oggetto vuoto o una funzione middleware a seconda del caso
        if (token && token.name === 'ThreatLogger') return mockThreatLogger;
        if (token && token.name === 'RateLimitMiddleware') return mockRateLimitMiddleware;
        return (req: any, res: any, next: any) => next(); 
    })
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
