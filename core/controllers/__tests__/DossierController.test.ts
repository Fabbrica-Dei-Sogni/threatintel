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
import { DossierController } from '../DossierController';
import { DossierService } from '../../services/DossierService';
import { AuthMiddleware } from '../../middlewares/AuthMiddleware';
import { RouterHub } from '../../registry/RouterHub';

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

// Mock del DossierService
const mockDossierService = {
    listDossiers: jest.fn(),
    getDossierById: jest.fn(),
    createDossier: jest.fn(),
    updateDossier: jest.fn(),
    deleteDossier: jest.fn(),
    generatePdfFromDossier: jest.fn(),
};

// Mocking container
container.register<DossierService>(DossierService, { useValue: mockDossierService as any });

const app = express();
app.use(express.json());

// Registrazione e bind tramite RouterHub
const hub = container.resolve(RouterHub);
hub.register(DossierController);
hub.bindHttp(app, container);

describe('DossierRoutes API', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('GET /api/dossiers - should list dossiers', async () => {
        mockDossierService.listDossiers.mockResolvedValue([{ title: 'Case #1' }]);
        const response = await request(app).get('/api/dossiers');
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].title).toBe('Case #1');
    });

    it('GET /api/dossiers/:id - should get dossier by id', async () => {
        mockDossierService.getDossierById.mockResolvedValue({ id: '123', title: 'Case #1' });
        const response = await request(app).get('/api/dossiers/123');
        expect(response.status).toBe(200);
        expect(response.body.id).toBe('123');
    });

    it('POST /api/dossiers - should create dossier', async () => {
        const payload = { title: 'New Case', sections: [] };
        mockDossierService.createDossier.mockResolvedValue({ id: 'new-id', ...payload });
        const response = await request(app).post('/api/dossiers').send(payload);
        expect(response.status).toBe(201);
        expect(response.body.id).toBe('new-id');
    });

    it('PATCH /api/dossiers/:id - should update dossier', async () => {
        const payload = { title: 'Updated Case' };
        mockDossierService.updateDossier.mockResolvedValue({ id: '123', ...payload });
        const response = await request(app).patch('/api/dossiers/123').send(payload);
        expect(response.status).toBe(200);
        expect(response.body.title).toBe('Updated Case');
    });

    it('DELETE /api/dossiers/:id - should delete dossier', async () => {
        mockDossierService.deleteDossier.mockResolvedValue(true);
        const response = await request(app).delete('/api/dossiers/123');
        expect(response.status).toBe(204);
    });

});
