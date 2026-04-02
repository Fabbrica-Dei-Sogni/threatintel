import { inject, injectable } from 'tsyringe';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';
import { ThreatLogService } from './ThreatLogService';
import { CowrieService } from './CowrieService';
import path from 'path';
import ejs from 'ejs';
import puppeteer from 'puppeteer';
import { IpDetailsService } from './IpDetailsService';
import { I18nService } from './I18nService';
import fs from 'fs';
import { IDossierSection } from '../models/DossierSchema';

export type ReportType = 'attack' | 'telnet' | 'ip';

@injectable()
export class ReportService {
    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        private readonly threatLogService: ThreatLogService,
        private readonly cowrieService: CowrieService,
        private readonly ipDetailsService: IpDetailsService,
        private readonly i18n: I18nService
    ) {}

    /**
     * Entry point centralizzato per la generazione dei report
     */
    async generateDetailReport(type: ReportType, id: string, format: 'html' | 'pdf' = 'pdf', locale: string = 'it-IT', style: 'classic' | 'hud' | 'telex' = 'classic'): Promise<Buffer | string> {
        this.logger.info(`[ReportDetailService] Generazione report ${type} per ${id} in formato ${format} [${locale}] - Stile: ${style}`);

        let data: any;
        let templateBase: string;

        switch (type) {
            case 'attack':
                data = await this.getAttackReportData(id, locale);
                templateBase = 'attack';
                break;
            case 'telnet':
                data = await this.getTelnetReportData(id, locale);
                templateBase = 'telnet';
                break;
            case 'ip':
                data = await this.getIpReportData(id, locale);
                templateBase = 'ip';
                break;
            default:
                throw new Error('Tipo di report non supportato');
        }

        const templateName = `${templateBase}-${style}.ejs`;
        const templatePath = path.join(__dirname, `../templates/reports/details/${templateName}`);
        
        // Carichiamo il logo dal progetto e lo convertiamo in base64 per incorporarlo nel PDF
        let logoBase64 = '';
        try {
            const logoPath = path.join(__dirname, '../public/assets/intelligence-logo.png');
            const logoBuffer = require('fs').readFileSync(logoPath);
            logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        } catch (e) {
            this.logger.error(`[ReportService] Errore caricamento logo: ${e}`);
        }

        const t = (key: string, params?: any) => this.i18n.t(key, locale, params);
        const html = await ejs.renderFile(templatePath, { data, logoBase64, t, locale });

        if (format === 'html') return html;

        return await this.convertToPdf(html);
    }

    
    async generateCommonReport(templatePath: string,sections: IDossierSection[], locale: string, format: 'html' | 'pdf' = 'pdf', isTelex: boolean = false): Promise<Buffer | string> { 
        
        let logoBase64 = '';
        try {
            const logoPath = path.join(__dirname, '../public/assets/intelligence-logo.png');
            const logoBuffer = fs.readFileSync(logoPath);
            logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        } catch (e) {
            this.logger.error(`[ReportService] Errore caricamento logo: ${e}`);
        }

        // Prepariamo le sezioni renderizzando il testo lato server per massima precisione
        const t = (key: string, params?: any) => this.i18n.t(key, locale, params);

        // Arricchiamo le sezioni con il testo renderizzato per i casi di fallback (generic blocks)
        const enrichedSections = sections.map(s => {
            const sanitizedData = this.sanitizeSectionData(s.data);
            // Forza il re-rendering basato sul locale richiesto

            var newRenderedText = (s.templateKey)
                    ? this.renderSection(s.templateKey, sanitizedData, locale)
                : (s.renderedText || '');
            
            if (isTelex) { 
                newRenderedText = (s.renderedText) ? (s.renderedText) : ( (s.templateKey) ? this.renderSection(s.templateKey, sanitizedData, locale) : 'N/D' );
            }

            return {
                ...s,
                data: sanitizedData,
                renderedText: newRenderedText
            };
        });  
        
        const html = await ejs.renderFile(templatePath, { 
            sections: enrichedSections, 
            logoBase64, 
            t, 
            locale 
        });

        if (format === 'html') return html;

        return await this.convertToPdf(html);        

    }
    /**
     * Genera un Dossier Investigativo Personalizzato partendo da una lista di sezioni catturate
     */
    async generateTelexReport(sections: IDossierSection[], locale: string, format: 'html' | 'pdf' = 'pdf'): Promise<Buffer | string> {
        this.logger.info(`[ReportService] Generazione Custom Dossier (Telex) (${sections.length} sezioni) [${locale}]`);

        const templatePath = path.join(__dirname, `../templates/reports/custom-dossier.ejs`);
        
        return this.generateCommonReport(templatePath, sections, locale, format, true);
    }

    /**
     * Genera un Dossier in stile HUD (Rich UI) usando frammenti EJS modulari
     */
    async generateHudReport(sections: IDossierSection[], locale: string, format: 'html' | 'pdf' = 'pdf'): Promise<Buffer | string> {
        this.logger.info(`[ReportService] Generazione HUD Dossier (${sections.length} sezioni) [${locale}]`);

        const templatePath = path.join(__dirname, `../templates/reports/hud-dossier.ejs`);
        
        return this.generateCommonReport(templatePath, sections, locale, format);
    }

    /**
     * Genera un Dossier in stile Classic (Formal/Admin) usando frammenti EJS dedicati
     */
    async generateClassicReport(sections: IDossierSection[], locale: string, format: 'html' | 'pdf' = 'pdf'): Promise<Buffer | string> {
        this.logger.info(`[ReportService] Generazione Classic Dossier (${sections.length} sezioni) [${locale}]`);

        const templatePath = path.join(__dirname, `../templates/reports/classic-dossier.ejs`);
        
        return this.generateCommonReport(templatePath, sections, locale, format);
    }

    /**
     * Helper per renderizzare una sezione basata su template a blocchi (blueprint)
     */
    private renderSection(templateKey: string, data: any, locale: string): string {
        try {
            const template = this.i18n.tm(templateKey, locale);
            if (!template) return `[Template Error: ${templateKey}]`;

            const replaceTokens = (text: string, d: any) => {
                if (typeof text !== 'string') return '';
                return text.replace(/{(\w+)}/g, (match, key) => {
                    const value = this.sanitizeRawData(d[key]);
                    return (value !== undefined && value !== null && value !== '') 
                        ? String(value) 
                        : this.i18n.t('reports.common.notAvailable', locale);
                });
            };

            if (Array.isArray(template)) {
                return template.map(line => replaceTokens(line, data)).join('\n');
            } else if (typeof template === 'string') {
                return replaceTokens(template, data);
            }
            return `[Invalid Template Format: ${templateKey}]`;
        } catch (e) {
            this.logger.error(`[ReportService] Errore rendering sezione ${templateKey}: ${e}`);
            return `[Rendering Error]`;
        }
    }

    /**
     * Recupera i dati per la generazione del report di attacco
     * @param ip 
     * @param locale 
     * @returns 
     */
    private async getAttackReportData(ip: string, locale: string) {
        const attack = await this.threatLogService.getAttackDetail({ ip });
        const logs = await this.threatLogService.getLogs({ filters: { 'request.ip': ip }, pageSize: 100 });

        return {
            title: this.i18n.t('reports.attackDetail.title', locale),
            generatedAt: new Date().toLocaleString(locale),
            ip,
            attack, // Passa l'intero oggetto AttackDTO
            summary: {
                dangerLevel: attack?.dangerLevel || 'LOW',
                dangerScore: attack?.dangerScore || 0,
                totalLogs: attack?.totaleLogs || logs.length,
                duration: attack?.durataAttacco?.human || this.i18n.t('reports.common.notAvailable', locale),
                techniques: attack?.attackPatterns || []
            },
            ipInfo: this.normalizeIpDetails(attack?.ipDetails, locale),
            abuse: await this.prepareAbuseData(ip, locale),
            events: logs.map(l => ({
                timestamp: l.timestamp,
                method: l.request?.method || this.i18n.t('reports.common.notAvailable', locale),
                url: l.request?.url || this.i18n.t('reports.common.notAvailable', locale),
                userAgent: l.request?.userAgent || this.i18n.t('reports.common.notAvailable', locale),
                statusCode: l.response?.statusCode || this.i18n.t('reports.common.notAvailable', locale),
                score: l.fingerprint?.score || 0,
                headers: l.request?.headers,
                body: l.request?.body
            }))
        };
    }

    /**
     * Recupera i dati per la generazione del report di sessione Telnet
     * @param sessionId 
     * @param locale 
     * @returns 
     */
    private async getTelnetReportData(sessionId: string, locale: string) {
        const session = await this.cowrieService.getSessionDetails(sessionId);
        if (!session) {
            const errorMsg = this.i18n.t('reports.common.unknown', locale);
            throw new Error(errorMsg);
        }
        const events = await this.cowrieService.getSessionEvents(sessionId);

        // Calcolo durata se mancante (starttime/endtime)
        let duration = this.i18n.t('reports.common.notAvailable', locale);
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
            title: this.i18n.t('reports.telnetDetail.title', locale),
            generatedAt: new Date().toLocaleString(locale),
            sessionId,
            ip: session.src_ip,
            sessionInfo: {
                startTime: session.timestamp ? new Date(session.timestamp).toLocaleString(locale) : this.i18n.t('reports.common.notAvailable', locale),
                duration: duration,
                protocol: session.protocol || 'telnet',
                sensor: session.sensor || this.i18n.t('reports.common.notAvailable', locale),
                ...stats
            },
            ipInfo: this.normalizeIpDetails(session.ipDetailsId, locale),
            abuse: await this.prepareAbuseData(session.src_ip, locale),
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

    /**
     * Recupera i dati per la generazione del report di un dettaglio IP
     * @param ip 
     * @param locale 
     * @returns 
     */
    private async getIpReportData(ip: string, locale: string) {
        const data = await this.ipDetailsService.getIpDetails(ip);
        const details = data?.ipDetails;
        const abuseDb = details?.abuseipdbId as any;
        
        return {
            title: this.i18n.t('reports.ipDetail.title', locale),
            generatedAt: new Date().toLocaleString(locale),
            ip,
            details: this.normalizeIpDetails(details, locale),
            abuse: {
                confidenceScore: abuseDb?.abuseConfidenceScore || 0,
                totalReports: abuseDb?.totalReports || 0,
                lastReportedAt: abuseDb?.lastReportedAt ? new Date(abuseDb.lastReportedAt).toLocaleString(locale) : this.i18n.t('reports.ipDetail.notListed', locale),
                domain: abuseDb?.domain || this.i18n.t('reports.common.notAvailable', locale),
                usageType: abuseDb?.usageType || this.i18n.t('reports.common.notAvailable', locale),
                isp: abuseDb?.isp || (details as any)?.isp || this.i18n.t('reports.common.notAvailable', locale),
                isTor: abuseDb?.isTor || (details as any)?.isTor || false,
                isWhitelisted: abuseDb?.isWhitelisted || (details as any)?.isWhitelisted || false,
                countryCode: abuseDb?.countryCode || (details as any)?.countryCode || '??'
            },
            whois: this.sanitizeRawData(details?.whois_raw) || this.i18n.t('reports.ipDetail.noAbuse', locale),
            abuseReports: (data?.abuseReports || []).map((r: any) => ({
                date: r.reportedAt,
                categories: r.categories || [],
                comment: r.comment || 'Nessun commento'
            }))
        };
    }


    /**
     * Pulisce i dati grezzi (come WHOIS o Payload) che potrebbero arrivare 
     * come stringhe JSON-escaped (con virgolette esterne e \n letterali).
     */
    private sanitizeRawData(input: any): string {
        if (typeof input !== 'string' || !input) return input;
        
        let sanitized = input.trim();
        
        // Se la stringa è racchiusa tra virgolette doppie, proviamo a unescaparla come JSON
        if (sanitized.startsWith('"') && sanitized.endsWith('"')) {
            try {
                // JSON.parse gestirà correttamente \n, \t e altri caratteri di escape
                return JSON.parse(sanitized);
            } catch (e) {
                // Se non è un JSON valido nonostante le virgolette, rimuoviamole manualmente
                sanitized = sanitized.slice(1, -1);
            }
        }
        
        // Fallback: rimpiazza manualmente sequenze letterali di escape \n e \r se presenti come testo
        return sanitized
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\"/g, '"')
            .replace(/\\t/g, '\t');
    }

    /**
     * Sanifica ricorsivamente un oggetto data per pulire campi raw noti.
     */
    private sanitizeSectionData(data: Record<string, any>): Record<string, any> {
        if (!data || typeof data !== 'object') return data;
        
        const sanitized = { ...data };
        const fieldsToSanitize = ['whois', 'rawData', 'payload', 'comment', 'input'];
        
        for (const key of Object.keys(sanitized)) {
            if (fieldsToSanitize.includes(key) && typeof sanitized[key] === 'string') {
                sanitized[key] = this.sanitizeRawData(sanitized[key]);
            } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
                sanitized[key] = this.sanitizeSectionData(sanitized[key]);
            }
        }
        
        return sanitized;
    }

    private normalizeIpDetails(details: any, locale: string) {
        // Estraiamo i dati da ipinfo se presenti (lookups ipinfo.io) o dal root (AbuseIPDB)
        const info = details?.ipinfo || details || {};
        const coordinates = info.loc || (details?.geo?.coordinates ? details.geo.coordinates.join(',') : this.i18n.t('reports.common.notAvailable', locale));

        return {
            country: info.country || details?.country || this.i18n.t('reports.common.unknown', locale),
            countryCode: info.countryCode || details?.countryCode || '??',
            city: info.city || details?.city || this.i18n.t('reports.common.notAvailable', locale),
            isp: info.isp || info.org || details?.isp || this.i18n.t('reports.common.notAvailable', locale),
            abuseScore: details?.abuseScore || info.abuseScore || 0,
            usageType: details?.usageType || info.usageType || this.i18n.t('reports.common.notAvailable', locale),
            isTor: details?.isTor || info.isTor || false,
            isWhitelisted: details?.isWhitelisted || info.isWhitelisted || false,
            coordinates: coordinates
        };
    }

    /**
     * Helper centralizzato per estrarre i dati di reputazione da AbuseIPDB
     */
    private async prepareAbuseData(ip: string, locale: string) {
        try {
            const data = await this.ipDetailsService.getIpDetails(ip);
            if (!data || !data.ipDetails) return this.getDefaultAbuseObject(locale);

            const details = data.ipDetails;
            const abuseDb = details.abuseipdbId as any;

            return {
                confidenceScore: abuseDb?.abuseConfidenceScore || 0,
                totalReports: abuseDb?.totalReports || 0,
                lastReportedAt: abuseDb?.lastReportedAt ? new Date(abuseDb.lastReportedAt).toLocaleString(locale) : this.i18n.t('reports.common.notAvailable', locale),
                domain: abuseDb?.domain || this.i18n.t('reports.common.notAvailable', locale),
                usageType: abuseDb?.usageType || this.i18n.t('reports.common.notAvailable', locale),
                isp: abuseDb?.isp || (details as any)?.isp || this.i18n.t('reports.common.notAvailable', locale),
                isTor: abuseDb?.isTor || (details as any)?.isTor || false,
                isWhitelisted: abuseDb?.isWhitelisted || (details as any)?.isWhitelisted || false,
                countryCode: abuseDb?.countryCode || (details as any)?.countryCode || '??'
            };
        } catch (e) {
            this.logger.error(`[ReportService] Errore preparazione dati Abuse per ${ip}: ${e}`);
            return this.getDefaultAbuseObject(locale);
        }
    }

    private getDefaultAbuseObject(locale: string) {
        return {
            confidenceScore: 0,
            totalReports: 0,
            lastReportedAt: this.i18n.t('reports.common.notAvailable', locale),
            domain: this.i18n.t('reports.common.notAvailable', locale),
            usageType: this.i18n.t('reports.common.notAvailable', locale),
            isp: this.i18n.t('reports.common.notAvailable', locale),
            isTor: false,
            isWhitelisted: false,
            countryCode: '??'
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
