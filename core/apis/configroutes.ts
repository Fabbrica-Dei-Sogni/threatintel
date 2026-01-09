import express from 'express';
import { ConfigService } from '../services/ConfigService';
import { getComponent } from '../di/container';
import { SshLogService } from '../services/SshLogService';
import PatternAnalysisService from '../services/PatternAnalysisService';

const sshLogService = getComponent(SshLogService);
const patternAnalysisService = getComponent(PatternAnalysisService);

export default (logger: any, configService: ConfigService) => {
    const router = express.Router();

    /**
     * Recupera tutte le configurazioni
     * GET /api/config
     */
    router.get('/api/config', async (req, res) => {
        logger.info('Richiesta di recupero tutte le configurazioni');
        try {
            const configs = await configService.getAllConfigs();
            res.json(configs);
        } catch (err: any) {
            logger.error('Errore recupero configurazioni:', err);
            res.status(500).json({ error: 'Errore recupero configurazioni' });
        }
    });

    /**
     * Salva o aggiorna una configurazione
     * POST /api/config
     */
    router.post('/api/config', async (req, res) => {
        const { key, value } = req.body;
        logger.info(`Richiesta di salvataggio configurazione: ${key}`);

        if (!key || value === undefined) {
            return res.status(400).json({ error: 'Key e Value sono obbligatori' });
        }

        try {
            const result = await configService.saveConfig(key, value);

            //carico i parametri da db dopo aver salvato le configurazioni.
            sshLogService.loadConfigFromDB();
            patternAnalysisService.loadConfigFromDB();

            res.json(result);
        } catch (err: any) {
            logger.error(`Errore salvataggio configurazione ${key}:`, err);
            res.status(500).json({ error: 'Errore salvataggio configurazione' });
        }
    });

    /**
     * Elimina una configurazione
     * DELETE /api/config/:key
     */
    router.delete('/api/config/:key', async (req, res) => {
        const { key } = req.params;
        logger.info(`Richiesta di eliminazione configurazione: ${key}`);

        try {
            const deleted = await configService.deleteConfig(key);
            if (deleted) {
                res.json({ message: `Configurazione ${key} eliminata con successo` });
            } else {
                res.status(404).json({ error: 'Configurazione non trovata' });
            }
        } catch (err: any) {
            logger.error(`Errore eliminazione configurazione ${key}:`, err);
            res.status(500).json({ error: 'Errore eliminazione configurazione' });
        }
    });

    /**
     * Ricerca configurazioni
     * POST /api/config/search
     */
    router.post('/api/config/search', async (req, res) => {
        const { query } = req.body;
        logger.info(`Richiesta di ricerca configurazioni con query: ${query}`);

        try {
            const results = await configService.searchConfigs(query || '');
            res.json(results);
        } catch (err: any) {
            logger.error(`Errore ricerca configurazioni con query ${query}:`, err);
            res.status(500).json({ error: 'Errore ricerca configurazioni' });
        }
    });

    return router;
};
