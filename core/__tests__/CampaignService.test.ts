import 'reflect-metadata';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { CampaignService } from '../services/CampaignService';
import ThreatLog from '../models/ThreatLogSchema';
import * as Tokens from '../di/tokens';
import { setupContainer } from '../di/registry';
import { getComponent, container } from '../di/container';


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

        // Initialize DI
        setupContainer(container);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        await ThreatLog.deleteMany({});
        jest.clearAllMocks();

        // Clear instances
        container.clearInstances();

        const mockEventBus = {
            emit: jest.fn(),
            on: jest.fn(),
            off: jest.fn()
        };

        const mockOllama = {
            getEmbedding: jest.fn().mockResolvedValue([0.1, 0.2]),
            generate: jest.fn().mockResolvedValue('Mock Summary')
        };

        const mockTranslator = {
            buildCampaignSummaryPrompt: jest.fn().mockReturnValue('Mock Prompt')
        };

        const mockConfig = {
            getConfigValue: jest.fn().mockResolvedValue(null)
        };
        
        // Register mocks using Tokens
        container.registerInstance(Tokens.LOGGER_TOKEN, mockLogger);
        container.registerInstance(Tokens.EVENT_BUS_TOKEN, mockEventBus);
        container.registerInstance(Tokens.OLLAMA_SERVICE_TOKEN, mockOllama);
        container.registerInstance(Tokens.RAG_TRANSLATION_TOKEN, mockTranslator);
        container.registerInstance(Tokens.CONFIG_SERVICE_TOKEN, mockConfig);
        
        // ForensicPipelineService is registered as singleton by setupContainer()
        // but it needs ConfigService mock to be registered BEFORE resolution
        
        service = getComponent(Tokens.CAMPAIGN_SERVICE_TOKEN);
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
                { id: '1', request: { ip: '1.1.1.1', url: '/attack' }, fingerprint: { hash, score: 10 }, timestamp: new Date() },
                { id: '2', request: { ip: '2.2.2.2', url: '/attack' }, fingerprint: { hash, score: 10 }, timestamp: new Date() },
                { id: '3', request: { ip: '3.3.3.3', url: '/attack' }, fingerprint: { hash, score: 10 }, timestamp: new Date() },
                { id: '4', request: { ip: '4.4.4.4', url: '/other' }, fingerprint: { hash: 'UNIQUE', score: 10 }, timestamp: new Date() }
            ]);

            const result = await service.getCampaigns({ minIps: 2, minLogsPerIp: 1 });
            const campaigns = result.campaigns;

            expect(campaigns).toHaveLength(1);
            expect(campaigns[0].hash).toBe(hash);
            expect(campaigns[0].ipCount).toBe(3);
        });
    });

    describe('getCampaignDetail (Forensics)', () => {
        it('should aggregate nodes from multiple IPs into a campaign detail object', async () => {
            const hash = 'CAMPAIGN-HASH';

            await ThreatLog.create([
                { id: 'c1', request: { ip: '10.0.0.1', url: '/x' }, fingerprint: { hash, score: 50 }, timestamp: new Date() },
                { id: 'c2', request: { ip: '10.0.0.2', url: '/y' }, fingerprint: { hash, score: 50 }, timestamp: new Date() },
                { id: 'c3', request: { ip: '10.0.0.3', url: '/z' }, fingerprint: { hash: 'OTHER' }, timestamp: new Date() }
            ]);

            const campaign = await service.getCampaignDetail({
                hash,
                minLogsPerIp: 1
            });

            expect(campaign).toBeDefined();
            expect(campaign.hash).toBe(hash);
            expect(campaign.totaleLogs).toBe(2);
            expect(campaign.ipCount).toBe(2);
            
            // Verify enriched nodes
            expect(campaign.nodes).toBeDefined();
            expect(campaign.nodes).toHaveLength(2);
            expect(campaign.nodes[0].ip).toBeDefined();
            expect(campaign.nodes[0].totaleLogs).toBe(1);
        });
    });
});
