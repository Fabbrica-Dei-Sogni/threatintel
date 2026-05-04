import "reflect-metadata";
import { IDossierSection } from '../models/DossierSchema';
import { ReportService } from '../services/ReportService';
import { ThreatLogService } from '../services/ThreatLogService';
import { AttackLogService } from '../services/AttackLogService';
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
jest.mock('../services/AttackLogService');
jest.mock('../services/CowrieService');
jest.mock('../services/IpDetailsService');
jest.mock('../services/I18nService');

describe('ReportService', () => {
    let reportService: ReportService;
    let mockLogger: Logger;
    let mockThreatLogService: jest.Mocked<ThreatLogService>;
    let mockAttackLogService: jest.Mocked<AttackLogService>;
    let mockCowrieService: jest.Mocked<CowrieService>;
    let mockIpDetailsService: jest.Mocked<IpDetailsService>;
    let mockI18nService: jest.Mocked<I18nService>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockLogger = { info: jest.fn(), error: jest.fn() } as any;
        const mockRagSync = {} as any;
        const mockOllama = {} as any;
        const mockTranslator = {} as any;
        const mockConfigService = { getConfigValue: jest.fn().mockResolvedValue(null) } as any;

        mockThreatLogService = new ThreatLogService(
            mockLogger,
            {} as any,
            {} as any,
            {} as any
        ) as any;
        mockAttackLogService = new AttackLogService(
            mockLogger,
            {} as any,
            {} as any
        ) as any;
        mockCowrieService = new CowrieService(mockLogger, {} as any) as any;
        mockIpDetailsService = new IpDetailsService(mockLogger, mockRagSync) as any;

        mockI18nService = {
            t: jest.fn().mockImplementation((key) => key),
            tm: jest.fn()
        } as any;

        reportService = new ReportService(
            mockLogger,
            mockThreatLogService,
            mockAttackLogService,
            mockCowrieService,
            mockIpDetailsService,
            mockI18nService
        );
    });

    it('dovrebbe generare un report HTML per un attacco IP', async () => {
        const mockAttack = { ipDetails: { country: 'Italy' } };
        const mockLogs = [{ timestamp: new Date(), request: { url: '/', ip: '1.2.3.4' } }];

        mockAttackLogService.getAttackDetail.mockResolvedValue(mockAttack as any);
        mockThreatLogService.getLogs.mockResolvedValue(mockLogs as any);
        (ejs.renderFile as jest.Mock).mockResolvedValue('<html>Test Attack</html>');

        const result = await reportService.generateDetailReport('attack', '1.2.3.4', 'html');

        expect(result).toBe('<html>Test Attack</html>');
        expect(mockAttackLogService.getAttackDetail).toHaveBeenCalledWith({ ip: '1.2.3.4' });
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

        const result = await reportService.generateDetailReport('telnet', 'sess1', 'pdf');

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

        const result = await reportService.generateDetailReport('ip', '1.2.3.4', 'html');

        expect(result).toBe('<html>Test IP</html>');
        expect(mockIpDetailsService.getIpDetails).toHaveBeenCalledWith({ ip: '1.2.3.4' });
    });

    it('dovrebbe supportare stili diversi (hud, telex) nella generazione report dettaglio', async () => {
        const mockIpData = { ipDetails: { country: 'Italy' }, abuseReports: [] };
        mockIpDetailsService.getIpDetails.mockResolvedValue(mockIpData as any);
        (ejs.renderFile as jest.Mock).mockResolvedValue('<html>Styled Report</html>');

        await reportService.generateDetailReport('ip', '1.2.3.4', 'html', 'it-IT', 'hud');
        expect(ejs.renderFile).toHaveBeenCalledWith(expect.stringContaining('ip-hud.ejs'), expect.anything());

        await reportService.generateDetailReport('ip', '1.2.3.4', 'html', 'it-IT', 'telex');
        expect(ejs.renderFile).toHaveBeenCalledWith(expect.stringContaining('ip-telex.ejs'), expect.anything());
    });

    it('dovrebbe generare un dossier personalizzato (custom) con più sezioni', async () => {
        const mockSections: IDossierSection[] = [
            { templateKey: 'clipboard.ipDetails.geo', data: { ip: '1.1.1.1' }, type: 'ip', order: 0, timestamp: new Date() },
            { templateKey: 'clipboard.telnetDetail.summary', data: { sessionId: 'abc' }, type: 'telnet', order: 1, timestamp: new Date() }
        ];

        mockI18nService.tm.mockImplementation((key) => {
            if (key === 'clipboard.ipDetails.geo') return ['IP: {ip}'];
            if (key === 'clipboard.telnetDetail.summary') return ['SESS: {sessionId}'];
            return null;
        });

        (ejs.renderFile as jest.Mock).mockResolvedValue('<html>Custom Dossier</html>');

        const result = await reportService.generateTelexReport(mockSections, 'it-IT', 'html');

        expect(result).toBe('<html>Custom Dossier</html>');
        expect(mockI18nService.tm).toHaveBeenCalledWith('clipboard.ipDetails.geo', 'it-IT');
        expect(mockI18nService.tm).toHaveBeenCalledWith('clipboard.telnetDetail.summary', 'it-IT');

        // Verifica che ejs sia chiamato con le sezioni arricchite (renderedText popolato)
        const ejsArgs = (ejs.renderFile as jest.Mock).mock.calls[0][1];
        expect(ejsArgs.sections[0].renderedText).toBe('IP: 1.1.1.1');
        expect(ejsArgs.sections[1].renderedText).toBe('SESS: abc');
    });

    it('dovrebbe generare un dossier Classic con sezione Rate Breach mappata correttamente', async () => {
        const mockSections: IDossierSection[] = [
            {
                templateKey: 'clipboard.attackDetail.rateLimitEvent',
                data: { ip: '1.2.3.4', limitType: 'ddos-protection' },
                type: 'rate_breach',
                order: 0,
                timestamp: new Date()
            }
        ];

        mockI18nService.tm.mockImplementation((key) => {
            if (key === 'clipboard.attackDetail.rateLimitEvent') return ['IP: {ip}', 'Limit: {limitType}'];
            return null;
        });

        (ejs.renderFile as jest.Mock).mockResolvedValue('<html>Classic Dossier Rate Breach</html>');

        await reportService.generateClassicReport(mockSections, 'it-IT', 'html');

        expect(ejs.renderFile).toHaveBeenCalledWith(
            expect.stringContaining('classic-dossier.ejs'),
            expect.objectContaining({
                sections: expect.arrayContaining([
                    expect.objectContaining({
                        templateKey: 'clipboard.attackDetail.rateLimitEvent',
                        renderedText: 'IP: 1.2.3.4\nLimit: ddos-protection'
                    })
                ])
            })
        );
    });

    it('dovrebbe generare un dossier Classic con timeline Telnet mappata correttamente', async () => {
        const mockSections: IDossierSection[] = [
            { templateKey: 'clipboard.telnetDetail.timelineHeader', data: { sessionId: 'telnet-123' }, type: 'telnet', order: 0, timestamp: new Date() },
            { templateKey: 'clipboard.telnetDetail.timelineRow', data: { message: 'login success' }, type: 'telnet', order: 1, timestamp: new Date() }
        ];

        (ejs.renderFile as jest.Mock).mockResolvedValue('<html>Classic Dossier</html>');

        await reportService.generateClassicReport(mockSections, 'it-IT', 'html');

        // Verifica che ejs sia chiamato con il path corretto per il template Classic
        expect(ejs.renderFile).toHaveBeenCalledWith(
            expect.stringContaining('classic-dossier.ejs'),
            expect.objectContaining({
                sections: expect.arrayContaining([
                    expect.objectContaining({ templateKey: 'clipboard.telnetDetail.timelineHeader' }),
                    expect.objectContaining({ templateKey: 'clipboard.telnetDetail.timelineRow' })
                ])
            })
        );
    });
});
