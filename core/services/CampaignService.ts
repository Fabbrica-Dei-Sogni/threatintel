/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */

import { injectable, inject } from 'tsyringe';
import { Logger } from 'winston';
import ThreatLog from '../models/ThreatLogSchema';
import { calculateCorrelationHubs } from '../utils/CampaignAnalytics';
import { EventBus, AppEvents } from './EventBus';
import { GetCampaignDetailParams, GetCampaignsParams } from '../types/service-params.types';
import { ForensicPipelineService } from './forense/ForensicPipelineService';

import { escapeRegex } from '../utils/queryGuard';
import * as Tokens from '../di/tokens';

@injectable()
export class CampaignService {
    constructor(
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger,
        @inject(Tokens.EVENT_BUS_TOKEN) private readonly eventBus: EventBus,
        @inject(Tokens.FORENSIC_PIPELINE_TOKEN) private readonly forensicPipeline: ForensicPipelineService
    ) { }

    /**
     * Discovery (Lista): Ricerca dei cluster.
     */
    async getCampaigns(params: GetCampaignsParams) {
        const {
            page = 1,
            pageSize = 10,
            selectedUris = [],
            search = '',
            status = 'active',
            protocol = 'http'
        } = params;

        // 1. Preparazione Filtro Mongo Base (richiesto dall'utente)
        const baseFilters: any = {};

        const requestedStatus = status || 'active';

        if (protocol) {
            if (protocol === 'http') {
                baseFilters.$or = [{ protocol: 'http' }, { protocol: { $exists: false } }, { protocol: null }];
            } else {
                baseFilters.protocol = protocol;
            }
        }

        if (selectedUris.length > 0) {
            if (selectedUris.length === 1) {
                const escapedUri = selectedUris[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                baseFilters['request.url'] = { $regex: `^${escapedUri}$`, $options: 'i' };
            } else {
                baseFilters['request.url'] = { $in: selectedUris };
            }
        }

        if (search) {
            const cleanSearch = search.trim();
            if (cleanSearch.length > 0) {
                const searchFilter = {
                    $or: [
                        { 'request.ip': cleanSearch },
                        { 'fingerprint.hash': cleanSearch }
                    ]
                };
                if (baseFilters.$or) {
                    baseFilters.$and = [{ $or: baseFilters.$or }, searchFilter];
                    delete baseFilters.$or;
                } else {
                    baseFilters.$or = searchFilter.$or;
                }
            }
        }

        try {
            // Calcolo date globali per i metadati (bounds temporali)
            const [oldestLog] = await ThreatLog.find(baseFilters).sort({ timestamp: 1 }).limit(1).select('timestamp').lean();
            const [newestLog] = await ThreatLog.find(baseFilters).sort({ timestamp: -1 }).limit(1).select('timestamp').lean();
            const globalMinDate = oldestLog?.timestamp || null;
            const globalMaxDate = newestLog?.timestamp || null;

            const pipeline = await this.forensicPipeline.buildCampaignDiscoveryPipeline(baseFilters, params);

            // Allineamento logica: lo status viene iniettato prima del facet finale
            pipeline.splice(pipeline.length - 1, 0, { $match: { status: requestedStatus } });

            // 3. Esecuzione Aggregazione
            const [result] = await ThreatLog.aggregate(pipeline).allowDiskUse(true);

            // 4. Processamento Risultati (Arricchimento e Filtraggio Correlazioni)
            const allCandidates = result?.discoveryCandidates || [];
            const enrichedAndFiltered = allCandidates
                .map((c: any) => {
                    const hubs = calculateCorrelationHubs(c.timeInfo || []);
                    const { timeInfo, ...rest } = c;
                    return {
                        ...rest,
                        correlationHubsCount: hubs.length
                    };
                })
                .filter((c: any) => c.correlationHubsCount >= Number(params.minCorrelations || 0));

            // 5. Ordinamento e Paginazione Manuale (post-filtro correlazioni)
            const totalCount = enrichedAndFiltered.length;
            const sortedData = enrichedAndFiltered.sort((a: any, b: any) => {
                const dateA = new Date(a.firstSeen).getTime();
                const dateB = new Date(b.firstSeen).getTime();
                return dateB - dateA || b.ipCount - a.ipCount;
            });

            const pNum = Number(page);
            const psNum = Number(pageSize);
            const pagedData = sortedData.slice((pNum - 1) * psNum, pNum * psNum);

            if (pagedData.length > 0) {
                this.eventBus.emit(AppEvents.CAMPAIGN_SEARCHED, pagedData);
            }

            const bIps = result?.boundsIps[0] || { min: 0, max: 0 };
            const bScore = result?.boundsScore[0] || { min: 0, max: 0 };
            const bLogs = result?.boundsLogsPerIp[0] || { min: 0, max: 0 };

            return {
                campaigns: pagedData,
                total: totalCount,
                metadata: {
                    minIpCount: bIps.min || 0,
                    maxIpCount: bIps.max || 0,
                    minScore: bScore.min || 0,
                    maxScore: bScore.max || 0,
                    minLogsPerIp: bLogs.min || 0,
                    maxLogsPerIp: bLogs.max || 0,
                    minDate: globalMinDate,
                    maxDate: globalMaxDate
                }
            };
        } catch (err: any) {
            this.logger.error(`[CampaignService] Discovery Error: ${err.message}`);
            throw err;
        }
    }

    /**
     * Dettaglio (Forensics): Analisi profonda dello stesso cluster con nodi IP arricchiti.
     */
    async getCampaignDetail(params: GetCampaignDetailParams) {
        const {
            hash,
            status = 'active',
            protocol = null
        } = params;

        // 1. Preparazione Filtro Mongo Base
        const baseFilters: any = { 'fingerprint.hash': hash };

        const requestedStatus = status || 'active';

        if (protocol) {
            if (protocol === 'http') {
                baseFilters.$or = [{ protocol: 'http' }, { protocol: { $exists: false } }, { protocol: null }];
            } else {
                baseFilters.protocol = protocol;
            }
        }

        try {
            const pipeline = await this.forensicPipeline.buildCampaignDetailPipeline(baseFilters, params);

            // 3. Esecuzione Aggregazione
            const [result] = await ThreatLog.aggregate(pipeline).allowDiskUse(true);
            const meta = result?.meta[0] || { ipCount: 0, clusterLogs: 0, clusterAvgScore: 0, timeInfo: [] };

            // 4. Calcolo correlazioni e preparazione oggetto finale
            const correlations = calculateCorrelationHubs(meta.timeInfo || []);

            const campaign = {
                hash,
                ipCount: meta.ipCount,
                totaleLogs: meta.clusterLogs,
                averageScore: meta.clusterAvgScore,
                firstSeen: meta.clusterFirstSeen,
                lastSeen: meta.clusterLastSeen,
                sampleUrl: meta.sampleUrl,
                status: requestedStatus,
                allIps: meta.allIps || [],
                correlations,
                nodes: result?.nodes || [],
                page: params.page,
                pageSize: params.pageSize
            };

            this.eventBus.emit(AppEvents.CAMPAIGN_RESOLVED, campaign);

            return campaign;
        } catch (err: any) {
            this.logger.error(`[CampaignService] Detail Error: ${err.message}`);
            throw err;
        }
    }

    /**
     * Recupera gli URI unici (Target URLs) associati alle campagne scoperte.
     */
    async getUniqueSampleUrls(params: any) {
        const {
            protocol = 'http',
            search = '',
            status = 'active'
        } = params;

        // 1. Preparazione Filtro Mongo Base
        const baseFilters: any = {};

        // Gestione Status con fallback
        if (!status) {
            baseFilters.status = 'active';
        } else {
            baseFilters.status = status;
        }

        if (protocol) {
            if (protocol === 'http') {
                baseFilters.$or = [{ protocol: 'http' }, { protocol: { $exists: false } }, { protocol: null }];
            } else {
                baseFilters.protocol = protocol;
            }
        }

        if (search) {
            const cleanSearch = search.trim();
            if (cleanSearch.length > 0) {
                const escapedSearch = escapeRegex(cleanSearch);
                baseFilters['request.url'] = { $regex: escapedSearch, $options: 'i' };
            }
        }

        try {
            // 2. Costruzione Pipeline tramite ForensicPipelineService
            const pipeline = await this.forensicPipeline.buildUniqueSampleUrlsPipeline(baseFilters, params);

            // 3. Esecuzione Aggregazione
            const [result] = await ThreatLog.aggregate(pipeline).allowDiskUse(true);
            return {
                uris: result?.data || [],
                total: result?.totalCount[0]?.count || 0
            };
        } catch (err: any) {
            this.logger.error(`[CampaignService] Unique URIs Error: ${err.message}`);
            throw err;
        }
    }

}
