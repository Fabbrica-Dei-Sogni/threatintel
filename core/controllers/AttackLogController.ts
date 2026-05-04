import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { AttackLogService } from '../services/AttackLogService';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';
import { sanitizePage, sanitizePageSize } from '../utils/queryGuard';
import { Controller, Post } from '../registry/decorators';

@singleton()
@Controller('/api')
export class AttackLogController {
    constructor(
        private attackLogService: AttackLogService,
        @inject(LOGGER_TOKEN) private logger: Logger
    ) { }

    /**
     * @openapi
     * /attack/search:
     *   post:
     *     tags: [Dashboard API]
     *     summary: Ricerca attacchi raggruppati
     *     responses:
     *       200:
     *         description: Elenco attacchi aggregati.
     */
    @Post('/attack/search')
    async searchAttacks(req: Request, res: Response): Promise<void> {
        this.logger.info('[AttackLogController] Requesting attack search');
        try {
            const { page = 1, pageSize = 20, filters = {}, minLogsForAttack = 10, timeConfig = {}, sortFields = {} } = req.body;

            const pageNum = sanitizePage(page);
            const pageSizeNum = sanitizePageSize(pageSize);
            const minLogsForAttackNum = Math.min(Math.max(1, parseInt(minLogsForAttack)), 1000);

            const data = await this.attackLogService.getAttacks({
                page: pageNum,
                pageSize: pageSizeNum,
                filters,
                minLogsForAttack: minLogsForAttackNum,
                timeConfig,
                sortFields
            });

            res.json({ attacks: data.items, total: data.totalCount, page: pageNum, pageSize: pageSizeNum });
        } catch (err: any) {
            this.logger.error('[AttackLogController] Error searching attacks:', err);
            res.status(err.status || 500).json({ error: 'Errore recupero attacchi' });
        }
    }

    /**
     * @openapi
     * /attack/details:
     *   post:
     *     tags: [Dashboard API]
     *     summary: Ottiene dettagli specifici di un attacco
     *     responses:
     *       200:
     *         description: Dettagli dell'attacco.
     */
    @Post('/attack/details')
    async getAttackDetails(req: Request, res: Response): Promise<void> {
        this.logger.info(`[AttackLogController] Requesting attack details for IP ${req.body.ip}`);
        try {
            const { ip, minLogsForAttack = 10, timeConfig = {}, protocol, status } = req.body;
            if (!ip) {
                res.status(400).json({ error: 'IP mancante' });
                return;
            }

            const attack = await this.attackLogService.getAttackDetail({
                ip,
                minLogsForAttack: parseInt(minLogsForAttack),
                timeConfig,
                protocol,
                status
            });

            if (!attack) {
                res.status(404).json({ error: 'Attacco non trovato' });
                return;
            }

            res.json(attack);
        } catch (err: any) {
            this.logger.error('[AttackLogController] Error fetching attack details:', err);
            res.status(500).json({ error: 'Errore durante il recupero dei dettagli dell\'attacco' });
        }
    }

    /**
     * @openapi
     * /attack/distributed:
     *   post:
     *     tags: [Dashboard API]
     *     summary: Ottiene dettagli investigativi per un cluster di IP (Attacco Distribuito)
     *     responses:
     *       200:
     *         description: Dettagli dell'attacco distribuito.
     */
    @Post('/attack/distributed')
    async getDistributedAttackDetails(req: Request, res: Response): Promise<void> {
        this.logger.info(`[AttackLogController] Requesting distributed attack details for ${req.body.ipList?.length || 0} IPs`);
        try {
            const { ipList, minLogsForAttack = 1, timeConfig = {}, protocol, status } = req.body;

            if (!ipList || !Array.isArray(ipList) || ipList.length === 0) {
                res.status(400).json({ error: 'Lista IP mancante o non valida' });
                return;
            }

            const attack = await this.attackLogService.getDistributedAttackDetail({
                ipList,
                minLogsForAttack: parseInt(minLogsForAttack),
                timeConfig,
                protocol,
                status
            });

            if (!attack) {
                res.status(404).json({ error: 'Nessun dato trovato per il cluster di IP fornito' });
                return;
            }

            res.json(attack);
        } catch (err: any) {
            this.logger.error('[AttackLogController] Error fetching distributed attack details:', err);
            res.status(500).json({ error: 'Errore durante l\'analisi investigativa distribuita' });
        }
    }
}
