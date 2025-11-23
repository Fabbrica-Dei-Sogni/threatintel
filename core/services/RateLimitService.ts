import { logger } from '../../logger';

// Import JS model
const RateLimitEvent = require('../models/RateLimitEventSchema');

class RateLimitService {

    constructor() {

    }

    /**
     * Salva un evento di rate limiting in MongoDB.
     * @param {Object} eventData - Dati evento (ip, limitType, path, ecc.)
     * @returns {Promise} Promise risolta al completamento
     */
    async logEvent(eventData: any) {
        try {
            const event = new RateLimitEvent(eventData);
            return await event.save();
        } catch (error) {
            // Puoi gestire o rilanciare l’errore se vuoi
            throw error;
        }
    }

    /**
     * Restituisce eventi di rate limiting da DB con filtri e paginazione.
     * @param {Object} filter - Filtro query (es. { limitType: 'ddos-protection' })
     * @param {Object} options - Opzioni (limit, skip, sort)
     * @returns {Promise<Array>} Lista eventi
     */
    async getEvents(filter: any = {}, options: any = {}) {
        const events = await RateLimitEvent.find(filter)
            .limit(options.limit || 100)
            .skip(options.skip || 0)
            .sort(options.sort || { timestamp: -1 });
        return events;
    }

    /**
     * Restituisce eventi di rate limiting per uno specifico IP con filtri e paginazione.
     * @param {String} ip - Indirizzo IP da cercare
     * @param {Object} options - Opzioni (limit, skip, sort)
     * @returns {Promise<Array>} Lista eventi per l’IP
     */
    async getEventsByIp({ page = 1, pageSize = 20, filters = {} }: any = {}) {
        const skip = (page - 1) * pageSize;

        const events = await RateLimitEvent.find(filters)
            .limit(Number(pageSize))
            .skip(skip)
            //.sort(options.sort || { timestamp: -1 });
            .sort({ timestamp: -1 })

        return events;
    }

    async countEventsByIp(filters = {}) {
        const count = await RateLimitEvent.countDocuments(filters);
        return count;
    }

}

export default new RateLimitService();
