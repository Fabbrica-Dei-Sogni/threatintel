import 'reflect-metadata';
import { AssistantService } from '../AssistantService';
import { RagValidator } from '../RagValidator';
import { Logger } from 'winston';

describe('AssistantService', () => {
    let service: AssistantService;
    let mockLogger: jest.Mocked<Logger>;
    let mockQdrant: any;
    let mockOllama: any;
    let mockRagSync: any;
    let mockI18n: any;
    let mockThreatLog: any;
    let mockCampaign: any;
    let mockIpDetails: any;

    beforeEach(() => {
        mockLogger = { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() } as any;
        mockQdrant = { search: jest.fn() };
        mockOllama = { getEmbedding: jest.fn(), generate: jest.fn() };
        mockRagSync = { getStatus: jest.fn().mockReturnValue({ 
            operational: true, 
            intelligenceCollection: 'intel', 
            logsCollection: 'logs' 
        }) };
        mockI18n = { t: jest.fn().mockImplementation(k => k) };
        mockThreatLog = { getLogById: jest.fn(), getAttackDetail: jest.fn() };
        mockCampaign = { getCampaignDetail: jest.fn() };
        mockIpDetails = { getIpDetails: jest.fn() };

        service = new AssistantService(
            mockLogger,
            mockQdrant,
            mockOllama,
            mockRagSync,
            mockI18n,
            mockThreatLog,
            mockCampaign,
            mockIpDetails
        );
    });

    describe('search', () => {
        it('should perform semantic search and map results correctly', async () => {
            const query = 'test query';
            mockOllama.getEmbedding.mockResolvedValue([0.1, 0.2]);
            mockQdrant.search.mockResolvedValue([
                { 
                    id: 'point-1', 
                    score: 0.9, 
                    payload: { text: 'test text', sourceRef: { params: { type: 'log', id: '1' } } } 
                },
                {
                    id: 'point-legacy',
                    score: 0.8,
                    payload: { text: 'missing sourceRef' } // Should be skipped by validation
                }
            ]);

            const results = await service.search(query, { limit: 5 });

            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('point-1');
            expect(results[0].text).toBe('test text');
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Malformed or legacy payload'));
        });

        it('should throw if RAG is not operational', async () => {
            mockRagSync.getStatus.mockReturnValue({ operational: false });
            await expect(service.search('query')).rejects.toThrow('errors.rag.notOperational');
        });

        it('should throw if validation fails', async () => {
            await expect(service.search('query', { limit: 100 })).rejects.toThrow('limite');
        });
    });

    describe('ask', () => {
        it('should generate a response using search context', async () => {
            const question = 'How many attacks?';
            const hits = [{ text: '5 attacks detected', sourceRef: {} }];
            
            // Mock search via spy or by mocking dependencies
            mockOllama.getEmbedding.mockResolvedValue([0.1]);
            mockQdrant.search.mockResolvedValue([{ id: '1', score: 0.9, payload: hits[0] }]);
            mockOllama.generate.mockResolvedValue('The answer is 5.');

            const response = await service.ask(question);

            expect(response.answer).toBe('The answer is 5.');
            expect(response.sources).toHaveLength(1);
            expect(mockOllama.generate).toHaveBeenCalledWith(expect.stringContaining('5 attacks detected'));
        });
    });

    describe('resolveSource', () => {
        it('should resolve a log source correctly', async () => {
            const ref = { params: { type: 'log', id: 'log123' } } as any;
            mockThreatLog.getLogById.mockResolvedValue({ _id: 'log123', data: 'technical' });

            const result = await service.resolveSource(ref);

            expect(result._id).toBe('log123');
            expect(mockThreatLog.getLogById).toHaveBeenCalledWith({ type: 'log', id: 'log123' });
        });

        it('should resolve a campaign source correctly', async () => {
            const ref = { 
                params: { 
                    type: 'campaign', 
                    hash: 'abc', 
                    minScore: 10, 
                    timeConfig: { mode: 'ago' } 
                } 
            } as any;
            mockCampaign.getCampaignDetail.mockResolvedValue({ hash: 'abc' });

            await service.resolveSource(ref);

            expect(mockCampaign.getCampaignDetail).toHaveBeenCalledWith(expect.objectContaining({ hash: 'abc', minScore: 10 }));
        });

        it('should throw if validator fails', async () => {
            const invalidRef = { params: { type: 'log' } } as any; // missing id
            await expect(service.resolveSource(invalidRef)).rejects.toThrow('ID mancante');
        });
    });
});
