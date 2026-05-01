import 'reflect-metadata';
import { RagSyncService } from '../RagSyncService';
import { RagTranslationService } from '../RagTranslationService';
import { QdrantClientService } from '../QdrantClientService';
import { OllamaService } from '../OllamaService';
import { Logger } from 'winston';
import { stringToUuid } from '../../../utils/uuid';

describe('RagSyncService', () => {
    let ragSyncService: RagSyncService;
    let mockLogger: jest.Mocked<Logger>;
    let mockTranslator: jest.Mocked<RagTranslationService>;
    let mockQdrant: jest.Mocked<QdrantClientService>;
    let mockOllama: jest.Mocked<OllamaService>;

    beforeEach(async () => {
        jest.useFakeTimers();
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

        // Inizializza per rendere il servizio operativo
        await ragSyncService.initialize();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should correctly sync a ThreatLog', async () => {
        const mockLog = {
            _id: { toString: () => 'mongo-id-123' },
            id: 'log-123',
            timestamp: new Date('2026-05-01T15:00:00Z'),
            request: { ip: '1.2.3.4' },
            fingerprint: { score: 75 }
        } as any;

        await ragSyncService.syncThreatLog(mockLog);
        
        // Poiché ora c'è il batching, dobbiamo forzare il flush o aspettare
        await (ragSyncService as any).flushLogBuffer();

        // Verifica che la traduzione sia stata chiamata
        expect(mockTranslator.translateThreatLog).toHaveBeenCalledWith(mockLog);
        
        // Verifica che l'embedding sia stato richiesto per la narrativa prodotta
        expect(mockOllama.getEmbedding).toHaveBeenCalledWith('Narrativa di test log');

        // Verifica l'upsert su Qdrant (nella collection corretta)
        expect(mockQdrant.upsertPoints).toHaveBeenCalledWith(
            'threat_logs',
            expect.arrayContaining([
                expect.objectContaining({
                    id: stringToUuid('mongo-id-123'),
                    vector: [0.1, 0.2, 0.3],
                    payload: expect.objectContaining({
                        type: 'threat_log',
                        ip: '1.2.3.4',
                        score: 75,
                        mongoId: 'mongo-id-123'
                    })
                })
            ])
        );
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
        expect(mockQdrant.upsertPoints).toHaveBeenCalledWith(
            'threat_intelligence',
            expect.arrayContaining([
                expect.objectContaining({
                    id: stringToUuid('ip-id-456'),
                    payload: expect.objectContaining({
                        type: 'ip_details',
                        ip: '8.8.8.8',
                        mongoId: 'ip-id-456'
                    })
                })
            ])
        );
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

        expect(mockQdrant.upsertPoints).toHaveBeenCalledWith(
            'threat_intelligence',
            expect.arrayContaining([
                expect.objectContaining({
                    id: stringToUuid('campaign-campaign-hash-789'),
                    vector: vector,
                    payload: expect.objectContaining({
                        type: 'campaign_summary',
                        campaignId: 'campaign-hash-789',
                        text: aiSummary
                    })
                })
            ])
        );
    });

    it('should handle errors gracefully during sync', async () => {
        const mockLog = { 
            _id: { toString: () => 'id' }, 
            request: { ip: '1.1.1.1' },
            fingerprint: { score: 10 } // Deve passare il filtro
        } as any;
        
        // Prepariamo l'errore per il flush
        mockOllama.getEmbedding.mockRejectedValueOnce(new Error('Ollama Down'));
        
        await ragSyncService.syncThreatLog(mockLog);
        await (ragSyncService as any).flushLogBuffer();

        // Dovrebbe aver loggato l'errore senza crashare il processo
        expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining('[RagSync] Failed to flush log buffer: Ollama Down')
        );
    });

    it('should skip operations if not operational', async () => {
        mockOllama.checkHealth.mockResolvedValueOnce(false);
        const degradedService = new RagSyncService(mockLogger, mockTranslator, mockQdrant, mockOllama);
        await degradedService.initialize();

        expect(degradedService.getStatus().operational).toBe(false);

        await degradedService.syncThreatLog({} as any);

        expect(mockTranslator.translateThreatLog).not.toHaveBeenCalled();
    });
});
