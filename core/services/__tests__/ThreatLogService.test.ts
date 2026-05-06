import 'reflect-metadata';
import mongoose from 'mongoose';
import { ThreatLogService } from '../ThreatLogService';
import ThreatLog from '../../models/ThreatLogSchema';
import * as Tokens from '../../di/tokens';
import { setupContainer } from '../../di/registry';
import { getComponent, container } from '../../di/container';

describe('ThreatLogService', () => {
    let service: ThreatLogService;
    let mockLogger: any;
    let mockForensicPipelineService: any;
    let mockIpDetailsService: any;
    let mockPatternAnalysisService: any;
    let mockEventBus: any;
    let mockOllama: any;
    let mockTranslator: any;

    beforeAll(async () => {
        const uri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/threatintel_test';
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(uri);
        }
        
        // Initialize DI
        setupContainer(container);
    });

    afterAll(async () => {
        await mongoose.disconnect();
    });

    beforeEach(async () => {
        await ThreatLog.deleteMany({});
        jest.clearAllMocks();

        // Clear instances to force re-resolution with mocks
        container.clearInstances();

        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };

        mockForensicPipelineService = {
            buildStandardPipeline: jest.fn().mockResolvedValue([])
        };

        mockIpDetailsService = {
            isIPExcluded: jest.fn().mockReturnValue(false),
            saveIpDetails: jest.fn().mockResolvedValue(new mongoose.Types.ObjectId())
        };

        mockPatternAnalysisService = {
            analyze: jest.fn().mockReturnValue({
                suspicious: true,
                score: 10,
                indicators: [],
                isBot: false
            }),
            generateFingerprint: jest.fn().mockReturnValue('mock-hash'),
            calculateHash: jest.fn().mockReturnValue('mock-hash'),
            loadConfigFromDB: jest.fn().mockResolvedValue(null)
        };

        mockEventBus = {
            emit: jest.fn(),
            on: jest.fn(),
            off: jest.fn()
        };

        mockOllama = {
            getEmbedding: jest.fn().mockResolvedValue([0.1, 0.2]),
            generate: jest.fn().mockResolvedValue('Mock Summary')
        };

        mockTranslator = {
            buildAttackSummaryPrompt: jest.fn().mockReturnValue('Mock Prompt')
        };

        // Register mocks in the container
        container.registerInstance(Tokens.LOGGER_TOKEN, mockLogger);
        container.registerInstance(Tokens.FORENSIC_PIPELINE_TOKEN, mockForensicPipelineService);
        container.registerInstance(Tokens.IP_DETAILS_SERVICE_TOKEN, mockIpDetailsService);
        container.registerInstance(Tokens.PATTERN_ANALYSIS_SERVICE_TOKEN, mockPatternAnalysisService);
        container.registerInstance(Tokens.EVENT_BUS_TOKEN, mockEventBus);
        container.registerInstance(Tokens.OLLAMA_SERVICE_TOKEN, mockOllama);
        container.registerInstance(Tokens.RAG_TRANSLATION_TOKEN, mockTranslator);

        // Resolve service via Token
        service = getComponent(Tokens.THREAT_LOG_SERVICE_TOKEN);
    });

    describe('saveLog', () => {
        it('should save a log entry successfully', async () => {
            const logEntry = {
                id: 'test-id',
                request: {
                    ip: '1.2.3.4',
                    url: '/test',
                    method: 'GET'
                },
                timestamp: new Date()
            };

            const saved = await service.saveLog(logEntry as any);
            expect(saved).toBeDefined();
            expect(saved?.id).toBe('test-id');
            expect(mockIpDetailsService.saveIpDetails).toHaveBeenCalledWith('1.2.3.4');
        });

        it('should return null if IP is excluded', async () => {
            mockIpDetailsService.isIPExcluded.mockReturnValue(true);
            const logEntry = {
                request: { ip: '127.0.0.1' }
            };

            const result = await service.saveLog(logEntry as any);
            expect(result).toBeNull();
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('escluso'));
        });
    });

    describe('getLogs', () => {
        it('should return paginated logs', async () => {
            await ThreatLog.create([
                { id: '1', request: { ip: '1.1.1.1' }, timestamp: new Date() },
                { id: '2', request: { ip: '2.2.2.2' }, timestamp: new Date() }
            ]);

            const logs = await service.getLogs({ page: 1, pageSize: 1 });
            expect(logs).toHaveLength(1);
        });
    });

    describe('countLogs', () => {
        it('should return total count of logs', async () => {
            await ThreatLog.create([
                { id: '1', request: { ip: '1.1.1.1' }, timestamp: new Date() },
                { id: '2', request: { ip: '2.2.2.2' }, timestamp: new Date() }
            ]);

            const count = await service.countLogs();
            expect(count).toBe(2);
        });
    });

    describe('buildRegExpFilter', () => {
        it('should build regex filter for string values', () => {
            const filters = { 'request.url': '/admin' };
            const mongoFilters = service.buildRegExpFilter(filters);
            expect(mongoFilters['request.url']).toEqual({ $regex: '/admin', $options: 'i' });
        });

        it('should build specific filter for protocol http', () => {
            const filters = { protocol: 'http' };
            const mongoFilters = service.buildRegExpFilter(filters);
            expect(mongoFilters.$or).toEqual([
                { protocol: 'http' },
                { protocol: { $exists: false } },
                { protocol: null }
            ]);
        });

        it('should handle status fallback to active/null', () => {
            // Case 1: status not provided
            const filtersNoStatus = { 'request.ip': '1.1.1.1' };
            const query1 = service.buildRegExpFilter(filtersNoStatus);
            expect(query1.status).toEqual({ $in: [null, 'active'] });

            // Case 2: status explicitely set to active
            const filtersActive = { status: 'active' };
            const query2 = service.buildRegExpFilter(filtersActive);
            expect(query2.status).toEqual({ $in: [null, 'active'] });

            // Case 3: status explicitely set to archived
            const filtersArchived = { status: 'archived' };
            const query3 = service.buildRegExpFilter(filtersArchived);
            expect(query3.status).toBe('archived');
        });

        it('should build multi-word AND filter with $and', () => {
            const filters = { attackPatterns: 'sql injection brute' };
            const mongoFilters = service.buildRegExpFilter(filters, new Set(['attackPatterns']));
            expect(mongoFilters.$and).toEqual([
                { attackPatterns: { $regex: 'sql', $options: 'i' } },
                { attackPatterns: { $regex: 'injection', $options: 'i' } },
                { attackPatterns: { $regex: 'brute', $options: 'i' } }
            ]);
        });
    });

    describe('getStats', () => {
        it('should return stats even if no logs exist', async () => {
            const stats = await service.getStats('24h');
            expect(stats.totalRequests).toBe(0);
            expect(stats.uniqueIPs).toEqual([]);
        });

        it('should return aggregated stats', async () => {
            await ThreatLog.create({
                id: '1',
                request: { ip: '1.2.3.4', country: 'IT' },
                fingerprint: { suspicious: true, score: 50 },
                timestamp: new Date()
            });

            const stats = await service.getStats('24h');
            expect(stats.totalRequests).toBe(1);
            expect(stats.suspiciousRequests).toBe(1);
            expect(stats.uniqueIPs).toContain('1.2.3.4');
        });
    });

    describe('getTopThreats', () => {
        it('should return top suspicious logs', async () => {
            const now = Date.now();
            await ThreatLog.create([
                { id: '1', fingerprint: { suspicious: true, score: 50 }, request: { ip: '1.1.1.1' }, timestamp: new Date(now - 1000) },
                { id: '2', fingerprint: { suspicious: true, score: 90 }, request: { ip: '2.2.2.2' }, timestamp: new Date(now) },
                { id: '3', fingerprint: { suspicious: false, score: 0 }, request: { ip: '3.3.3.3' }, timestamp: new Date(now - 2000) }
            ]);

            const top = await service.getTopThreats(5);
            expect(top).toHaveLength(2);
            expect(top[0].fingerprint.score).toBe(90);
        });
    });

    describe('dryRunAnalyzeLogs', () => {
        it('should perform a dry run analysis', async () => {
            await ThreatLog.create({
                id: '1',
                request: { ip: '1.2.3.4', url: '/test' },
                fingerprint: { suspicious: false, score: 0, indicators: [] },
                timestamp: new Date()
            });

            const result = await service.dryRunAnalyzeLogs('10');
            expect(result.summary.totalSampled).toBe(1);
            expect(result.previews[0].comparison.hasChanges).toBe(true);
        });
    });

    describe('analyzeLogs', () => {
        it('should re-analyze and update logs permanently', async () => {
            // Create a log that is currently not suspicious
            await ThreatLog.create({
                id: 'to-reanalyze',
                request: { ip: '1.2.3.4', url: '/malicious-path' },
                fingerprint: { suspicious: false, score: 0, indicators: [] },
                timestamp: new Date()
            });

            // Mock pattern analyzer to detect it as suspicious now
            mockPatternAnalysisService.analyze.mockReturnValue({
                suspicious: true,
                score: 50,
                indicators: ['RE_ANALYZED'],
                isBot: false
            });

            const { results } = await service.analyzeLogs({ batchSize: 10, updateDatabase: true });
            expect(results.updated).toBe(1);

            const updatedLog = await ThreatLog.findOne({ id: 'to-reanalyze' });
            expect(updatedLog?.fingerprint.suspicious).toBe(true);
            expect(updatedLog?.fingerprint.score).toBe(50);
        });

        it('should handle batch limits in re-analysis', async () => {
            await ThreatLog.create([
                { id: 'l1', request: { ip: '1.1.1.1' }, timestamp: new Date() },
                { id: 'l2', request: { ip: '2.2.2.2' }, timestamp: new Date() }
            ]);

            const { results } = await service.analyzeLogs({ batchSize: 1, updateDatabase: true });
            // Since total is 2 and batchSize is 1, it will run 2 batches (0, 1)
            expect(results.processed).toBe(2);
        });

        it('should handle updateDatabase: false in analyzeLogs', async () => {
            await ThreatLog.create({
                id: 'no-update',
                request: { ip: '1.2.3.4', url: '/malicious-path' },
                fingerprint: { suspicious: false, score: 0, indicators: [] },
                timestamp: new Date()
            });

            mockPatternAnalysisService.analyze.mockReturnValue({
                suspicious: true,
                score: 50,
                indicators: ['RE_ANALYZED'],
                isBot: false
            });

            const { results } = await service.analyzeLogs({ batchSize: 10, updateDatabase: false });
            expect(results.updated).toBe(0);

            const log = await ThreatLog.findOne({ id: 'no-update' });
            expect(log?.fingerprint.suspicious).toBe(false); // Should not have changed
        });

        it('should handle batch errors gracefully', async () => {
            await ThreatLog.create({ id: 'err-log', request: { ip: '1.1.1.1' }, timestamp: new Date() });

            // Mock getLogs to throw on the first call
            const realGetLogs = service.getLogs.bind(service);
            service.getLogs = jest.fn().mockRejectedValueOnce(new Error('Batch Error'));

            const { results } = await service.analyzeLogs({ batchSize: 1, updateDatabase: true });
            expect(results.errors).toBe(1);

            // Restore
            service.getLogs = realGetLogs;
        });
    });

    describe('getLogs (with IP filter)', () => {
        it('should return paginated logs for a specific IP', async () => {
            await ThreatLog.create([
                { id: '1', request: { ip: '1.2.3.4' }, timestamp: new Date() },
                { id: '2', request: { ip: '1.2.3.4' }, timestamp: new Date() },
                { id: '3', request: { ip: '5.5.5.5' }, timestamp: new Date() }
            ]);

            const logs = await service.getLogs({ filters: { 'request.ip': '1.2.3.4' }, page: 1, pageSize: 1 });
            expect(logs).toHaveLength(1);

            const total = await service.countLogs({ 'request.ip': '1.2.3.4' });
            expect(total).toBe(2);
        });
    });

    describe('getLogs (with Hash filter)', () => {
        it('should return logs matching a specific fingerprint hash', async () => {
            await ThreatLog.create([
                { id: 'h1', fingerprint: { hash: 'HASH-A' }, request: { ip: '1.1.1.1' }, timestamp: new Date() },
                { id: 'h2', fingerprint: { hash: 'HASH-B' }, request: { ip: '2.2.2.2' }, timestamp: new Date() },
                { id: 'h3', fingerprint: { hash: 'HASH-A' }, request: { ip: '3.3.3.3' }, timestamp: new Date() }
            ]);

            const logs = await service.getLogs({ filters: { 'fingerprint.hash': 'HASH-A' } });
            expect(logs).toHaveLength(2);
            expect(logs.every(l => l.fingerprint.hash === 'HASH-A')).toBe(true);
        });

        it('should return logs sorted by hash', async () => {
            await ThreatLog.create([
                { id: 's1', fingerprint: { hash: 'CCC' }, request: { ip: '1.1.1.1' }, timestamp: new Date() },
                { id: 's2', fingerprint: { hash: 'AAA' }, request: { ip: '2.2.2.2' }, timestamp: new Date() },
                { id: 's3', fingerprint: { hash: 'BBB' }, request: { ip: '3.3.3.3' }, timestamp: new Date() }
            ]);

            const logs = await service.getLogs({ sortFields: { 'fingerprint.hash': 1 } });
            expect(logs[0].fingerprint.hash).toBe('AAA');
            expect(logs[1].fingerprint.hash).toBe('BBB');
            expect(logs[2].fingerprint.hash).toBe('CCC');
        });
    });
});
