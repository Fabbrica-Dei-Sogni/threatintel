import 'reflect-metadata';
import { container } from 'tsyringe';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { CampaignService } from '../services/CampaignService';
import ThreatLog from '../models/ThreatLogSchema';
import { LOGGER_TOKEN } from '../di/tokens';

// Mock Logger
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
};

describe('CampaignService', () => {
    let mongoServer: MongoMemoryServer;
    let service: CampaignService;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create({
            binary: {
                version: '7.0.14',
            },
        });
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);

        container.registerInstance(LOGGER_TOKEN, mockLogger);
        service = container.resolve(CampaignService);
    });


    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        await ThreatLog.deleteMany({});
    });

    describe('getCampaigns (Discovery)', () => {
        it('should identify a distributed campaign shared by multiple IPs', async () => {
            const hash = 'DISTRIBUTED-PATTERN-1';

            // Create logs from 3 different IPs with the same hash
            await ThreatLog.create([
                { id: '1', request: { ip: '1.1.1.1', url: '/attack' }, fingerprint: { hash }, timestamp: new Date() },
                { id: '2', request: { ip: '2.2.2.2', url: '/attack' }, fingerprint: { hash }, timestamp: new Date() },
                { id: '3', request: { ip: '3.3.3.3', url: '/attack' }, fingerprint: { hash }, timestamp: new Date() },
                { id: '4', request: { ip: '4.4.4.4', url: '/other' }, fingerprint: { hash: 'UNIQUE' }, timestamp: new Date() }
            ]);

            const campaigns = await service.getCampaigns({ minIps: 2 });

            expect(campaigns).toHaveLength(1);
            expect(campaigns[0].hash).toBe(hash);
            expect(campaigns[0].ipCount).toBe(3);
            expect(campaigns[0].ips).toContain('1.1.1.1');
            expect(campaigns[0].ips).toContain('2.2.2.2');
            expect(campaigns[0].ips).toContain('3.3.3.3');
        });
    });

    describe('getCampaignDetail (Forensics)', () => {
        it('should aggregate logs from multiple IPs into a single campaign object', async () => {
            const hash = 'CAMPAIGN-HASH';

            await ThreatLog.create([
                { id: 'c1', request: { ip: '10.0.0.1', url: '/x' }, fingerprint: { hash, score: 50 }, timestamp: new Date() },
                { id: 'c2', request: { ip: '10.0.0.2', url: '/y' }, fingerprint: { hash, score: 50 }, timestamp: new Date() },
                { id: 'c3', request: { ip: '10.0.0.3', url: '/z' }, fingerprint: { hash: 'OTHER' }, timestamp: new Date() }
            ]);

            const campaign = await service.getCampaignDetail({
                hash,
                ips: ['10.0.0.1', '10.0.0.2'],
                minLogsForAttack: 1
            });

            expect(campaign).toBeDefined();
            expect(campaign._id).toBe(hash);
            expect(campaign.totaleLogs).toBe(2);
            // Verify it used the Forensic Pipeline (check some fields added by stages)
            expect(campaign.logsRaggruppati).toBeDefined();
            expect(campaign.logsRaggruppati).toHaveLength(2);
        });
    });
});
