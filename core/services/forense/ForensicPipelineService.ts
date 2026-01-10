
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

dotenv.config();

/**
 * Servizio per la gestione della pipeline di analisi forense.
 * Utilizza il pattern Builder per costruire pipeline di aggregazione modulari.
 */
@injectable()
export class ForensicPipelineService {
    private dangerWeights: any;
    private tolleranceWeights: any;
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
                tolleranceWeightStr
            ] = await Promise.all([
                this.configService.getConfigValue('DANGER_WEIGHT'),
                this.configService.getConfigValue('TOLLERANCE_WEIGHTS'),
            ]);

            // Parsing logic (duplicata dal servizio originale per isolamento)
            this.dangerWeights = this.parseConfig(dangerWeightStr);
            this.tolleranceWeights = this.parseConfig(tolleranceWeightStr);

            this.logger.info(`[ForensicPipelineService] Configurazioni caricate da DB`);
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
            .addStage(new ScoringStage(this.dangerWeights, this.tolleranceWeights))
            .build();
    }
}
