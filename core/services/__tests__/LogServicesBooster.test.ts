import 'reflect-metadata';
import { container } from 'tsyringe';
import { SshLogService } from '../SshLogService';
import { NginxLogService } from '../NginxLogService';
import { ThreatLogService } from '../ThreatLogService';
import PatternAnalysisService from '../PatternAnalysisService';
import { ConfigService } from '../ConfigService';
import { Logger } from 'winston';
import { ServiceStatus } from '../../types/lifecycle';
import { LOGGER_TOKEN } from '../../di/tokens';

describe('LogServices Booster - Coverage Expansion', () => {
    let mockLogger: jest.Mocked<Logger>;
    let mockThreatLogService: jest.Mocked<ThreatLogService>;
    let mockPatternAnalysisService: jest.Mocked<PatternAnalysisService>;
    let mockConfigService: jest.Mocked<ConfigService>;

    beforeEach(() => {
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
        } as any;

        mockConfigService = {
            getConfigValue: jest.fn().mockResolvedValue(null),
        } as any;

        container.registerInstance(LOGGER_TOKEN, mockLogger);
        container.registerInstance(ThreatLogService, mockThreatLogService);
        container.registerInstance(PatternAnalysisService, mockPatternAnalysisService);
        container.registerInstance(ConfigService, mockConfigService);
    });

    describe('SshLogService Catch Blocks', () => {
        it('should handle loadConfigFromDB errors', async () => {
            mockConfigService.getConfigValue.mockRejectedValue(new Error('DB Error'));
            const service = container.resolve(SshLogService);
            await (service as any).initialized;
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Errore caricamento configurazioni'));
        });

        it('should handle start errors', async () => {
            const service = container.resolve(SshLogService);
            // Mock spawn to throw immediately
            const spawn = require('child_process').spawn;
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
            const service = container.resolve(SshLogService);
            mockThreatLogService.countLogs.mockRejectedValue(new Error('Count Error'));
            await expect(service.analyzeSshLogs()).rejects.toThrow('Count Error');
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Errore durante il ricalcolo score SSH'), expect.any(Error));
        });

        it('should handle saveAsThreatLog errors', async () => {
            const service = container.resolve(SshLogService);
            mockThreatLogService.saveLog.mockRejectedValue(new Error('Save Error'));
            await (service as any).saveAsThreatLog('1.2.3.4', 'user', 'Failed', 'msg', 10, []);
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Errore nel salvataggio del log SSH'), expect.any(Error));
        });
    });

    describe('NginxLogService Catch Blocks', () => {
        it('should handle saveAsThreatLog errors', async () => {
            const service = container.resolve(NginxLogService);
            mockThreatLogService.saveLog.mockRejectedValue(new Error('Save Error'));
            const data = { ip: '1.2.3.4', method: 'GET', url: '/test', user_agent: 'ua', referer: '', timestamp: new Date().toISOString() };
            await (service as any).saveAsThreatLog(data);
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Errore salvataggio ThreatLog'), expect.any(Error));
        });

        it('should handle processEntry invalid substrings', async () => {
            const service = container.resolve(NginxLogService);
            // Case where indexOf('{') is -1
            await (service as any).processEntry({ MESSAGE: 'nginx_threat: invalid message' });
            expect(mockThreatLogService.saveLog).not.toHaveBeenCalled();
            
            // Case where JSON.parse fails
            await (service as any).processEntry({ MESSAGE: 'nginx_threat: {invalid json}' });
            expect(mockThreatLogService.saveLog).not.toHaveBeenCalled();
        });
    });
});
