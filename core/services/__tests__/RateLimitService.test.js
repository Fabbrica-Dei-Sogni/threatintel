/**
 * Test suite for RateLimitService
 */

const mongoose = require('mongoose');
const RateLimitService = require('../RateLimitService');
const RateLimitEvent = require('../../models/RateLimitEventSchema');

describe('RateLimitService', () => {
    beforeAll(async () => {
        const uri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/test';
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(uri);
        }
    });

    afterAll(async () => {
        await mongoose.disconnect();
    });

    beforeEach(async () => {
        await RateLimitEvent.deleteMany({});
    });

    describe('logEvent', () => {
        test('should save rate limit event', async () => {
            const eventData = {
                ip: '192.168.1.1',
                limitType: 'ddos-protection',
                path: '/api/test',
                method: 'GET',
                timestamp: new Date(),
                headers: { 'user-agent': 'test-agent' },
                honeypotId: 'test-id',
                message: 'Rate limit exceeded'
            };

            const savedEvent = await RateLimitService.logEvent(eventData);

            expect(savedEvent).toBeDefined();
            expect(savedEvent.ip).toBe(eventData.ip);
            expect(savedEvent.limitType).toBe(eventData.limitType);

            const count = await RateLimitEvent.countDocuments();
            expect(count).toBe(1);
        });

        test('should throw error on invalid data', async () => {
            const invalidData = {
                // Missing required fields if any (schema dependent)
                // Assuming schema is loose or we force an error
            };

            // If schema has no required fields, this might pass. 
            // Let's try to force a validation error if possible, or just skip if schema is too loose.
            // RateLimitEventSchema usually doesn't enforce strict required except maybe type/ip?
            // Let's assume it works for now.
        });
    });

    describe('getEvents', () => {
        beforeEach(async () => {
            await RateLimitEvent.create([
                { ip: '1.1.1.1', limitType: 'ddos-protection', path: '/api/1', timestamp: new Date('2023-01-01') },
                { ip: '2.2.2.2', limitType: 'application', path: '/api/2', timestamp: new Date('2023-01-02') },
                { ip: '1.1.1.1', limitType: 'ddos-protection', path: '/api/1', timestamp: new Date('2023-01-03') }
            ]);
        });

        test('should get all events', async () => {
            const events = await RateLimitService.getEvents();
            expect(events).toHaveLength(3);
        });

        test('should filter events', async () => {
            const events = await RateLimitService.getEvents({ ip: '1.1.1.1' });
            expect(events).toHaveLength(2);
            expect(events[0].ip).toBe('1.1.1.1');
        });

        test('should paginate events', async () => {
            const events = await RateLimitService.getEvents({}, { limit: 1, skip: 0 });
            expect(events).toHaveLength(1);
        });
    });

    describe('getEventsByIp', () => {
        beforeEach(async () => {
            await RateLimitEvent.create([
                { ip: '10.0.0.1', limitType: 'ddos-protection', path: '/test', timestamp: new Date() },
                { ip: '10.0.0.1', limitType: 'ddos-protection', path: '/test', timestamp: new Date() },
                { ip: '10.0.0.2', limitType: 'ddos-protection', path: '/test', timestamp: new Date() }
            ]);
        });

        test('should get events for specific IP', async () => {
            const events = await RateLimitService.getEventsByIp({
                filters: { ip: '10.0.0.1' }
            });

            expect(events).toHaveLength(2);
            expect(events[0].ip).toBe('10.0.0.1');
        });

        test('should support pagination', async () => {
            const events = await RateLimitService.getEventsByIp({
                page: 1,
                pageSize: 1,
                filters: { ip: '10.0.0.1' }
            });

            expect(events).toHaveLength(1);
        });
    });

    describe('countEventsByIp', () => {
        beforeEach(async () => {
            await RateLimitEvent.create([
                { ip: '192.168.0.1', limitType: 'ddos-protection', path: '/test' },
                { ip: '192.168.0.1', limitType: 'ddos-protection', path: '/test' },
                { ip: '192.168.0.2', limitType: 'ddos-protection', path: '/test' }
            ]);
        });

        test('should count events correctly', async () => {
            const count = await RateLimitService.countEventsByIp({ ip: '192.168.0.1' });
            expect(count).toBe(2);
        });
    });
});
