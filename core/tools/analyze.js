// Crea uno script per analisi avanzate
const ThreatLogService = require('../services/ThreatLogService');
const logger = require('../utils/logger');
require('dotenv').config();

const timeoutAnalyze = parseInterval(process.env.ANALYZE_INTERVAL || '5m');

console.log = (...args) => logger.info(args.join(' '));
console.info = (...args) => logger.info(args.join(' '));
console.warn = (...args) => logger.warn(args.join(' '));
console.error = (...args) => logger.error(args.join(' '));


async function analyze() {

    const stats = await ThreatLogService.getStats('24h');
    const topThreats = await ThreatLogService.getTopThreats(10);

    console.log('📊 Statistiche ultime 24h:', stats.totalRequests);
    console.log('⚠️  Top minacce:', topThreats);
}

function scheduleAnalysis() {
    setInterval(analyze, timeoutAnalyze);
    analyze();
}

function parseInterval(val, defaultUnit = 's') {
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


module.exports = {
    analyze,
    scheduleAnalysis,
};
