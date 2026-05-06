import 'reflect-metadata';
import { getComponent, container } from '../../di/container';
import { setupContainer } from '../../di/registry';
import { NginxLogService } from '../NginxLogService';
import { 
    LOGGER_TOKEN, 
    NGINX_LOG_SERVICE_TOKEN,
    THREAT_LOG_SERVICE_TOKEN,
    PATTERN_ANALYSIS_SERVICE_TOKEN,
    CONFIG_PROVIDER_TOKEN,
    THREAT_LOG_FACTORY_TOKEN
} from '../../di/tokens';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Mock child_process
jest.mock('child_process', () => ({
    spawn: jest.fn()
}));

describe('NginxLogService', () => {
    let service: NginxLogService;
    let mockLogger: any;
    let mockThreatLogService: any;
    let mockPatternAnalysisService: any;
    let mockAppConfigProvider: any;
    let mockThreatLogFactory: any;

    beforeEach(() => {
        setupContainer(container);
        container.clearInstances();

        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };

        mockThreatLogService = {
            saveLog: jest.fn().mockResolvedValue({})
        };

        mockPatternAnalysisService = {
            analyze: jest.fn().mockReturnValue({
                suspicious: true,
                score: 10,
                indicators: ['test'],
                isBot: false
            }),
            getGeoLocation: jest.fn().mockReturnValue({ country: 'IT' })
        };
        
        mockAppConfigProvider = {
            getNginxSuspiciousPatterns: jest.fn().mockResolvedValue(['/test-endpoint', '/malicious']),
            getDynamicConfig: jest.fn().mockResolvedValue(null)
        };

        mockThreatLogFactory = {
            createLog: jest.fn().mockImplementation((p) => ({
                protocol: p.protocol,
                request: { ip: p.ip, method: p.method, url: p.url, userAgent: p.userAgent },
                fingerprint: { score: p.score },
                timestamp: p.timestamp || new Date()
            }))
        };

        process.env.COMMON_ENDPOINTS = '/test-endpoint,/malicious';

        container.registerInstance(LOGGER_TOKEN, mockLogger);
        container.registerInstance(THREAT_LOG_SERVICE_TOKEN, mockThreatLogService);
        container.registerInstance(PATTERN_ANALYSIS_SERVICE_TOKEN, mockPatternAnalysisService);
        container.registerInstance(CONFIG_PROVIDER_TOKEN, mockAppConfigProvider);
        container.registerInstance(THREAT_LOG_FACTORY_TOKEN, mockThreatLogFactory);

        service = getComponent(NGINX_LOG_SERVICE_TOKEN);
    });

    describe('buildSuspiciousPatterns', () => {
        it('should include patterns from COMMON_ENDPOINTS', async () => {
            (service as any).suspiciousPatterns = await (service as any).buildSuspiciousPatterns();
            const patterns = (service as any).suspiciousPatterns;
            const hasTestEndpoint = patterns.some((p: RegExp) => p.test('/test-endpoint'));
            const hasMalicious = patterns.some((p: RegExp) => p.test('/malicious'));
            
            expect(hasTestEndpoint).toBe(true);
            expect(hasMalicious).toBe(true);
        });
    });

    describe('isSuspicious', () => {
        it('should return true for suspicious URLs', async () => {
            (service as any).suspiciousPatterns = await (service as any).buildSuspiciousPatterns();
            expect((service as any).isSuspicious('/admin')).toBe(true);
            expect((service as any).isSuspicious('/etc/passwd')).toBe(true);
            expect((service as any).isSuspicious('/test-endpoint')).toBe(true);
        });

        it('should return false for normal URLs', () => {
            expect((service as any).isSuspicious('/index.html')).toBe(false);
            expect((service as any).isSuspicious('/assets/logo.png')).toBe(false);
        });
    });

    describe('processEntry', () => {
        it('should ignore entries without nginx_threat marker', async () => {
            const entry = { MESSAGE: 'some normal message' };
            await (service as any).processEntry(entry);
            expect(mockThreatLogService.saveLog).not.toHaveBeenCalled();
        });

        it('should ignore entries with non-suspicious URLs', async () => {
            const entry = { 
                MESSAGE: 'nginx_threat: {"url": "/safe", "ip": "1.1.1.1", "method": "GET"}' 
            };
            await (service as any).processEntry(entry);
            expect(mockThreatLogService.saveLog).not.toHaveBeenCalled();
        });

        it('should process and save suspicious entries', async () => {
            const entry = { 
                MESSAGE: 'nginx_threat: {"url": "/admin", "ip": "1.2.3.4", "method": "POST", "user_agent": "evil", "timestamp": "2023-01-01T00:00:00Z"}',
                __CURSOR: 'test-cursor'
            };
            await (service as any).processEntry(entry);
            
            expect(mockThreatLogService.saveLog).toHaveBeenCalledWith(expect.objectContaining({
                protocol: 'https',
                request: expect.objectContaining({
                    ip: '1.2.3.4',
                    url: '/admin'
                })
            }));
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('🛡️ HTTPS sospetto'));
        });
    });

    describe('start/stop', () => {
        it('should start journalctl process', async () => {
            const mockProcess = {
                stdout: new EventEmitter(),
                stderr: new EventEmitter(),
                on: jest.fn(),
                kill: jest.fn()
            };
            (spawn as jest.Mock).mockReturnValue(mockProcess);

            // Mock backfillLogs to avoid waiting
            jest.spyOn(service as any, 'backfillLogs').mockResolvedValue(undefined);

            await service.start();
            
            expect(spawn).toHaveBeenCalledWith('journalctl', expect.arrayContaining(['-f']));
            expect((service as any).journalProcess).toBe(mockProcess);
        });

        it('should stop journalctl process', () => {
            const mockProcess = { kill: jest.fn() };
            (service as any).journalProcess = mockProcess;
            
            service.stop();
            
            expect(mockProcess.kill).toHaveBeenCalled();
            expect((service as any).journalProcess).toBeNull();
        });
    });
});
