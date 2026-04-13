import { Request, Response } from 'express';
import { injectable } from 'tsyringe';
import { ReportService, ReportType } from '../services/ReportService';
import { IDossierSection } from '../models/DossierSchema';

@injectable()
export class ReportController {
    constructor(private readonly reportService: ReportService) { }

    private safeFilename(value: string): string {
        return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64);
    }

    async generateDetailReport(req: Request, res: Response) {
        try {
            const { ip, sessionId, type, locale } = req.query;
            const format = (req.query.format as 'html' | 'pdf') || 'pdf';
            const reportType = (type as ReportType) || 'attack';
            const lang = (locale as string) || 'it-IT';
            const style = (req.query.style as 'classic' | 'hud' | 'telex') || 'classic';

            const id = (reportType === 'telnet' ? sessionId : ip) as string;

            if (!id) {
                const errorMsg = lang.startsWith('it')
                    ? `È necessario fornire un ID valido per il tipo ${reportType}`
                    : `A valid ID is required for type ${reportType}`;
                return res.status(400).json({ error: errorMsg });
            }

            const result = await this.reportService.generateDetailReport(reportType, id, format, lang, style);

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
