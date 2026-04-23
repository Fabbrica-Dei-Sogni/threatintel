import 'reflect-metadata';
import { container } from 'tsyringe';
import mongoose from 'mongoose';
import { ThreatLogService } from '../ThreatLogService';
import ThreatLog from '../../models/ThreatLogSchema';
import { LOGGER_TOKEN } from '../../di/tokens';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('Distributed Anomaly Analysis Integration Tests', () => {
    let service: ThreatLogService;

    beforeAll(async () => {
        const uri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/threatintel_test';
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(uri);
        }

        // Registra le dipendenze necessarie per il container
        container.registerInstance(LOGGER_TOKEN, {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        } as any);

        service = container.resolve(ThreatLogService);
    });

    afterAll(async () => {
        await mongoose.disconnect();
    });

    beforeEach(async () => {
        await ThreatLog.deleteMany({});
    });

    describe('getDistributedCampaigns (Discovery Engine)', () => {
        it('should discover hashes shared by multiple IPs', async () => {
            // Setup: 2 IPs with same hash, 1 IP with unique hash
            await ThreatLog.create([
                { id: '1', request: { ip: '1.1.1.1' }, fingerprint: { hash: 'SHARED-PATTERN' }, timestamp: new Date() },
                { id: '2', request: { ip: '2.2.2.2' }, fingerprint: { hash: 'SHARED-PATTERN' }, timestamp: new Date() },
                { id: '3', request: { ip: '3.3.3.3' }, fingerprint: { hash: 'UNIQUE-PATTERN' }, timestamp: new Date() }
            ]);

            const campaigns = await service.getDistributedCampaigns({ minIps: 2 });
            
            expect(campaigns).toHaveLength(1);
            expect(campaigns[0].hash).toBe('SHARED-PATTERN');
            expect(campaigns[0].ips).toContain('1.1.1.1');
            expect(campaigns[0].ips).toContain('2.2.2.2');
            expect(campaigns[0].ipCount).toBe(2);
        });

        it('should respect time range in discovery', async () => {
            const now = new Date();
            const old = new Date(now.getTime() - 1000 * 60 * 60 * 48); // 48h ago

            await ThreatLog.create([
                { id: 'recent-1', request: { ip: '1.1.1.1' }, fingerprint: { hash: 'H1' }, timestamp: now },
                { id: 'recent-2', request: { ip: '2.2.2.2' }, fingerprint: { hash: 'H1' }, timestamp: now },
                { id: 'old-1', request: { ip: '3.3.3.3' }, fingerprint: { hash: 'H1' }, timestamp: old }
            ]);

            // Only recent ones
            const recentOnly = await service.getDistributedCampaigns({ 
                timeConfig: { startTime: new Date(now.getTime() - 1000 * 60 * 60).toISOString() } 
            });
            expect(recentOnly[0].ipCount).toBe(2);
            expect(recentOnly[0].ips).not.toContain('3.3.3.3');
        });
    });

    describe('Distributed Forensic Pipeline', () => {
        it('should aggregate multiple IPs into a single attack when grouping by hash', async () => {
            // Setup: 3 IPs performing the same attack pattern
            await ThreatLog.create([
                { id: 'a1', request: { ip: '1.1.1.1' }, fingerprint: { hash: 'H1', score: 50 }, timestamp: new Date() },
                { id: 'a2', request: { ip: '2.2.2.2' }, fingerprint: { hash: 'H1', score: 50 }, timestamp: new Date() },
                { id: 'a3', request: { ip: '3.3.3.3' }, fingerprint: { hash: 'H1', score: 50 }, timestamp: new Date() },
                { id: 'a4', request: { ip: '1.1.1.1' }, fingerprint: { hash: 'H1', score: 50 }, timestamp: new Date() }
            ]);

            // Case A: Standard grouping (by IP)
            const standard = await service.getAttacks({ 
                filters: { 'fingerprint.hash': 'H1' },
                groupBy: 'request.ip',
                minLogsForAttack: 1
            });
            // Should return 3 separate attacks (one for each IP)
            expect(standard.items).toHaveLength(3);

            // Case B: Distributed grouping (by Hash)
            const distributed = await service.getAttacks({
                filters: { 'fingerprint.hash': 'H1' },
                groupBy: 'fingerprint.hash',
                minLogsForAttack: 1
            });
            // Should return ONLY 1 aggregated attack
            expect(distributed.items).toHaveLength(1);
            expect(distributed.items[0]._id).toBe('H1');
            expect(distributed.items[0].totaleLogs).toBe(4); // All 4 logs
        });

        it('should work with $in IP filter', async () => {
            await ThreatLog.create([
                { id: 'x1', request: { ip: '10.0.0.1' }, fingerprint: { hash: 'H1' }, timestamp: new Date() },
                { id: 'x2', request: { ip: '10.0.0.2' }, fingerprint: { hash: 'H1' }, timestamp: new Date() },
                { id: 'x3', request: { ip: '10.0.0.3' }, fingerprint: { hash: 'H1' }, timestamp: new Date() }
            ]);

            // Filter for only 2 of the 3 IPs
            const results = await service.getAttacks({
                filters: { 'request.ip': { $in: ['10.0.0.1', '10.0.0.2'] } },
                groupBy: 'fingerprint.hash',
                minLogsForAttack: 1
            });

            expect(results.items[0].totaleLogs).toBe(2);
            // Verify IP 10.0.0.3 was excluded
            // We can check this if we had a list of IPs in the response, 
            // but for now, the count being 2 is a strong indicator.
        });
    });

    describe('Legacy Compatibility', () => {
        it('should maintain default IP grouping for existing calls', async () => {
            await ThreatLog.create([
                { id: 'l1', request: { ip: '9.9.9.9' }, timestamp: new Date() },
                { id: 'l2', request: { ip: '9.9.9.9' }, timestamp: new Date() }
            ]);

            const result = await service.getAttacks({ minLogsForAttack: 1 });
            expect(result.items[0]._id).toBe('9.9.9.9');
        });
    });
});
