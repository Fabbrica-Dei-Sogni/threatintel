/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */


import dotenv from 'dotenv';
import { inject, injectable } from 'tsyringe';
import { LOGGER_TOKEN } from '../../di/tokens';
import { Logger } from 'winston';
import { ConfigService } from '../ConfigService';
import { ForensicPipelineBuilder } from './pipeline/ForensicPipelineBuilder';
import { TimeFilterStage } from './pipeline/stages/TimeFilterStage';
import { MatchFilterStage } from './pipeline/stages/MatchFilterStage';
import { GroupingStage } from './pipeline/stages/GroupingStage';
import { CampaignGroupingStage } from './pipeline/stages/CampaignGroupingStage';
import { DistributedGroupingStage } from './pipeline/stages/DistributedGroupingStage';
import { AttackStatsStage } from './pipeline/stages/AttackStatsStage';
import { ScoringStage } from './pipeline/stages/ScoringStage';
import { SequenceAnalysisStage } from './pipeline/stages/SequenceAnalysisStage';
import { PayloadAnalysisStage } from './pipeline/stages/PayloadAnalysisStage';
import { FingerprintAnalysisStage } from './pipeline/stages/FingerprintAnalysisStage';

import { TimeConfig } from '../../types/common.types';

dotenv.config();

/**
 * Servizio per la gestione della pipeline di analisi forense.
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
     * Raggruppamento per IP (GroupingStage).
     */
    async buildStandardPipeline(
        mongoFilters: any,
        minLogsForAttack: number,
        timeConfig: TimeConfig | null = null
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

    /**
     * Costruisce la pipeline specifica per l'analisi delle Campagne distribuite (Discovery).
     * Raggruppamento per Hash (CampaignGroupingStage).
     */
    async buildCampaignPipeline(
        mongoFilters: any,
        minLogsForAttack: number,
        timeConfig: any = null
    ): Promise<any[]> {
        await this.initialized;

        return this.createBuilder()
            .addStage(new TimeFilterStage(timeConfig))
            .addStage(new MatchFilterStage(mongoFilters))
            .addStage(new CampaignGroupingStage(minLogsForAttack))
            .addStage(new AttackStatsStage(this.tolleranceWeights))
            .addStage(new SequenceAnalysisStage())
            .addStage(new PayloadAnalysisStage(this.suspiciousPatterns))
            .addStage(new FingerprintAnalysisStage(this.suspiciousReferers))
            .addStage(new ScoringStage(this.dangerWeights, this.tolleranceWeights))
            .build();
    }

    /**
     * Costruisce la pipeline per l'analisi investigativa su una lista di IP (Attacco Distribuito).
     * Raggruppa la lista di IP come un'unica entità virtuale per calcolarne la pericolosità globale.
     */
    async buildDistributedPipeline(
        ipList: string[],
        minLogsForAttack: number,
        timeConfig: any = null,
        protocol: string | null = null
    ): Promise<any[]> {
        await this.initialized;

        if (!ipList || ipList.length === 0) {
            throw new Error("[ForensicPipelineService] ipList non può essere vuota");
        }

        const builder = this.createBuilder()
            .addStage(new TimeFilterStage(timeConfig))
            // Filtra solo gli IP forniti dall'utente
            .addStage(new MatchFilterStage({ 'request.ip': { $in: ipList } }));

        // Filtro opzionale per protocollo (http, ssh, etc.)
        if (protocol) {
            builder.addStage(new MatchFilterStage({ 'protocol': protocol }));
        }

        return builder
            // Raggruppa la lista di IP come un unico cluster (investigazione)
            .addStage(new DistributedGroupingStage(ipList[0], minLogsForAttack))
            // Calcola RPS e durata complessiva sul cluster
            .addStage(new AttackStatsStage(this.tolleranceWeights))
            // Analisi comportamentale e scoring (reuse standard)
            .addStage(new SequenceAnalysisStage())
            .addStage(new PayloadAnalysisStage(this.suspiciousPatterns))
            .addStage(new FingerprintAnalysisStage(this.suspiciousReferers))
            .addStage(new ScoringStage(this.dangerWeights, this.tolleranceWeights))
            .build();
    }
}

