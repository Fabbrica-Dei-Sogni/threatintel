// Impostiamo la variabile d'ambiente PRIMA di qualsiasi importazione
process.env.COMMON_ENDPOINTS = '/wp-login.php,/administrator';

import 'reflect-metadata';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { FakeLoginController } from '../../controllers/FakeLoginController';
import { RateLimitMiddleware } from '../../rateLimitMiddleware';
import fakeRoutes from '../routes'; // Il file si chiama routes.ts
import { LOGGER_TOKEN } from '../../di/tokens';
import { Logger } from 'winston';
import path from 'path';

// Mock del RateLimitMiddleware
const mockRateLimitMiddleware = {
    violationTracker: () => (req: Request, res: Response, next: NextFunction) => next(),
    ddosProtectionLimiter: () => (req: Request, res: Response, next: NextFunction) => next(),
    applicationLimiter: () => (req: Request, res: Response, next: NextFunction) => next(),
    criticalEndpointsLimiter: () => (req: Request, res: Response, next: NextFunction) => next(),
    trapEndpointsLimiter: () => (req: Request, res: Response, next: NextFunction) => next(),
};

const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
} as unknown as Logger;

// Mocking tsyringe container prima di ogni test per garantire l'isolamento
beforeAll(() => {
    container.register<RateLimitMiddleware>(RateLimitMiddleware, { useValue: mockRateLimitMiddleware as any });
    container.register<Logger>(LOGGER_TOKEN, { useValue: mockLogger });
});


const fakeLoginController = new FakeLoginController(mockLogger);

// Setup Express app
const app = express();
app.use(fakeRoutes(mockLogger, fakeLoginController, mockRateLimitMiddleware as any));


describe('Fake Login Routes (routes.ts)', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('GET / should serve the fake login page', async () => {
        const response = await request(app).get('/');
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/html');
    });

    // Aumentiamo il timeout per questo test specifico
    it('POST /login should serve the fake result page after a delay', async () => {
        const response = await request(app).post('/login');
        expect(response.status).toBe(401);
        expect(response.headers['content-type']).toContain('text/html');
    }, 15000);

    it('GET /wp-login.php should hit the trap endpoint', async () => {
        const response = await request(app).get('/wp-login.php');
        expect(response.status).toBe(418);
        expect(response.text).toBe('Ai ai ai... siamo nei guai... ta ta dan!');
    });

    it('GET /administrator should hit the trap endpoint', async () => {
        const response = await request(app).get('/administrator');
        expect(response.status).toBe(418);
        expect(response.text).toBe('Ai ai ai... siamo nei guai... ta ta dan!');
    });

    it('GET /unknown-route should be handled by the catch-all handler', async () => {
        const response = await request(app).get('/some/random/path');
        expect(response.status).toBe(418);
        expect(response.text).toBe('Non mettere le mani nella marmellata');
    });

    it('should handle server errors with the error handler', async () => {
        // Forziamo un errore mockando path.join per lanciare un'eccezione
        const joinSpy = jest.spyOn(path, 'join').mockImplementation(() => {
            throw new Error('Forced file system error');
        });

        const response = await request(app).get('/');
        expect(response.status).toBe(500);
        expect(response.text).toBe('Errore interno del server');
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Internal Server Error:'), expect.any(Error));

        joinSpy.mockRestore(); // Ripristiniamo la funzione originale
    });
});
