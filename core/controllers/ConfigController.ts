import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { ConfigService } from '../services/ConfigService';
import { SshLogService } from '../services/SshLogService';
import { PatternAnalysisService } from '../services/PatternAnalysisService';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';

@singleton()
export class ConfigController {
    constructor(
        private configService: ConfigService,
        private sshLogService: SshLogService,
        private patternAnalysisService: PatternAnalysisService,
        @inject(LOGGER_TOKEN) private logger: Logger
    ) {}

    // GET /api/config
    async getAllConfigs(req: Request, res: Response): Promise<void> {
        this.logger.info('[ConfigController] Fetching all configurations');
        try {
            const configs = await this.configService.getAllConfigs();
            res.json(configs);
        } catch (err: any) {
            this.logger.error('[ConfigController] Error fetching configurations:', err);
            res.status(500).json({ error: 'Errore recupero configurazioni' });
        }
    }

    // POST /api/config
    async saveConfig(req: Request, res: Response): Promise<void> {
        const { key, value } = req.body;
        this.logger.info(`[ConfigController] Saving configuration: ${key}`);

        if (!key || value === undefined) {
            res.status(400).json({ error: 'Key e Value sono obbligatori' });
            return;
        }

        try {
            const result = await this.configService.saveConfig(key, value);

            // Reload configurations in dependent services
            await this.sshLogService.loadConfigFromDB();
            await this.patternAnalysisService.loadConfigFromDB();

            res.json(result);
        } catch (err: any) {
            this.logger.error(`[ConfigController] Error saving configuration ${key}:`, err);
            res.status(500).json({ error: 'Errore salvataggio configurazione' });
        }
    }

    // DELETE /api/config/:key
    async deleteConfig(req: Request, res: Response): Promise<void> {
        const key = req.params.key as string;
        this.logger.info(`[ConfigController] Deleting configuration: ${key}`);

        try {
            const deleted = await this.configService.deleteConfig(key);
            if (deleted) {
                res.json({ message: `Configurazione ${key} eliminata con successo` });
            } else {
                res.status(404).json({ error: 'Configurazione non trovata' });
            }
        } catch (err: any) {
            this.logger.error(`[ConfigController] Error deleting configuration ${key}:`, err);
            res.status(500).json({ error: 'Errore eliminazione configurazione' });
        }
    }

    // POST /api/config/search
    async searchConfigs(req: Request, res: Response): Promise<void> {
        const { query } = req.body;
        this.logger.info(`[ConfigController] Searching configurations with query: ${query}`);

        try {
            const results = await this.configService.searchConfigs(query || '');
            res.json(results);
        } catch (err: any) {
            this.logger.error(`[ConfigController] Error searching configurations with query ${query}:`, err);
            res.status(500).json({ error: 'Errore ricerca configurazioni' });
        }
    }
}
