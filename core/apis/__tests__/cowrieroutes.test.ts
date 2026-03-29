import express from 'express';
import request from 'supertest';
import cowrieroutes from '../cowrieroutes';

describe('cowrieroutes', () => {
    let app: express.Application;
    let mockLogger: any;
    let mockCowrieController: any;

    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            error: jest.fn()
        };
        mockCowrieController = {
            getSessions: jest.fn((req, res) => res.status(200).json([])),
            searchSessions: jest.fn((req, res) => res.status(200).json([])),
            getSessionEvents: jest.fn((req, res) => res.status(200).json([])),
            getSessionDetails: jest.fn((req, res) => res.status(200).json({}))
        };
        app = express();
        app.use(express.json());
        app.use(cowrieroutes(mockLogger, mockCowrieController));
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
