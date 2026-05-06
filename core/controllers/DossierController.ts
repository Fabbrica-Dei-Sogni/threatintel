import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { DossierService } from '../services/DossierService';
import * as Tokens from '../di/tokens';
import { CreateDossierDTO } from '../models/dto/DossierDTO';
import { sanitizePage, sanitizePageSize } from '../utils/queryGuard';
import { Controller, Get, Post, Patch, Delete } from '../registry/decorators';
import { getComponent } from '../di/container';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';

const auth = () => getComponent<AuthMiddleware>(Tokens.AUTH_MIDDLEWARE_TOKEN);

@singleton()
@Controller('/api/dossiers')
export class DossierController {
    constructor(@inject(Tokens.DOSSIER_SERVICE_TOKEN) private readonly dossierService: DossierService) { }

    private safeFilename(value: string): string {
        return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64);
    }

    /**
     * @openapi
     * /dossiers:
     *   get:
     *     tags: [Dossier & Forensics]
     *     summary: Elenca tutti i dossier investigativi
     *     parameters:
     *       - name: status
     *         in: query
     *         schema:
     *           type: string
     *       - name: tags
     *         in: query
     *         description: Filtra per tag (separati da virgola)
     *         schema:
     *           type: string
     *       - name: ip
     *         in: query
     *         schema:
     *           type: string
     *       - name: search
     *         in: query
     *         schema:
     *           type: string
     *       - name: page
     *         in: query
     *         schema:
     *           type: integer
     *           default: 1
     *       - name: pageSize
     *         in: query
     *         schema:
     *           type: integer
     *           default: 20
     *     responses:
     *       200:
     *         description: Elenco dossier.
     */
    @Get('/', [(req: any, res: any, next: any) => auth().isIdentified()(req, res, next)])
    async list(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { status, tags, ip, search, page, pageSize } = req.query;
            
            // L'owner viene gestito internamente dal service basandosi sull'identità e i ruoli
            const filters = { status, tags, ip, search };
            const p = sanitizePage(page);
            const ps = sanitizePageSize(pageSize);

            const isAdmin = user.roles?.some((r: any) => r.name === 'admin');
            const result = await this.dossierService.listDossiers(filters, p, ps);
            
            return res.status(200).json(result);
        } catch (error: any) {
            console.error('[DossierController] list error:', error);
            return res.status(500).json({ error: 'Operazione non riuscita' });
        }
    }

    /**
     * @openapi
     * /dossiers/{id}:
     *   get:
     *     tags: [Dossier & Forensics]
     *     summary: Ottiene un dossier specifico tramite ID
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Dettaglio dossier.
     */
    @Get('/:id', [(req: any, res: any, next: any) => auth().isIdentified()(req, res, next)])
    async getById(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const user = (req as any).user;
            const dossier = await this.dossierService.getDossierById(id);
            if (!dossier) {
                return res.status(404).json({ error: 'Dossier not found' });
            }
            return res.status(200).json(dossier);
        } catch (error: any) {
            console.error('[DossierController] getById error:', error);
            return res.status(500).json({ error: 'Operazione non riuscita' });
        }
    }

    /**
     * @openapi
     * /dossiers:
     *   post:
     *     tags: [Dossier & Forensics]
     *     summary: Crea un nuovo dossier investigativo
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [title, sections]
     *             properties:
     *               title:
     *                 type: string
     *               description:
     *                 type: string
     *               sections:
     *                 type: array
     *                 items:
     *                   type: object
     *               tags:
     *                 type: array
     *                 items:
     *                   type: string
     *     responses:
     *       201:
     *         description: Dossier creato.
     */
    @Post('/', [(req: any, res: any, next: any) => auth().isIdentified()(req, res, next)])
    async create(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const dto: CreateDossierDTO = req.body;
            
            if (!dto.title || !dto.sections) {
                return res.status(400).json({ error: 'Title and sections are required' });
            }

            // Forza l'owner con l'utente autenticato (IDOR Protection)
            const dossier = await this.dossierService.createDossier(dto, user.username);
            return res.status(201).json(dossier);
        } catch (error: any) {
            console.error('[DossierController] create error:', error);
            return res.status(500).json({ error: 'Operazione non riuscita' });
        }
    }

    /**
     * @openapi
     * /dossiers/{id}:
     *   patch:
     *     tags: [Dossier & Forensics]
     *     summary: Aggiorna un dossier esistente
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               title:
     *                 type: string
     *               description:
     *                 type: string
     *               status:
     *                 type: string
     *                 enum: [open, closed, archived]
     *               sections:
     *                 type: array
     *                 items:
     *                   type: object
     *               tags:
     *                 type: array
     *                 items:
     *                   type: string
     *     responses:
     *       200:
     *         description: Dossier aggiornato.
     */
    @Patch('/:id', [(req: any, res: any, next: any) => auth().isIdentified()(req, res, next)])
    async update(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const isAdmin = user.roles?.some((r: any) => r.name === 'admin');
            const id = req.params.id as string;
            const dossier = await this.dossierService.updateDossier(id, req.body, user.username, isAdmin);
            if (!dossier) {
                return res.status(404).json({ error: 'Dossier not found' });
            }
            return res.status(200).json(dossier);
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') {
                return res.status(403).json({ error: 'Non hai i permessi per modificare questo dossier' });
            }
            console.error('[DossierController] update error:', error);
            return res.status(500).json({ error: 'Operazione non riuscita' });
        }
    }

    /**
     * @openapi
     * /dossiers/{id}:
     *   delete:
     *     tags: [Dossier & Forensics]
     *     summary: Elimina un dossier investigativo
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Dossier eliminato.
     */
    @Delete('/:id', [(req: any, res: any, next: any) => auth().isIdentified()(req, res, next)])
    async delete(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const isAdmin = user.roles?.some((r: any) => r.name === 'admin');
            const id = req.params.id as string;
            const success = await this.dossierService.deleteDossier(id, user.username, isAdmin);
            if (!success) {
                return res.status(404).json({ error: 'Dossier not found' });
            }
            return res.status(204).send();
        } catch (error: any) {
            if (error.message === 'FORBIDDEN') {
                return res.status(403).json({ error: 'Non hai i permessi per eliminare questo dossier' });
            }
            console.error('[DossierController] delete error:', error);
            return res.status(500).json({ error: 'Operazione non riuscita' });
        }
    }

    /**
     * @openapi
     * /dossiers/{id}/export:
     *   get:
     *     tags: [Dossier & Forensics]
     *     summary: Esporta un dossier in formato forense (Classico/HUD)
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *       - name: format
     *         in: query
     *         schema:
     *           type: string
     *           enum: [html, pdf]
     *           default: pdf
     *       - name: style
     *         in: query
     *         schema:
     *           type: string
     *           enum: [classic, hud, telex]
     *           default: classic
     *       - name: locale
     *         in: query
     *         schema:
     *           type: string
     *           default: it-IT
     *     responses:
     *       200:
     *         description: File esportato con successo.
     */
    @Get('/:id/export', [(req: any, res: any, next: any) => auth().isIdentified()(req, res, next)])
    async export(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
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
            console.error('[DossierController] export error:', error);
            return res.status(500).json({ error: 'Operazione non riuscita' });
        }
    }
}
