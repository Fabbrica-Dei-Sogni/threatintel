import { inject, singleton } from 'tsyringe';
import { ThreatLogService } from '../services/ThreatLogService';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';
import dotenv from 'dotenv';
dotenv.config();

@singleton()
export class AnalysisService {
    private timeoutAnalyze: number;

    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        private readonly threatLogService: ThreatLogService
    ) {
        this.timeoutAnalyze = this.parseInterval(process.env.ANALYZE_INTERVAL || '5m');
    }

    public scheduleAnalysis() {
        setInterval(() => this.analyze(), this.timeoutAnalyze);
        this.analyze();
    }

    private async analyze() {
        try {
            const stats = await this.threatLogService.getStats('24h');
            const topThreats = await this.threatLogService.getTopThreats(10);

            this.logger.info(`📊 Statistiche ultime 24h: ${stats.totalRequests}`);
            this.logger.info(`⚠️  Top minacce: ${JSON.stringify(topThreats)}`);
        } catch (error) {
            this.logger.error('Errore durante l\'analisi periodica:', error);
        }
    }

    private parseInterval(val: string, defaultUnit = 's'): number {
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
}
