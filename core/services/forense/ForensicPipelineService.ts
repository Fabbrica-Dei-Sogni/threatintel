/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */


import { inject, injectable } from 'tsyringe';

import { Logger } from 'winston';
import { ConfigService } from '../ConfigService';
import { AppConfigProvider } from '../AppConfigProvider';
import { ForensicPipelineBuilder } from './pipeline/ForensicPipelineBuilder';
import { TimeFilterStage } from './pipeline/stages/TimeFilterStage';
import { MatchFilterStage } from './pipeline/stages/MatchFilterStage';
import { GroupingStage } from './pipeline/stages/GroupingStage';
import { AttackStatsStage } from './pipeline/stages/AttackStatsStage';
import { ScoringStage } from './pipeline/stages/ScoringStage';
import { SequenceAnalysisStage } from './pipeline/stages/SequenceAnalysisStage';
import { PayloadAnalysisStage } from './pipeline/stages/PayloadAnalysisStage';
import { FingerprintAnalysisStage } from './pipeline/stages/FingerprintAnalysisStage';
import { CampaignGroupingStage } from './pipeline/stages/CampaignGroupingStage';
import { DistributedGroupingStage } from './pipeline/stages/DistributedGroupingStage';
import { CampaignDetailGroupingStage } from './pipeline/stages/CampaignDetailGroupingStage';
import { CampaignFacetStage } from './pipeline/stages/CampaignFacetStage';

import { TimeConfig } from '../../types/common.types';

import * as Tokens from '../../di/tokens';

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
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger,
        @inject(Tokens.CONFIG_SERVICE_TOKEN) private readonly configService: ConfigService,
        @inject(Tokens.CONFIG_PROVIDER_TOKEN) private readonly config: AppConfigProvider,
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

            // Se mancano i pesi da DB, usiamo quelli da configurazione (AppConfigProvider) come fallback
            if (Object.keys(this.dangerWeights).length === 0) {
                this.dangerWeights = {
                    RPSNORM: this.config.dangerWeightRpsNorm,
                    DURNORM: this.config.dangerWeightDurNorm,
                    SCORENORM: this.config.dangerWeightScoreNorm,
                    UNIQUETECHNORM: this.config.dangerWeightUniqueTechNorm,
                    DISTRIBUTED: this.config.dangerWeightDistributed
                };
            }

            if (Object.keys(this.tolleranceWeights).length === 0) {
                this.tolleranceWeights = {
                    RPSTOL: this.config.dangerScoreRpsTol,
                    DURTOL: this.config.dangerScoreDurTol,
                    SCORETOL: this.config.dangerScoreScoreTol,
                    DURDECAYTOL: this.config.dangerScoreDurDecayTol
                };
            }

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
     * Costruisce la pipeline specifica per la scoperta delle Campagne (Discovery).
     * Raggruppa per Hash utilizzando la logica a due livelli.
     */
    async buildCampaignDiscoveryPipeline(
        mongoFilters: any,
        params: any
    ): Promise<any[]> {
        await this.initialized;

        return this.createBuilder()
            .addStage(new TimeFilterStage(params.timeConfig))
            .addStage(new MatchFilterStage(mongoFilters))
            .addStage(new CampaignGroupingStage(params.minLogsPerIp))
            .addStage(new CampaignFacetStage(params.minIps, params.minScore))
            .build();
    }

    /**
     * Costruisce la pipeline per il dettaglio di una singola Campagna (Forensics).
     */
    async buildCampaignDetailPipeline(
        mongoFilters: any,
        params: any
    ): Promise<any[]> {
        await this.initialized;

        return this.createBuilder()
            .addStage(new TimeFilterStage(params.timeConfig))
            .addStage(new MatchFilterStage(mongoFilters))
            .addStage(new CampaignDetailGroupingStage(
                params.minLogsPerIp,
                params.minScore,
                params.page,
                params.pageSize
            ))
            .build();
    }

    /**
     * Costruisce la pipeline per recuperare gli URI unici (Target URLs) associati alle campagne.
     */
    async buildUniqueSampleUrlsPipeline(
        mongoFilters: any,
        params: any
    ): Promise<any[]> {
        await this.initialized;

        const {
            minIps = 2,
            minScore = 0,
            sortBy = 'count',
            order = -1,
            page = 1,
            pageSize = 20
        } = params;

        const sortStage: any = {};
        if (sortBy === 'uri') sortStage.uri = order;
        else if (sortBy === 'logs') sortStage.totaleLogs = order;
        else sortStage.campaignCount = order;

        return this.createBuilder()
            .addStage(new TimeFilterStage(params.timeConfig))
            .addStage(new MatchFilterStage(mongoFilters))
            .addStage(new CampaignGroupingStage(1)) // minLogsPerIp = 1 per gli URI
            .addStage({
                generate: () => [
                    { $match: { ipCount: { $gte: Number(minIps) }, averageScore: { $gte: Number(minScore) } } },
                    {
                        $group: {
                            _id: '$sampleUrl',
                            campaignCount: { $sum: 1 },
                            totaleLogs: { $sum: '$totaleLogs' },
                            lastSeen: { $max: '$lastSeen' }
                        }
                    },
                    {
                        $project: {
                            uri: { $ifNull: ['$_id', '/'] },
                            campaignCount: 1,
                            totaleLogs: 1,
                            lastSeen: 1
                        }
                    },
                    {
                        $facet: {
                            data: [
                                { $sort: sortStage },
                                { $skip: (page - 1) * pageSize },
                                { $limit: pageSize }
                            ],
                            totalCount: [
                                { $count: 'count' }
                            ]
                        }
                    }
                ]
            })
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
        protocol: string | null = null,
        status: string | null = null
    ): Promise<any[]> {
        await this.initialized;

        if (!ipList || ipList.length === 0) {
            throw new Error("[ForensicPipelineService] ipList non può essere vuota");
        }

        const filters: any = { 'request.ip': { $in: ipList } };
        if (status) {
            filters.status = status;
        }

        const builder = this.createBuilder()
            .addStage(new TimeFilterStage(timeConfig))
            // Filtra solo gli IP forniti dall'utente e lo stato richiesto
            .addStage(new MatchFilterStage(filters));

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

