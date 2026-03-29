import 'reflect-metadata';
import { container } from 'tsyringe';
import mongoose from 'mongoose';
import { RateLimitService } from '../RateLimitService';
import RateLimitEvent from '../../models/RateLimitEventSchema';

describe('RateLimitService', () => {
    let service: RateLimitService;

    beforeAll(async () => {
        const uri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/threatintel_test';
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(uri);
        }
    });

    afterAll(async () => {
        await mongoose.disconnect();
    });

    beforeEach(async () => {
        await RateLimitEvent.deleteMany({});
        container.clearInstances();
        service = container.resolve(RateLimitService);
    });

    describe('logEvent', () => {
        it('should save a rate limit event', async () => {
            const eventData = {
                ip: '1.2.3.4',
                limitType: 'ddos-protection',
                path: '/test',
                method: 'GET',
                timestamp: new Date()
            };

            const saved = await service.logEvent(eventData);
            expect(saved).toBeDefined();
            expect(saved.ip).toBe('1.2.3.4');
            
            const count = await RateLimitEvent.countDocuments();
            expect(count).toBe(1);
        });

        it('should throw error if event data is invalid', async () => {
            const invalidData = { ip: null }; // ip is required in schema
            await expect(service.logEvent(invalidData)).rejects.toThrow();
        });
    });

    describe('getEvents', () => {
        it('should return a list of events', async () => {
            await RateLimitEvent.create([
                { ip: '1.1.1.1', limitType: 'ddos-protection', path: '/p1', method: 'GET', timestamp: new Date() },
                { ip: '2.2.2.2', limitType: 'application', path: '/p2', method: 'POST', timestamp: new Date() }
            ]);

            const events = await service.getEvents();
            expect(events).toHaveLength(2);
        });

        it('should apply filters and options', async () => {
            await RateLimitEvent.create([
                { ip: '1.1.1.1', limitType: 'ddos-protection', path: '/p1', method: 'GET', timestamp: new Date() },
                { ip: '2.2.2.2', limitType: 'application', path: '/p2', method: 'POST', timestamp: new Date() }
            ]);

            const filtered = await service.getEvents({ limitType: 'ddos-protection' });
            expect(filtered).toHaveLength(1);
            expect(filtered[0].ip).toBe('1.1.1.1');
        });
    });

    describe('getEventsByIp', () => {
        it('should return paginated events for an IP', async () => {
            await RateLimitEvent.create([
                { ip: '1.2.3.4', limitType: 'ddos-protection', path: '/p1', method: 'GET', timestamp: new Date() },
                { ip: '1.2.3.4', limitType: 'application', path: '/p2', method: 'GET', timestamp: new Date() },
                { ip: '1.2.3.4', limitType: 'critical-endpoints', path: '/p3', method: 'GET', timestamp: new Date() }
            ]);

            const result = await service.getEventsByIp({ page: 1, pageSize: 2, filters: { ip: '1.2.3.4' } });
            expect(result).toHaveLength(2);
        });
    });

    describe('countEventsByIp', () => {
        it('should return the total count of events for an IP', async () => {
            await RateLimitEvent.create([
                { ip: '1.1.1.1', limitType: 'ddos-protection', path: '/p1', method: 'GET', timestamp: new Date() },
                { ip: '1.1.1.1', limitType: 'application', path: '/p2', method: 'GET', timestamp: new Date() },
                { ip: '2.2.2.2', limitType: 'ddos-protection', path: '/p1', method: 'GET', timestamp: new Date() }
            ]);

            const count = await service.countEventsByIp({ ip: '1.1.1.1' });
            expect(count).toBe(2);
        });
    });
});
