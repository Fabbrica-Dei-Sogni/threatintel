import { Request, Response } from 'express';
import { injectable } from 'tsyringe';
import { ReportService, ReportType } from '../services/ReportService';

@injectable()
export class ReportController {
    constructor(private readonly reportService: ReportService) {}

    async generateAttackReport(req: Request, res: Response) {
        try {
            const { ip, sessionId, type } = req.query;
            const format = (req.query.format as 'html' | 'pdf') || 'pdf';
            const reportType = (type as ReportType) || 'attack';

            const id = (reportType === 'telnet' ? sessionId : ip) as string;

            if (!id) {
                return res.status(400).json({ error: `È necessario fornire un ID valido per il tipo ${reportType}` });
            }

            const result = await this.reportService.generateReport(reportType, id, format);

            if (format === 'html') {
                res.setHeader('Content-Type', 'text/html');
                return res.send(result);
            } else {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=dossier_${reportType}_${id}.pdf`);
                return res.send(result);
            }
        } catch (error: any) {
            console.error('[ReportController] Errore:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
