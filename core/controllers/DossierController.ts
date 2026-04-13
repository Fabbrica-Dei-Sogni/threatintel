import { Request, Response } from 'express';
import { injectable } from 'tsyringe';
import { DossierService } from '../services/DossierService';
import { CreateDossierDTO, UpdateDossierDTO } from '../models/dto/DossierDTO';
import { sanitizePage, sanitizePageSize } from '../utils/queryGuard';

@injectable()
export class DossierController {
    constructor(private readonly dossierService: DossierService) { }

    private safeFilename(value: string): string {
        return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64);
    }
    /**
     * Crea un nuovo Dossier.
     * POST /api/dossiers
     */
    async create(req: Request, res: Response) {
        try {
            const dto: CreateDossierDTO = req.body;
            if (!dto.title || !dto.sections) {
                return res.status(400).json({ error: 'Title and sections are required' });
            }
            const dossier = await this.dossierService.createDossier(dto);
            return res.status(201).json(dossier);
        } catch (error: any) {
            console.error('[DossierController] <NomeMetodo> error:', error);
            return res.status(500).json({ error: 'Operazione non riuscita' });
        }
    }

    /**
     * Elenca i dossier con filtri e paginazione.
     * GET /api/dossiers
     */
    async list(req: Request, res: Response) {
        try {
            const { status, owner, tags, ip, search, page, pageSize } = req.query;
            const filters = { status, owner, tags, ip, search };
            const p = sanitizePage(page);
            const ps = sanitizePageSize(pageSize);

            const result = await this.dossierService.listDossiers(filters, p, ps);
            return res.status(200).json(result);
        } catch (error: any) {
            console.error('[DossierController] list error:', error);
            return res.status(500).json({ error: 'Operazione non riuscita' });
        }
    }

    /**
     * Recupera un singolo dossier per ID.
     * GET /api/dossiers/:id
     */
    async getById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const dossier = await this.dossierService.getDossierById(id);
            if (!dossier) {
                return res.status(404).json({ error: 'Dossier not found' });
            }
            return res.status(200).json(dossier);
        } catch (error: any) {
            console.error('[DossierController] <NomeMetodo> error:', error);
            return res.status(500).json({ error: 'Operazione non riuscita' });
        }
    }

    /**
     * Aggiorna un dossier per ID.
     * PATCH /api/dossiers/:id
     */
    async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const dto: UpdateDossierDTO = req.body;
            const dossier = await this.dossierService.updateDossier(id, dto);
            if (!dossier) {
                return res.status(404).json({ error: 'Dossier not found' });
            }
            return res.status(200).json(dossier);
        } catch (error: any) {
            console.error('[DossierController] <NomeMetodo> error:', error);
            return res.status(500).json({ error: 'Operazione non riuscita' });
        }
    }

    /**
     * Elimina un dossier per ID.
     * DELETE /api/dossiers/:id
     */
    async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const success = await this.dossierService.deleteDossier(id);
            if (!success) {
                return res.status(404).json({ error: 'Dossier not found' });
            }
            return res.status(204).send();
        } catch (error: any) {
            console.error('[DossierController] <NomeMetodo> error:', error);
            return res.status(500).json({ error: 'Operazione non riuscita' });
        }
    }

    /**
     * Esporta un dossier salvato in formato PDF o HTML.
     * GET /api/dossiers/:id/export
     */
    async export(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { format, style, locale } = req.query;

            const resFormat = (format as 'html' | 'pdf') || 'pdf';
            const resStyle = (style as 'hud' | 'classic' | 'telex') || 'classic';
            const resLocale = (locale as string) || 'it-IT';

            const result = await this.dossierService.generatePdfFromDossier(id, resFormat, resStyle, resLocale);

            if (resFormat === 'html') {
                res.setHeader('Content-Type', 'text/html');
                return res.send(result);
            } else {
                const pdfBuffer = result as Buffer;
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=dossier_${this.safeFilename(id)}.pdf`);
                res.setHeader('Content-Length', pdfBuffer.length);
                return res.send(pdfBuffer);
            }
        } catch (error: any) {
            console.error('[DossierController] <NomeMetodo> error:', error);
            return res.status(500).json({ error: 'Operazione non riuscita' });
        }
    }
}
