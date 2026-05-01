import { Request, Response } from 'express';
import { singleton } from 'tsyringe';
import { ReportService, ReportType } from '../services/ReportService';
import { IDossierSection } from '../models/DossierSchema';
import { Controller, Get, Post } from '../registry/decorators';
import { getComponent } from '../di/container';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';

const auth = getComponent(AuthMiddleware);

@singleton()
@Controller('/api')
export class ReportController {
    constructor(private readonly reportService: ReportService) { }

    private safeFilename(value: string): string {
        return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64);
    }

    /**
     * @openapi
     * /reports/dettaglio:
     *   get:
     *     tags: [Dossier & Forensics]
     *     summary: Genera un report dettagliato per un attacco (IP o SessionID)
     *     parameters:
     *       - name: ip
     *         in: query
     *         schema:
     *           type: string
     *       - name: sessionId
     *         in: query
     *         schema:
     *           type: string
     *       - name: type
     *         in: query
     *         schema:
     *           type: string
     *           enum: [attack, telnet, ip]
     *           default: attack
     *       - name: format
     *         in: query
     *         schema:
     *           type: string
     *           enum: [html, pdf]
     *           default: pdf
     *       - name: locale
     *         in: query
     *         schema:
     *           type: string
     *           default: it-IT
     *       - name: style
     *         in: query
     *         schema:
     *           type: string
     *           enum: [classic, hud, telex]
     *           default: classic
     *       - name: ipList
     *         in: query
     *         description: JSON array di IP per report distribuiti
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Report generato.
     */
    @Get('/reports/dettaglio', [auth.isIdentified()])
    async generateDetailReport(req: Request, res: Response) {
        try {
            const { ip, sessionId, type, locale, ipList } = req.query;
            const format = (req.query.format as 'html' | 'pdf') || 'pdf';
            const reportType = (type as ReportType) || 'attack';
            const lang = (locale as string) || 'it-IT';
            const style = (req.query.style as 'classic' | 'hud' | 'telex') || 'classic';

            const id = (reportType === 'telnet' ? sessionId : ip) as string;

            // Se è un attacco e abbiamo ipList, la parsiamo
            let parsedIpList: string[] | undefined;
            if (reportType === 'attack' && ipList) {
                try {
                    parsedIpList = JSON.parse(ipList as string);
                } catch (e) {
                    console.error('[ReportController] Errore parsing ipList:', e);
                }
            }

            if (!id && (!parsedIpList || parsedIpList.length === 0)) {
                const errorMsg = lang.startsWith('it')
                    ? `È necessario fornire un ID o una lista IP valida per il tipo ${reportType}`
                    : `A valid ID or IP list is required for type ${reportType}`;
                return res.status(400).json({ error: errorMsg });
            }

            const result = await this.reportService.generateDetailReport(reportType, id, format, lang, style, parsedIpList);

            if (format === 'html') {
                res.setHeader('Content-Type', 'text/html');
                return res.send(result);
            } else {
                const pdfBuffer = result as Buffer;
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=dossier_${this.safeFilename(reportType)}_${this.safeFilename(id)}.pdf`);
                res.setHeader('Content-Length', pdfBuffer.length);
                return res.send(pdfBuffer);
            }
        } catch (error: any) {
            console.error('[ReportController] Errore:', error);
            res.status(500).json({ error: 'Errore durante la generazione del report' });
        }
    }

    /**
     * @openapi
     * /reports/custom:
     *   post:
     *     tags: [Dossier & Forensics]
     *     summary: Genera un report personalizzato basato su criteri specifici
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               sections:
     *                 type: array
     *                 items:
     *                   type: object
     *               locale:
     *                 type: string
     *                 default: it-IT
     *     responses:
     *       200:
     *         description: Report custom generato.
     */
    @Post('/reports/custom', [auth.isIdentified()])
    async generateCustomReport(req: Request, res: Response) {
        try {
            const { sections, locale }: { sections: IDossierSection[], locale: string } = req.body;
            const format = (req.query.format as 'html' | 'pdf') || 'pdf';
            const style = (req.query.style as 'telex' | 'hud' | 'classic') || 'classic';
            const lang = (locale as string) || 'it-IT';

            if (!sections || !Array.isArray(sections)) {
                return res.status(400).json({ error: 'Sections array is required' });
            }

            let result: Buffer | string;

            switch (style) {
                case 'hud':
                    result = await this.reportService.generateHudReport(sections, locale, format);
                    break;
                case 'classic':
                    result = await this.reportService.generateClassicReport(sections, locale, format);
                    break;
                case 'telex':
                default:
                    result = await this.reportService.generateTelexReport(sections, locale, format);
                    break;
            }

            if (format === 'html') {
                res.setHeader('Content-Type', 'text/html');
                return res.send(result);
            } else {
                const pdfBuffer = result as Buffer;
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=custom_dossier_${Date.now()}.pdf`);
                res.setHeader('Content-Length', pdfBuffer.length);
                return res.send(pdfBuffer);
            }
        } catch (error: any) {
            console.error('[ReportController] Errore:', error);
            res.status(500).json({ error: 'Errore durante la generazione del report' });
        }
    }
}
