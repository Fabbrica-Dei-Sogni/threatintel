/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
// Impostiamo la variabile d'ambiente PRIMA di qualsiasi importazione
process.env.COMMON_ENDPOINTS = '/wp-login.php,/administrator';

import 'reflect-metadata';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { FakeLoginController } from '../FakeLoginController';
import { RateLimitMiddleware } from '../../rateLimitMiddleware';
import { RouterHub } from '../../registry/RouterHub';
import { AuthMiddleware } from '../../middlewares/AuthMiddleware';
import { Logger } from 'winston';
import { LOGGER_TOKEN } from '../../di/tokens';
import path from 'path';

// Mock AuthMiddleware
jest.mock('../../middlewares/AuthMiddleware', () => {
    return {
        AuthMiddleware: jest.fn().mockImplementation(() => {
            return {
                isAuthenticated: jest.fn().mockReturnValue((req: any, res: any, next: any) => {
                    req.user = { username: 'testuser', roles: [{ name: 'admin' }] };
                    next();
                }),
                isIdentified: jest.fn().mockReturnValue((req: any, res: any, next: any) => {
                    req.user = { username: 'testuser', roles: [{ name: 'admin' }] };
                    next();
                }),
                hasRole: jest.fn().mockReturnValue((req: any, res: any, next: any) => {
                    req.user = { username: 'testuser', roles: [{ name: 'admin' }] };
                    next();
                }),
            };
        })
    };
});

// Mock RateLimitMiddleware
jest.mock('../../rateLimitMiddleware', () => {
    const bypass = (req: any, res: any, next: any) => next();
    return {
        RateLimitMiddleware: jest.fn().mockImplementation(() => {
            return {
                violationTracker: jest.fn(() => bypass),
                ddosProtectionLimiter: jest.fn(() => bypass),
                applicationLimiter: jest.fn(() => bypass),
                criticalEndpointsLimiter: jest.fn(() => bypass),
                trapEndpointsLimiter: jest.fn(() => bypass),
            };
        })
    };
});

const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
} as unknown as Logger;

let app: express.Application;

// Mocking tsyringe container prima di ogni test per garantire l'isolamento
beforeAll(() => {
    container.clearInstances();
    container.register<Logger>(LOGGER_TOKEN, { useValue: mockLogger });

    // Setup Express app
    app = express();
    app.use(express.json());

    // Registrazione e bind tramite RouterHub
    const hub = container.resolve(RouterHub);
    hub.register(FakeLoginController);
    hub.bindHttp(app, container);
});

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
        // Usiamo un mock temporaneo per assicurarci che l'errore venga propagato
        const joinSpy = jest.spyOn(path, 'join').mockImplementation(() => {
            throw new Error('Forced file system error');
        });

        const response = await request(app).get('/');
        
        expect(response.status).toBe(500);
        expect(response.text).toBe('Errore interno del server');
        
        // Verifichiamo che il logger sia stato chiamato
        // Nota: se fallisce ancora, potrebbe essere un problema di istanza del controller
        // ma dato che il testo coincide con quello dell'handler, l'handler è stato chiamato.
        expect(mockLogger.error).toHaveBeenCalled();
        
        joinSpy.mockRestore(); 
    });
});
