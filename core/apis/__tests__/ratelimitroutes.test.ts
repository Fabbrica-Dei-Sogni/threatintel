import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import { container } from 'tsyringe';
import { RateLimitController } from '../../controllers/RateLimitController';
import { RateLimitService } from '../../services/RateLimitService';
import rateLimitRoutes from '../ratelimitroutes';
import { LOGGER_TOKEN } from '../../di/tokens';
import { Logger } from 'winston';

const mockRateLimitService = {
    getEventsByIp: jest.fn(),
    countEventsByIp: jest.fn(),
};

const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
} as unknown as Logger;

container.register(RateLimitService, { useValue: mockRateLimitService as any });
container.register(LOGGER_TOKEN, { useValue: mockLogger });

const rateLimitController = container.resolve(RateLimitController);

const app = express();
app.use(express.json());
app.use('/', rateLimitRoutes(rateLimitController));

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
