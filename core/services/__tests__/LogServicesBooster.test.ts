import 'reflect-metadata';
import { SshLogService } from '../SshLogService';
import { NginxLogService } from '../NginxLogService';
import { ThreatLogService } from '../ThreatLogService';

import { Logger } from 'winston';
import { ServiceStatus } from '../../types/lifecycle';
import * as Tokens from '../../di/tokens';
import { setupContainer } from '../../di/registry';
import { getComponent, container } from '../../di/container';



describe('LogServices Booster - Coverage Expansion', () => {
    let mockLogger: jest.Mocked<Logger>;
    let mockThreatLogService: jest.Mocked<ThreatLogService>;
    let mockPatternAnalysisService: any;
    let mockAppConfigProvider: any;
    let mockThreatLogFactory: any;

    beforeEach(() => {
        // Initialize DI
        setupContainer(container);
        
        container.clearInstances();
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        } as any;

        mockThreatLogService = {
            saveLog: jest.fn().mockResolvedValue({}),
            countLogs: jest.fn().mockResolvedValue(0),
            getLogs: jest.fn().mockResolvedValue([]),
        } as any;

        mockPatternAnalysisService = {
            analyze: jest.fn().mockReturnValue({ score: 0, indicators: [], suspicious: false }),
            getGeoLocation: jest.fn().mockReturnValue({}),
        };

        mockAppConfigProvider = {
            getDynamicConfig: jest.fn().mockResolvedValue(null),
            getNginxSuspiciousPatterns: jest.fn().mockResolvedValue([]),
        };

        mockThreatLogFactory = {
            createLog: jest.fn().mockImplementation((p) => ({
                id: p.id || 'test-id',
                timestamp: p.timestamp || new Date(),
                protocol: p.protocol,
                request: { ip: p.ip, method: (p.method || 'GET').toUpperCase(), url: p.url, userAgent: p.userAgent },
                fingerprint: { score: p.score || 0, hash: 'test-hash' },
                metadata: p.metadata || {}
            }))
        };

        // Register mocks using Tokens
        container.registerInstance(Tokens.LOGGER_TOKEN, mockLogger);
        container.registerInstance(Tokens.THREAT_LOG_SERVICE_TOKEN, mockThreatLogService);
        container.registerInstance(Tokens.PATTERN_ANALYSIS_SERVICE_TOKEN, mockPatternAnalysisService);
        container.registerInstance(Tokens.CONFIG_PROVIDER_TOKEN, mockAppConfigProvider);
        container.registerInstance(Tokens.THREAT_LOG_FACTORY_TOKEN, mockThreatLogFactory);
    });

    describe('SshLogService Catch Blocks', () => {
        it('should handle loadConfig errors', async () => {
            mockAppConfigProvider.getDynamicConfig.mockRejectedValue(new Error('DB Error'));
            const service = getComponent(Tokens.SSH_LOG_SERVICE_TOKEN) as SshLogService;
            await (service as any).initialized;
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Errore caricamento configurazioni'));
        });

        it('should handle start errors', async () => {
            const service = getComponent(Tokens.SSH_LOG_SERVICE_TOKEN) as SshLogService;
            // Mock spawn to throw immediately
            require('child_process').spawn;
            jest.mock('child_process', () => ({
                spawn: jest.fn().mockImplementation(() => { throw new Error('Spawn Error'); })
            }));

            try {
                await service.start();
            } catch (e) {
                expect(service.getStatus()).toBe(ServiceStatus.FAILED);
                expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Errore critico durante lo startup'));
            }
            jest.unmock('child_process');
        });

        it('should handle analyzeSshLogs errors', async () => {
            const service = getComponent(Tokens.SSH_LOG_SERVICE_TOKEN) as SshLogService;
            mockThreatLogService.countLogs.mockRejectedValue(new Error('Count Error'));
            await expect(service.analyzeSshLogs()).rejects.toThrow('Count Error');
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Errore durante il ricalcolo score SSH'), expect.any(Error));
        });

        it('should handle saveAsThreatLog errors', async () => {
            const service = getComponent(Tokens.SSH_LOG_SERVICE_TOKEN) as SshLogService;
            mockThreatLogService.saveLog.mockRejectedValue(new Error('Save Error'));
            const entry = { ip: '1.2.3.4', user: 'user', type: 'Failed', score: 10, indicators: [], logDate: new Date() };
            await (service as any).saveAsThreatLog(entry, 'msg');
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Errore salvataggio log SSH'), expect.any(Error));
        });
    });

    describe('NginxLogService Catch Blocks', () => {
        it('should handle saveAsThreatLog errors', async () => {
            const service = getComponent(Tokens.NGINX_LOG_SERVICE_TOKEN) as NginxLogService;
            mockThreatLogService.saveLog.mockRejectedValue(new Error('Save Error'));
            const data = { ip: '1.2.3.4', method: 'GET', url: '/test', user_agent: 'ua', referer: '', timestamp: new Date().toISOString() };
            await (service as any).saveAsThreatLog(data);
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Errore salvataggio ThreatLog'), expect.any(Error));
        });

        it('should handle processEntry invalid substrings', async () => {
            const service = getComponent(Tokens.NGINX_LOG_SERVICE_TOKEN) as NginxLogService;
            // Case where indexOf('{') is -1
            await (service as any).processEntry({ MESSAGE: 'nginx_threat: invalid message' });
            expect(mockThreatLogService.saveLog).not.toHaveBeenCalled();
            
            // Case where JSON.parse fails
            await (service as any).processEntry({ MESSAGE: 'nginx_threat: {invalid json}' });
            expect(mockThreatLogService.saveLog).not.toHaveBeenCalled();
        });
    });
});
