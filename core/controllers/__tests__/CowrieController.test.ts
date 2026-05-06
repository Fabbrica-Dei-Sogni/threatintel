import 'reflect-metadata';
import express from 'express';
import request from 'supertest';
import { container, getComponent } from '../../di/container';
import { setupContainer } from '../../di/registry';
import { CowrieController } from '../CowrieController';
import { LOGGER_TOKEN, ROUTER_HUB_TOKEN } from '../../di/tokens';
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

describe('cowrieroutes', () => {
    let app: express.Application;
    let mockLogger: any;
    let mockCowrieController: any;

    beforeEach(() => {
        setupContainer(container);
        container.clearInstances();

        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };
        mockCowrieController = {
            getSessions: jest.fn((req: any, res: any) => res.status(200).json([])),
            searchSessions: jest.fn((req: any, res: any) => res.status(200).json([])),
            getSessionEvents: jest.fn((req: any, res: any) => res.status(200).json([])),
            getSessionDetails: jest.fn((req: any, res: any) => res.status(200).json({}))
        };

        container.registerInstance(CowrieController, mockCowrieController);
        container.registerInstance(LOGGER_TOKEN, mockLogger);

        app = express();
        app.use(express.json());
        
        const hub = getComponent<RouterHub>(ROUTER_HUB_TOKEN);
        hub.register(CowrieController);
        hub.bindHttp(app, container);
    });

    it('GET /api/cowrie/sessions should call getSessions', async () => {
        await request(app).get('/api/cowrie/sessions');
        expect(mockCowrieController.getSessions).toHaveBeenCalled();
    });

    it('POST /api/cowrie/search should call searchSessions', async () => {
        await request(app).post('/api/cowrie/search').send({ query: 'test' });
        expect(mockCowrieController.searchSessions).toHaveBeenCalled();
    });

    it('GET /api/cowrie/sessions/:id/events should call getSessionEvents', async () => {
        await request(app).get('/api/cowrie/sessions/123/events');
        expect(mockCowrieController.getSessionEvents).toHaveBeenCalled();
    });

    it('GET /api/cowrie/sessions/:id should call getSessionDetails', async () => {
        await request(app).get('/api/cowrie/sessions/123');
        expect(mockCowrieController.getSessionDetails).toHaveBeenCalled();
    });
});
