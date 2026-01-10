
import dotenv from 'dotenv';
import { inject, injectable } from 'tsyringe';
import { LOGGER_TOKEN } from '../../di/tokens';
import { Logger } from 'winston';
import { ConfigService } from '../ConfigService';
import { ForensicPipelineBuilder } from './pipeline/ForensicPipelineBuilder';
import { TimeFilterStage } from './pipeline/stages/TimeFilterStage';
import { MatchFilterStage } from './pipeline/stages/MatchFilterStage';
import { GroupingStage } from './pipeline/stages/GroupingStage';
import { AttackStatsStage } from './pipeline/stages/AttackStatsStage';
import { ScoringStage } from './pipeline/stages/ScoringStage';
import { SequenceAnalysisStage } from './pipeline/stages/SequenceAnalysisStage';
import { PayloadAnalysisStage } from './pipeline/stages/PayloadAnalysisStage';
import { FingerprintAnalysisStage } from './pipeline/stages/FingerprintAnalysisStage';

dotenv.config();

/**
 * Servizio per la gestione della pipeline di analisi forense.
 * Utilizza il pattern Builder per costruire pipeline di aggregazione modulari.
 */
@injectable()
export class ForensicPipelineService {
    private dangerWeights: any;
    private tolleranceWeights: any;
    private suspiciousPatterns: string[] = [];
    private suspiciousReferers: string[] = [];
    private initialized: Promise<void>;

    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        private readonly configService: ConfigService,
    ) {
        this.dangerWeights = {};
        this.tolleranceWeights = {};

        // Inizializza i pesi da DB (come il servizio originale)
        this.initialized = this._initFromDB();
    }

    async _initFromDB() {
        try {
            const [
                dangerWeightStr,
                tolleranceWeightStr,
                suspPatternsStr,
                suspReferersStr
            ] = await Promise.all([
                this.configService.getConfigValue('DANGER_WEIGHT'),
                this.configService.getConfigValue('TOLLERANCE_WEIGHTS'),
                this.configService.getConfigValue('SUSPICIOUS_PATTERNS'),
                this.configService.getConfigValue('SUSPICIOUS_REFERERS'),
            ]);

            // Parsing logic (duplicata dal servizio originale per isolamento)
            this.dangerWeights = this.parseConfig(dangerWeightStr);
            this.tolleranceWeights = this.parseConfig(tolleranceWeightStr);

            // Parsing Liste (CSV based)
            this.suspiciousPatterns = suspPatternsStr ? suspPatternsStr.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
            this.suspiciousReferers = suspReferersStr ? suspReferersStr.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

            this.logger.info(`[ForensicPipelineService] Configurazioni caricate da DB: Patterns=${this.suspiciousPatterns.length}, Referers=${this.suspiciousReferers.length}`);
        } catch (err: any) {
            this.logger.error(`[ForensicPipelineService] Errore caricamento configurazioni: ${err.message}`);
        }
    }

    private parseConfig(configStr: string): any {
        if (!configStr) return {};
        try {
            return JSON.parse(configStr);
        } catch {
            return configStr.split(',').reduce((acc: any, pair: string) => {
                const [key, value] = pair.split(':');
                if (key && value && !isNaN(Number(value))) acc[key] = Number(value);
                return acc;
            }, {});
        }
    }

    /**
     * Crea un nuovo builder per pipelines custom.
     */
    createBuilder(): ForensicPipelineBuilder {
        return new ForensicPipelineBuilder();
    }

    /**
     * Costruisce la pipeline standard per l'analisi (equivalente a buildAttackGroupsBasePipeline nel legacy service).
     */
    async buildStandardPipeline(
        mongoFilters: any,
        minLogsForAttack: number,
        timeConfig: any = null
    ): Promise<any[]> {
        await this.initialized;

        return this.createBuilder()
            .addStage(new TimeFilterStage(timeConfig))
            .addStage(new MatchFilterStage(mongoFilters))
            .addStage(new GroupingStage(minLogsForAttack))
            .addStage(new AttackStatsStage(this.tolleranceWeights))
            // Advanced Analysis Stages (Added for behavioral analysis)
            .addStage(new SequenceAnalysisStage())
            .addStage(new PayloadAnalysisStage(this.suspiciousPatterns))
            .addStage(new FingerprintAnalysisStage(this.suspiciousReferers))
            .addStage(new ScoringStage(this.dangerWeights, this.tolleranceWeights))
            .build();
    }
}
