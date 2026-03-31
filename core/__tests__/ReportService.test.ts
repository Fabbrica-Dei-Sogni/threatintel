import "reflect-metadata";
import { ReportService } from '../services/ReportService';
import { ThreatLogService } from '../services/ThreatLogService';
import { CowrieService } from '../services/CowrieService';
import { IpDetailsService } from '../services/IpDetailsService';
import { I18nService } from '../services/I18nService';
import { Logger } from 'winston';
import * as ejs from 'ejs';
import puppeteer from 'puppeteer';

// Mock delle dipendenze
jest.mock('ejs');
jest.mock('puppeteer');
jest.mock('../services/ThreatLogService');
jest.mock('../services/CowrieService');
jest.mock('../services/IpDetailsService');
jest.mock('../services/I18nService');

describe('ReportService', () => {
    let reportService: ReportService;
    let mockLogger: Logger;
    let mockThreatLogService: jest.Mocked<ThreatLogService>;
    let mockCowrieService: jest.Mocked<CowrieService>;
    let mockIpDetailsService: jest.Mocked<IpDetailsService>;
    let mockI18nService: jest.Mocked<I18nService>;

    beforeEach(() => {
        mockLogger = { info: jest.fn(), error: jest.fn() } as any;
        mockThreatLogService = new ThreatLogService(mockLogger, {} as any, {} as any, {} as any, {} as any) as any;
        mockCowrieService = new CowrieService(mockLogger, {} as any) as any;
        mockIpDetailsService = new IpDetailsService(mockLogger) as any;
        mockI18nService = { t: jest.fn().mockImplementation((key) => key) } as any;

        reportService = new ReportService(
            mockLogger,
            mockThreatLogService,
            mockCowrieService,
            mockIpDetailsService,
            mockI18nService
        );
    });

    it('dovrebbe generare un report HTML per un attacco IP', async () => {
        const mockAttack = { ipDetails: { country: 'Italy' } };
        const mockLogs = [{ timestamp: new Date(), request: { url: '/', ip: '1.2.3.4' } }];
        
        mockThreatLogService.getAttackDetail.mockResolvedValue(mockAttack as any);
        mockThreatLogService.getLogs.mockResolvedValue(mockLogs as any);
        (ejs.renderFile as jest.Mock).mockResolvedValue('<html>Test Attack</html>');

        const result = await reportService.generateReport('attack', '1.2.3.4', 'html');

        expect(result).toBe('<html>Test Attack</html>');
        expect(mockThreatLogService.getAttackDetail).toHaveBeenCalledWith({ ip: '1.2.3.4' });
    });

    it('dovrebbe generare un report PDF per una sessione Cowrie', async () => {
        const mockSession = { session: 'sess1', src_ip: '1.2.3.4', timestamp: new Date().toISOString() };
        const mockEvents = [{ timestamp: new Date(), eventid: 'cowrie.login.success' }];
        
        mockCowrieService.getSessionDetails.mockResolvedValue(mockSession as any);
        mockCowrieService.getSessionEvents.mockResolvedValue(mockEvents as any);
        (ejs.renderFile as jest.Mock).mockResolvedValue('<html>Test Telnet</html>');

        // Mock Puppeteer
        const mockPage = {
            setContent: jest.fn(),
            pdf: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]))
        };
        const mockBrowser = {
            newPage: jest.fn().mockResolvedValue(mockPage),
            close: jest.fn()
        };
        (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

        const result = await reportService.generateReport('telnet', 'sess1', 'pdf');

        expect(Buffer.isBuffer(result)).toBe(true);
        expect(mockCowrieService.getSessionDetails).toHaveBeenCalledWith('sess1');
        expect(mockPage.pdf).toHaveBeenCalled();
    });

    it('dovrebbe generare un report HTML per i dettagli IP', async () => {
        const mockIpData = { 
            ipDetails: { country: 'Italy', whois: 'Raw Whois' },
            abuseReports: []
        };
        
        mockIpDetailsService.getIpDetails.mockResolvedValue(mockIpData as any);
        (ejs.renderFile as jest.Mock).mockResolvedValue('<html>Test IP</html>');

        const result = await reportService.generateReport('ip', '1.2.3.4', 'html');

        expect(result).toBe('<html>Test IP</html>');
        expect(mockIpDetailsService.getIpDetails).toHaveBeenCalledWith('1.2.3.4');
    });
});
