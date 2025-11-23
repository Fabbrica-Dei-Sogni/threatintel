import ThreatLogService from '../services/ThreatLogService';
import { logger } from '../../logger';
import dotenv from 'dotenv';

dotenv.config();

const timeoutAnalyze = parseInterval(process.env.ANALYZE_INTERVAL || '5m');

export function scheduleAnalysis() {
    setInterval(analyze, timeoutAnalyze);
    analyze();
}

async function analyze() {

    const stats = await ThreatLogService.getStats('24h');
    const topThreats = await ThreatLogService.getTopThreats(10);

    logger.info(`📊 Statistiche ultime 24h: ${stats.totalRequests}`);
    logger.info(`⚠️  Top minacce: ${JSON.stringify(topThreats)}`);
}

function parseInterval(val: string, defaultUnit = 's'): number {
    if (!val) throw new Error('Interval value is required');

    // Riconosce formato tipo '5m', '30s', o anche solo '120'
    const match = /^(\d+)\s*([a-zA-Z]*)$/.exec(val.trim());
    if (!match) throw new Error('Invalid interval format');

    const [, num, unit] = match;
    const value = parseInt(num, 10);

    switch ((unit || defaultUnit).toLowerCase()) {
        case 'm':
        case 'min':
            return value * 60 * 1000;
        case 's':
        case 'sec':
        case '':
            return value * 1000; // default a secondi se manca unità
        default:
            throw new Error(`Unità non supportata: "${unit}"`);
    }
}
