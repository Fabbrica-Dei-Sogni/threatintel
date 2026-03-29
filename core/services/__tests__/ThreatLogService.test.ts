import 'reflect-metadata';
import { container } from 'tsyringe';
import mongoose from 'mongoose';
import { ThreatLogService } from '../ThreatLogService';
import ThreatLog from '../../models/ThreatLogSchema';
import { ForensicService } from '../forense/ForensicService';
import { ForensicPipelineService } from '../forense/ForensicPipelineService';
import { IpDetailsService } from '../IpDetailsService';
import PatternAnalysisService from '../PatternAnalysisService';
import { LOGGER_TOKEN } from '../../di/tokens';

describe('ThreatLogService', () => {
    let service: ThreatLogService;
    let mockLogger: any;
    let mockForensicService: any;
    let mockForensicPipelineService: any;
    let mockIpDetailsService: any;
    let mockPatternAnalysisService: any;

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
        await ThreatLog.deleteMany({});

        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };

        mockForensicService = {
            buildAttackGroupsBasePipeline: jest.fn()
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
            loadConfigFromDB: jest.fn().mockResolvedValue(null)
        };

        container.clearInstances();
        container.registerInstance(LOGGER_TOKEN, mockLogger);
        container.registerInstance(ForensicService, mockForensicService);
        container.registerInstance(ForensicPipelineService, mockForensicPipelineService);
        container.registerInstance(IpDetailsService, mockIpDetailsService);
        container.registerInstance(PatternAnalysisService, mockPatternAnalysisService);

        service = container.resolve(ThreatLogService);
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
                fingerprint: { suspicious: true },
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
            await ThreatLog.create([
                { id: '1', fingerprint: { suspicious: true, score: 50 }, request: { ip: '1.1.1.1' }, timestamp: new Date() },
                { id: '2', fingerprint: { suspicious: true, score: 90 }, request: { ip: '2.2.2.2' }, timestamp: new Date() },
                { id: '3', fingerprint: { suspicious: false, score: 0 }, request: { ip: '3.3.3.3' }, timestamp: new Date() }
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
});
