import 'reflect-metadata';
import { RagSyncService } from '../RagSyncService';
import { RagTranslationService } from '../RagTranslationService';
import { QdrantClientService } from '../QdrantClientService';
import { OllamaService } from '../OllamaService';
import { Logger } from 'winston';

describe('RagSyncService', () => {
    let ragSyncService: RagSyncService;
    let mockLogger: jest.Mocked<Logger>;
    let mockTranslator: jest.Mocked<RagTranslationService>;
    let mockQdrant: jest.Mocked<QdrantClientService>;
    let mockOllama: jest.Mocked<OllamaService>;

    beforeEach(() => {
        // Setup Mocks
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        } as any;

        mockTranslator = {
            translateThreatLog: jest.fn().mockReturnValue('Narrativa di test log'),
            translateIpDetails: jest.fn().mockReturnValue('Narrativa di test IP'),
            buildCampaignSummaryPrompt: jest.fn().mockReturnValue('Prompt campagna'),
            buildAttackSummaryPrompt: jest.fn().mockReturnValue('Prompt attacco')
        } as any;

        mockQdrant = {
            upsertPoints: jest.fn().mockResolvedValue(true),
            initializeCollection: jest.fn().mockResolvedValue(true),
            search: jest.fn()
        } as any;

        mockOllama = {
            getEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
            generate: jest.fn().mockResolvedValue('Sommario AI generato'),
            checkHealth: jest.fn().mockResolvedValue(true)
        } as any;

        ragSyncService = new RagSyncService(
            mockLogger,
            mockTranslator,
            mockQdrant,
            mockOllama
        );
    });

    it('should correctly sync a ThreatLog', async () => {
        const mockLog = {
            _id: { toString: () => 'mongo-id-123' },
            id: 'log-123',
            timestamp: new Date(),
            request: { ip: '1.2.3.4' },
            fingerprint: { score: 75 }
        } as any;

        await ragSyncService.syncThreatLog(mockLog);

        // Verifica che la traduzione sia stata chiamata
        expect(mockTranslator.translateThreatLog).toHaveBeenCalledWith(mockLog);
        
        // Verifica che l'embedding sia stato richiesto per la narrativa prodotta
        expect(mockOllama.getEmbedding).toHaveBeenCalledWith('Narrativa di test log');

        // Verifica l'upsert su Qdrant
        expect(mockQdrant.upsertPoints).toHaveBeenCalledWith([
            expect.objectContaining({
                id: 'mongo-id-123',
                vector: [0.1, 0.2, 0.3],
                payload: expect.objectContaining({
                    type: 'threat_log',
                    ip: '1.2.3.4',
                    score: 75
                })
            })
        ]);
    });

    it('should correctly sync IpDetails', async () => {
        const mockIpDetails = {
            _id: { toString: () => 'ip-id-456' },
            ip: '8.8.8.8',
            lastSeenAt: new Date()
        } as any;

        await ragSyncService.syncIpDetails(mockIpDetails, null, []);

        expect(mockTranslator.translateIpDetails).toHaveBeenCalled();
        expect(mockOllama.getEmbedding).toHaveBeenCalled();
        expect(mockQdrant.upsertPoints).toHaveBeenCalledWith([
            expect.objectContaining({
                id: 'ip-id-456',
                payload: expect.objectContaining({
                    type: 'ip_details',
                    ip: '8.8.8.8'
                })
            })
        ]);
    });

    it('should correctly sync a Campaign Summary', async () => {
        const mockCampaign = {
            hash: 'campaign-hash-789',
            ipCount: 5,
            topIps: ['1.1.1.1'],
            protocols: ['ssh']
        };
        const vector = [0.9, 0.8, 0.7];
        const aiSummary = 'Attacco coordinato rilevato.';

        await ragSyncService.syncCampaignSummary(mockCampaign, aiSummary, vector);

        expect(mockQdrant.upsertPoints).toHaveBeenCalledWith([
            expect.objectContaining({
                id: 'campaign-campaign-hash-789',
                vector: vector,
                payload: expect.objectContaining({
                    type: 'campaign_summary',
                    campaignId: 'campaign-hash-789',
                    text: aiSummary
                })
            })
        ]);
    });

    it('should handle errors gracefully during sync', async () => {
        mockOllama.getEmbedding.mockRejectedValueOnce(new Error('Ollama Down'));
        
        const mockLog = { _id: { toString: () => 'id' }, request: {} } as any;
        
        await ragSyncService.syncThreatLog(mockLog);

        // Dovrebbe aver loggato l'errore senza crashare il processo
        expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining('Error syncing ThreatLog: Error: Ollama Down')
        );
    });
});
