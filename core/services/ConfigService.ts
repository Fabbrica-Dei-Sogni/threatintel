import { injectable } from 'tsyringe';
import { logger } from '../../logger';
import Configuration from '../models/ConfigSchema';

@injectable()
export class ConfigService {
    /**
     * Salva o aggiorna una configurazione key-value
     * @param {string} key 
     * @param {string} value 
     */
    async saveConfig(key: string, value: string) {
        try {
            const result = await Configuration.findOneAndUpdate(
                { key },
                { value },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            logger.info(`[ConfigService] Config saved: ${key}=${value}`);
            return result;
        } catch (error) {
            logger.error(`[ConfigService] Error saving config ${key}:`, error);
            throw error;
        }
    }

    /**
     * Recupera il valore di una configurazione
     * @param {string} key 
     * @returns {Promise<string|null>}
     */
    async getConfigValue(key: string) {
        try {
            const config = await Configuration.findOne({ key });
            if (!config) {
                logger.warn(`[ConfigService] Config not found: ${key}`);
                return null;
            }
            return config.value;
        } catch (error) {
            logger.error(`[ConfigService] Error getting config ${key}:`, error);
            throw error;
        }
    }

    /**
     * Legge tutte le configurazioni key-value presenti
     * @returns {Promise<Array<{key:string,value:string}>>}
     */
    async getAllConfigs() {
        try {
            const configs = await Configuration.find({});
            logger.info(`[ConfigService] getAllConfigs success: ${configs.length} configs retrieved`);
            return configs;
        } catch (error) {
            logger.error(`[ConfigService] Error getting all configs:`, error);
            throw error;
        }
    }
}