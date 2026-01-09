
import 'reflect-metadata';
import { SshLogService } from '../services/SshLogService';
import { ConfigService } from '../services/ConfigService';
import { ThreatLogService } from '../services/ThreatLogService';
import PatternAnalysisService from '../services/PatternAnalysisService';
import { Logger } from 'winston';

describe('SshLogService', () => {
    let service: SshLogService;
    let mockLogger: jest.Mocked<Logger>;
    let mockThreatLogService: jest.Mocked<ThreatLogService>;
    let mockPatternAnalysisService: jest.Mocked<PatternAnalysisService>;
    let mockConfigService: jest.Mocked<ConfigService>;

    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        } as any;

        mockThreatLogService = {
            saveLog: jest.fn(),
        } as any;

        mockPatternAnalysisService = {
            getGeoLocation: jest.fn().mockReturnValue({ country: 'US' }),
        } as any;

        mockConfigService = {
            getConfigValue: jest.fn(),
        } as any;

        service = new SshLogService(
            mockLogger,
            mockThreatLogService,
            mockPatternAnalysisService,
            mockConfigService
        );
    });

    it('should load configuration scores correctly', async () => {
        mockConfigService.getConfigValue.mockImplementation((key: string) => {
            if (key === 'SSH_FAILED_PASSWORD') return Promise.resolve('50');
            if (key === 'SSH_INVALID_USER') return Promise.resolve('100');
            return Promise.resolve(null);
        });

        await service.loadConfigFromDB();

        // We can't access private properties directly, but we can verify usage in processEntry
        // Or we can cast to any to verify internal state if needed for this specific test
        expect((service as any).failedPasswordScore).toBe(50);
        expect((service as any).invalidUserScore).toBe(100);
    });

    it('should use default scores if config is missing', async () => {
        mockConfigService.getConfigValue.mockResolvedValue(null);

        await service.loadConfigFromDB();

        expect((service as any).failedPasswordScore).toBe(15);
        expect((service as any).invalidUserScore).toBe(25);
    });

    it('should use updated scores in processEntry', async () => {
        (service as any).failedPasswordScore = 50;

        const entry = {
            MESSAGE: 'Failed password for root from 192.168.1.1 port 22 ssh2',
            __CURSOR: 'cursor123'
        };

        await (service as any).processEntry(entry);

        expect(mockThreatLogService.saveLog).toHaveBeenCalledWith(expect.objectContaining({
            fingerprint: expect.objectContaining({
                score: 50
            })
        }));
    });

    it('should recalculate scores for existing logs', async () => {
        // Setup scores
        (service as any).failedPasswordScore = 150;

        // Mock getLogs to return one log
        const mockLog = {
            id: 'test-log-id',
            request: {
                headers: {
                    'ssh-event': 'Failed'
                }
            },
            fingerprint: {
                score: 15,
                suspicious: true,
                indicators: ['SSH_FAILED_PASSWORD']
            }
        };

        mockThreatLogService.countLogs = jest.fn().mockResolvedValue(1);
        mockThreatLogService.getLogs = jest.fn().mockResolvedValue([mockLog]);

        // Execute
        const result = await service.analyzeSshLogs(100);

        // Verify
        expect(result.updated).toBe(1);
        expect(mockThreatLogService.saveLog).toHaveBeenCalledWith(expect.objectContaining({
            fingerprint: expect.objectContaining({
                score: 150,
                suspicious: true,
                indicators: ['SSH_FAILED_PASSWORD']
            })
        }));
    });

    it('should use __REALTIME_TIMESTAMP for log timestamp if available', async () => {
        (service as any).failedPasswordScore = 50;

        const entry = {
            MESSAGE: 'Failed password for root from 192.168.1.1 port 22 ssh2',
            __CURSOR: 'cursor123',
            __REALTIME_TIMESTAMP: '1767962508879405' // Microseconds
        };

        const expectedTimestamp = new Date(1767962508879); // Milliseconds

        await (service as any).processEntry(entry);

        expect(mockThreatLogService.saveLog).toHaveBeenCalledWith(expect.objectContaining({
            timestamp: expectedTimestamp
        }));
    });
});
