import { Request, Response } from 'express';
import { injectable } from 'tsyringe';
import { ReportService, ReportType } from '../services/ReportService';

@injectable()
export class ReportController {
    constructor(private readonly reportService: ReportService) {}

    async generateAttackReport(req: Request, res: Response) {
        try {
            const { ip, sessionId, type, locale } = req.query;
            const format = (req.query.format as 'html' | 'pdf') || 'pdf';
            const reportType = (type as ReportType) || 'attack';
            const lang = (locale as string) || 'it-IT';

            const id = (reportType === 'telnet' ? sessionId : ip) as string;

            if (!id) {
                const errorMsg = lang.startsWith('it') 
                    ? `È necessario fornire un ID valido per il tipo ${reportType}`
                    : `A valid ID is required for type ${reportType}`;
                return res.status(400).json({ error: errorMsg });
            }

            const result = await this.reportService.generateReport(reportType, id, format, lang);

            if (format === 'html') {
                res.setHeader('Content-Type', 'text/html');
                return res.send(result);
            } else {
                const pdfBuffer = result as Buffer;
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=dossier_${reportType}_${id}.pdf`);
                res.setHeader('Content-Length', pdfBuffer.length);
                return res.send(pdfBuffer);
            }
        } catch (error: any) {
            console.error('[ReportController] Errore:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async generateCustomReport(req: Request, res: Response) {
        try {
            const { sections, locale } = req.body;
            const format = (req.query.format as 'html' | 'pdf') || 'pdf';
            const style = (req.query.style as 'telex' | 'hud' | 'classic') || 'classic';
            const lang = (locale as string) || 'it-IT';

            if (!sections || !Array.isArray(sections)) {
                return res.status(400).json({ error: 'Sections array is required' });
            }

            let result: Buffer | string;
            if (style === 'hud') {
                result = await this.reportService.generateHudReport(sections, locale, format);
            } else if (style === 'classic') {
                result = await this.reportService.generateClassicReport(sections, locale, format);
            } else {
                result = await this.reportService.generateCustomReport(sections, locale, format);
            }

            if (format === 'html') {
                res.setHeader('Content-Type', 'text/html');
                return res.send(result);
            } else {
                const pdfBuffer = result as Buffer;
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=custom_dossier_${new Date().getTime()}.pdf`);
                res.setHeader('Content-Length', pdfBuffer.length);
                return res.send(pdfBuffer);
            }
        } catch (error: any) {
            console.error('[ReportController] Errore:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
