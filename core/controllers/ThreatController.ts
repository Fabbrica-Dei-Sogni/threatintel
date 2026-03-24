import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { ThreatLogService } from '../services/ThreatLogService';
import { IpDetailsService } from '../services/IpDetailsService';
import { SshLogService } from '../services/SshLogService';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';

@singleton()
export class ThreatController {
    constructor(
        private threatLogService: ThreatLogService,
        private ipDetailsService: IpDetailsService,
        private sshLogService: SshLogService,
        @inject(LOGGER_TOKEN) private logger: Logger
    ) {}

    // GET /api/stats
    async getStats(req: Request, res: Response): Promise<void> {
        this.logger.info('[ThreatController] Requesting stats');
        try {
            const stats = await this.threatLogService.getStats('24h');
            const topThreats = await this.threatLogService.getTopThreats(10);

            res.json({
                stats: stats,
                topThreats: topThreats,
                timestamp: new Date().toISOString()
            });
        } catch (err: any) {
            res.status(err.status || 500).json({ error: 'Errore recupero statistiche' });
        }
    }

    // GET /api/logs
    async getLogs(req: Request, res: Response): Promise<void> {
        this.logger.info('[ThreatController] Requesting logs');
        try {
            const { page = 1, pageSize = 20, ip, suspicious } = req.query as any;
            const filters: any = {};
            if (ip) filters['request.ip'] = ip;
            if (suspicious === 'true') filters['fingerprint.suspicious'] = true;
            else if (suspicious === 'false') filters['fingerprint.suspicious'] = false;

            const logs = await this.threatLogService.getLogs({ page: Number(page), pageSize: Number(pageSize), filters });
            const total = await this.threatLogService.countLogs(filters);

            res.json({ logs, total, page: Number(page), pageSize: Number(pageSize) });
        } catch (err: any) {
            res.status(err.status || 500).json({ error: 'Errore recupero log' });
        }
    }

    // POST /api/search
    async searchLogs(req: Request, res: Response): Promise<void> {
        this.logger.info('[ThreatController] Requesting log search');
        try {
            const { page = 1, pageSize = 20, filters = {}, sortFields = {} } = req.body;

            const pageNum = Math.max(1, parseInt(page));
            const pageSizeNum = Math.max(1, parseInt(pageSize));

            const logs = await this.threatLogService.getLogs({ page: pageNum, pageSize: pageSizeNum, filters, sortFields });
            const total = await this.threatLogService.countLogs(filters);

            res.json({ logs, total, page: pageNum, pageSize: pageSizeNum });
        } catch (err: any) {
            this.logger.error('[ThreatController] Error searching logs:', err);
            res.status(err.status || 500).json({ error: 'Errore recupero log' });
        }
    }

    // POST /api/attack/search
    async searchAttacks(req: Request, res: Response): Promise<void> {
        this.logger.info('[ThreatController] Requesting attack search');
        try {
            const { page = 1, pageSize = 20, filters = {}, minLogsForAttack = 10, timeConfig = {}, sortFields = {} } = req.body;

            const pageNum = Math.max(1, parseInt(page));
            const pageSizeNum = Math.max(1, parseInt(pageSize));
            const minLogsForAttackNum = Math.max(1, parseInt(minLogsForAttack));

            const data = await this.threatLogService.getAttacks({ 
                page: pageNum, 
                pageSize: pageSizeNum, 
                filters, 
                minLogsForAttack: minLogsForAttackNum, 
                timeConfig, 
                sortFields 
            });

            res.json({ attacks: data.items, total: data.totalCount, page: pageNum, pageSize: pageSizeNum });
        } catch (err: any) {
            this.logger.error('[ThreatController] Error searching attacks:', err);
            res.status(err.status || 500).json({ error: 'Errore recupero attacchi' });
        }
    }

    // POST /api/attack/details
    async getAttackDetails(req: Request, res: Response): Promise<void> {
        this.logger.info(`[ThreatController] Requesting attack details for IP ${req.body.ip}`);
        try {
            const { ip, minLogsForAttack = 10, timeConfig = {} } = req.body;
            if (!ip) {
                res.status(400).json({ error: 'IP mancante' });
                return;
            }

            const attack = await this.threatLogService.getAttackDetail({ 
                ip, 
                minLogsForAttack: parseInt(minLogsForAttack), 
                timeConfig 
            });

            if (!attack) {
                res.status(404).json({ error: 'Attacco non trovato' });
                return;
            }

            res.json(attack);
        } catch (err: any) {
            this.logger.error('[ThreatController] Error fetching attack details:', err);
            res.status(500).json({ error: 'Errore durante il recupero del dettaglio attacco' });
        }
    }

    // GET /api/logs/:id
    async getLogById(req: Request, res: Response): Promise<void> {
        this.logger.info(`[ThreatController] Requesting log ${req.params.id}`);
        try {
            const log = await this.threatLogService.getLogById(req.params.id);
            if (!log) {
                res.status(404).json({ error: 'Log non trovato' });
                return;
            }
            res.json(log);
        } catch (err: any) {
            res.status(err.status || 500).json({ error: 'Errore recupero dettaglio log' });
        }
    }

    // GET /api/reputationscore/:ip
    async getReputationScore(req: Request, res: Response): Promise<void> {
        this.logger.info(`[ThreatController] Requesting reputation score for ${req.params.ip}`);
        try {
            const reputationData = await this.ipDetailsService.enrichWithAbuse(req.params.ip);
            if (!reputationData) {
                res.status(404).json({ error: 'Reputation score non trovato' });
                return;
            }
            res.json(reputationData);
        } catch (err: any) {
            res.status(err.status || 500).json({ error: 'Errore recupero reputation score ' + JSON.stringify(err) });
        }
    }

    // POST /api/enrichreports/:ip
    async enrichReports(req: Request, res: Response): Promise<void> {
        this.logger.info(`[ThreatController] Enriching reports for ${req.params.ip}`);
        try {
            let maxAgeInDays = 2;
            let perPage = 100;

            const reportsData = await this.ipDetailsService.getAndSaveReportsAbuseIpDb(req.params.ip, maxAgeInDays, perPage);
            if (!reportsData) {
                res.status(404).json({ error: 'Reports non trovati' });
                return;
            }
            res.json(reportsData);
        } catch (err: any) {
            res.status(err.status || 500).json({ error: 'Errore recupero reputation score ' + JSON.stringify(err) });
        }
    }

    // GET /api/ipdetail/:ip
    async getIpDetail(req: Request, res: Response): Promise<void> {
        this.logger.info(`[ThreatController] Requesting IP detail for ${req.params.ip}`);
        try {
            const ipDetails = await this.ipDetailsService.getIpDetails(req.params.ip);
            if (!ipDetails) {
                res.status(404).json({ error: 'Ip detail non trovato' });
                return;
            }
            res.json(ipDetails);
        } catch (err: any) {
            this.logger.error('[ThreatController] Error fetching IP detail:', err);
            res.status(err.status || 500).json({ error: 'Errore durante recupero IP' });
        }
    }

    // POST /api/enrich/:ip
    async enrichIp(req: Request, res: Response): Promise<void> {
        this.logger.info(`[ThreatController] Enriching IP ${req.params.ip}`);
        try {
            const ip = req.params.ip;
            const ipDetailsId = await this.ipDetailsService.findOrCreate(ip, true);
            await this.threatLogService.assignIpDetailsToLogs(ip, ipDetailsId);

            res.json({ message: 'Arricchimento IP completato per ' + ip });
        } catch (err: any) {
            this.logger.error('[ThreatController] Error enriching IP:', err);
            res.status(err.status || 500).json({ error: 'Errore durante arricchimento IP' });
        }
    }

    // POST /api/enrich
    async batchEnrich(req: Request, res: Response): Promise<void> {
        this.logger.info('[ThreatController] Starting batch IP enrichment');
        try {
            const uniqueIps = await this.threatLogService.getDistinctIPs();
            const results: any[] = [];
            for (const ip of uniqueIps) {
                const ipDetailsId = await this.ipDetailsService.findOrCreate(ip);
                await this.threatLogService.assignIpDetailsToLogs(ip, ipDetailsId);
                results.push({ ip, ipDetailsId });
            }

            res.json({ message: 'Arricchimento IP completato', processed: results.length, details: results });
        } catch (err: any) {
            this.logger.error('[ThreatController] Error in batch enrichment:', err);
            res.status(err.status || 500).json({ error: 'Errore durante arricchimento IP' });
        }
    }

    // POST /api/reanalyze-all
    async reanalyzeAll(req: Request, res: Response): Promise<void> {
        this.logger.info('[ThreatController] Starting full logs reanalysis');
        try {
            const { batchSize = 100, updateDatabase = true } = req.body;
            const resultHttp = await this.threatLogService.analyzeLogs({ batchSize, updateDatabase });
            // const resultSsh = await this.sshLogService.analyzeSshLogs(batchSize);

            res.json({ http: resultHttp, ssh: null });
        } catch (err: any) {
            this.logger.error('[ThreatController] Error during reanalysis:', err);
            res.status(err.status || 500).json({ error: 'Errore durante rianalisi di tutti i log', details: err.message });
        }
    }

    // GET /api/analyze-preview
    async analyzePreview(req: Request, res: Response): Promise<void> {
        this.logger.info('[ThreatController] Starting reanalysis preview (dry-run)');
        try {
            const { limit = 1000 } = req.query as any;
            const result = await this.threatLogService.dryRunAnalyzeLogs(limit.toString());
            res.json(result);
        } catch (err: any) {
            this.logger.error('[ThreatController] Error in reanalysis preview:', err);
            res.status(err.status || 500).json({ error: 'Errore durante preview rianalisi', details: err.message });
        }
    }
}
