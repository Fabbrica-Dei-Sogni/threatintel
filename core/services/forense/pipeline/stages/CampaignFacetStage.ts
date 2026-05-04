import { PipelineStage } from '../PipelineStage';

/**
 * Stage per la generazione dei Facet nella Discovery delle Campagne.
 * Calcola i candidati filtrati e i bounds (min/max) per i vari parametri.
 */
export class CampaignFacetStage implements PipelineStage {
    constructor(
        private readonly minIps: number = 2,
        private readonly minScore: number = 0
    ) { }

    generate(): any[] {
        return [
            {
                $facet: {
                    discoveryCandidates: [
                        { $match: { ipCount: { $gte: Number(this.minIps) }, averageScore: { $gte: Number(this.minScore) } } },
                        { $sort: { firstSeen: -1 as const, ipCount: -1 as const } }
                    ],
                    totalFiltered: [
                        { $match: { ipCount: { $gte: Number(this.minIps) }, averageScore: { $gte: Number(this.minScore) } } },
                        { $count: "total" }
                    ],
                    boundsIps: [
                        { $match: { averageScore: { $gte: Number(this.minScore) } } },
                        { $group: { _id: null, min: { $min: "$ipCount" }, max: { $max: "$ipCount" } } }
                    ],
                    boundsScore: [
                        { $match: { ipCount: { $gte: Number(this.minIps) } } },
                        { $group: { _id: null, min: { $min: "$averageScore" }, max: { $max: "$averageScore" } } }
                    ],
                    boundsLogsPerIp: [
                        { $match: { ipCount: { $gte: Number(this.minIps) }, averageScore: { $gte: Number(this.minScore) } } },
                        { $group: { _id: null, min: { $min: "$maxLogsInThisCampaign" }, max: { $max: "$maxLogsInThisCampaign" } } }
                    ]
                }
            }
        ];
    }
}
