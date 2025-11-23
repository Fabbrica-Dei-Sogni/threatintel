import { logger } from '../../logger';
import Configuration from '../models/ConfigSchema';

class ConfigService {
    /**
     * Salva o aggiorna una configurazione key-value
     * @param {string} key 
     * @param {string} value 
     */
    static async saveConfig(key: string, value: string) {
        try {
            const result = await Configuration.findOneAndUpdate(
                { key },
                { value },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            logger.info(`[ConfigService] saveConfig success for key=${key}`);
            return result;
        } catch (error: any) {
            logger.error(`[ConfigService] saveConfig ERROR for key=${key}: ${error.message}`);
            throw error;
        }
    }

    static async getConfigValue(key: string) {
        try {
            const config = await Configuration.findOne({ key });
            if (!config) {
                logger.warn(`[ConfigService] getConfigValue: Configuration not found for key=${key}`);
                return null;
            }
            logger.info(`[ConfigService] getConfigValue success for key=${key}`);
            return config.value;
        } catch (error: any) {
            logger.error(`[ConfigService] getConfigValue ERROR for key=${key}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Legge tutte le configurazioni key-value presenti
     * @returns {Promise<Array<{key:string,value:string}>>}
     */
    static async getAllConfigs() {
        try {
            const configs = await Configuration.find({});
            logger.info(`[ConfigService] getAllConfigs success: ${configs.length} configs retrieved`);
            return configs;
        } catch (error: any) {
            logger.error(`[ConfigService] getAllConfigs ERROR: ${error.message}`);
            throw error;
        }
    }
}

export default ConfigService;
