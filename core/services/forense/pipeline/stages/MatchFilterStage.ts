import { PipelineStage } from '../PipelineStage';

export class MatchFilterStage implements PipelineStage {
    constructor(private readonly filters: any) { }

    generate(): any[] {
        const query = { ...this.filters };

        // Se lo status non è specificato esplicitamente, filtriamo per active o null (default trasparente)
        if (!query.status) {
            query.status = { $in: [null, 'active'] };
        }

        if (Object.keys(query).length === 0) {
            return [];
        }

        return [{ $match: query }];
    }
}
