import { inject, injectable } from 'tsyringe';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';
import { ThreatLogService } from './ThreatLogService';
import { CowrieService } from './CowrieService';
import path from 'path';
import ejs from 'ejs';
import puppeteer from 'puppeteer';
import { IpDetailsService } from './IpDetailsService';

export type ReportType = 'attack' | 'telnet' | 'ip';

@injectable()
export class ReportService {
    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        private readonly threatLogService: ThreatLogService,
        private readonly cowrieService: CowrieService,
        private readonly ipDetailsService: IpDetailsService
    ) {}

    /**
     * Entry point centralizzato per la generazione dei report
     */
    async generateReport(type: ReportType, id: string, format: 'html' | 'pdf' = 'pdf'): Promise<Buffer | string> {
        this.logger.info(`[ReportService] Generazione report ${type} per ${id} in formato ${format}`);

        let data: any;
        let templateName: string;

        switch (type) {
            case 'attack':
                data = await this.getAttackReportData(id);
                templateName = 'attack-detail.ejs';
                break;
            case 'telnet':
                data = await this.getTelnetReportData(id);
                templateName = 'telnet-detail.ejs';
                break;
            case 'ip':
                data = await this.getIpReportData(id);
                templateName = 'ip-detail.ejs';
                break;
            default:
                throw new Error('Tipo di report non supportato');
        }

        const templatePath = path.join(__dirname, `../templates/reports/${templateName}`);
        
        // Carichiamo il logo dal progetto e lo convertiamo in base64 per incorporarlo nel PDF
        let logoBase64 = '';
        try {
            const logoPath = path.join(__dirname, '../public/assets/intelligence-logo.png');
            const logoBuffer = require('fs').readFileSync(logoPath);
            logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        } catch (e) {
            this.logger.error(`[ReportService] Errore caricamento logo: ${e}`);
        }

        const html = await ejs.renderFile(templatePath, { data, logoBase64 });

        if (format === 'html') return html;

        return await this.convertToPdf(html);
    }

    private async getAttackReportData(ip: string) {
        const attack = await this.threatLogService.getAttackDetail({ ip });
        const logs = await this.threatLogService.getLogs({ filters: { 'request.ip': ip }, pageSize: 100 });

        return {
            title: 'Dossier Dettaglio Attacco HTTP',
            generatedAt: new Date().toLocaleString(),
            ip,
            attack, // Passa l'intero oggetto AttackDTO
            summary: {
                dangerLevel: attack?.dangerLevel || 'LOW',
                dangerScore: attack?.dangerScore || 0,
                totalLogs: attack?.totaleLogs || logs.length,
                duration: attack?.durataAttacco?.human || 'N/D',
                techniques: attack?.attackPatterns || []
            },
            ipInfo: this.normalizeIpDetails(attack?.ipDetails),
            events: logs.map(l => ({
                timestamp: l.timestamp,
                method: l.request?.method || 'N/D',
                url: l.request?.url || 'N/D',
                userAgent: l.request?.userAgent || 'N/D',
                statusCode: l.response?.statusCode || 'N/D',
                score: l.fingerprint?.score || 0,
                headers: l.request?.headers,
                body: l.request?.body
            }))
        };
    }

    private async getTelnetReportData(sessionId: string) {
        const session = await this.cowrieService.getSessionDetails(sessionId);
        if (!session) throw new Error('Sessione Telnet non trovata');
        const events = await this.cowrieService.getSessionEvents(sessionId);

        // Calcolo durata se mancante (starttime/endtime)
        let duration = 'N/D';
        if (session.starttime && session.endtime) {
            const start = new Date(session.starttime).getTime();
            const end = new Date(session.endtime).getTime();
            const diffSeconds = Math.round((end - start) / 1000);
            duration = diffSeconds + 's';
            if (diffSeconds > 60) {
                const mins = Math.floor(diffSeconds / 60);
                const secs = diffSeconds % 60;
                duration = `${mins}m ${secs}s`;
            }
        }

        // Statistiche sessione
        const stats = {
            totalEvents: events.length,
            authAttempts: events.filter((e: any) => (e.eventid || '').includes('login')).length,
            commands: events.filter((e: any) => e.input).length,
            ttyLogs: events.filter((e: any) => e.eventid === 'cowrie.session.closed' && e.ttylog && e.ttylog.length > 0).length
        };

        return {
            title: 'Dossier Investigativo Sessione Telnet/SSH',
            generatedAt: new Date().toLocaleString(),
            sessionId,
            ip: session.src_ip,
            sessionInfo: {
                startTime: session.timestamp ? new Date(session.timestamp).toLocaleString() : 'N/D',
                duration: duration,
                protocol: session.protocol || 'telnet',
                sensor: session.sensor || 'N/D',
                ...stats
            },
            ipInfo: this.normalizeIpDetails(session.ipDetailsId),
            timeline: events.map((e: any) => ({
                timestamp: e.timestamp,
                type: e.eventid || 'generic',
                input: e.input || null,
                username: e.username || null,
                password: e.password || null,
                message: e.message || null,
                src_ip: e.src_ip
            }))
        };
    }

    private async getIpReportData(ip: string) {
        const data = await this.ipDetailsService.getIpDetails(ip);
        const details = data?.ipDetails;
        const abuseDb = details?.abuseipdbId as any;
        
        return {
            title: 'Intelligence Briefing: Investigazione Forense IP',
            generatedAt: new Date().toLocaleString(),
            ip,
            details: this.normalizeIpDetails(details),
            abuse: {
                confidenceScore: abuseDb?.abuseConfidenceScore || 0,
                totalReports: abuseDb?.totalReports || 0,
                lastReportedAt: abuseDb?.lastReportedAt ? new Date(abuseDb.lastReportedAt).toLocaleString() : 'Mai',
                domain: abuseDb?.domain || 'N/D',
                usageType: abuseDb?.usageType || 'N/D',
                isp: abuseDb?.isp || (details as any)?.isp || 'N/D',
                isTor: abuseDb?.isTor || (details as any)?.isTor || false,
                isWhitelisted: abuseDb?.isWhitelisted || (details as any)?.isWhitelisted || false,
                countryCode: abuseDb?.countryCode || (details as any)?.countryCode || '??'
            },
            whois: details?.whois_raw || 'Dati Whois non disponibili',
            abuseReports: (data?.abuseReports || []).map((r: any) => ({
                date: r.reportedAt,
                categories: r.categories || [],
                comment: r.comment || 'Nessun commento'
            }))
        };
    }


    private normalizeIpDetails(details: any) {
        // Estraiamo i dati da ipinfo se presenti (lookups ipinfo.io) o dal root (AbuseIPDB)
        const info = details?.ipinfo || details || {};
        const coordinates = info.loc || (details?.geo?.coordinates ? details.geo.coordinates.join(',') : 'N/D');

        return {
            country: info.country || details?.country || 'Sconosciuto',
            countryCode: info.countryCode || details?.countryCode || '??',
            city: info.city || details?.city || 'N/D',
            isp: info.isp || info.org || details?.isp || 'N/D',
            abuseScore: details?.abuseScore || info.abuseScore || 0,
            usageType: details?.usageType || info.usageType || 'N/D',
            isTor: details?.isTor || info.isTor || false,
            isWhitelisted: details?.isWhitelisted || info.isWhitelisted || false,
            coordinates: coordinates
        };
    }

    private async convertToPdf(html: string): Promise<Buffer> {
        const browser = await puppeteer.launch({ 
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage', 
                '--disable-gpu'
            ] 
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
        });
        await browser.close();
        return Buffer.from(pdf);
    }
}
