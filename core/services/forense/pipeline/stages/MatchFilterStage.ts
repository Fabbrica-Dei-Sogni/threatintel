import { PipelineStage } from '../PipelineStage';

export class MatchFilterStage implements PipelineStage {
    constructor(private readonly filters: any) { }

    generate(): any[] {
        const query = { ...this.filters };

        // Se lo status non è specificato esplicitamente, o è impostato ad 'active',
        // filtriamo per active o null (fallback per i log pre-migrazione)
        if (!query.status || query.status === 'active') {
            query.status = { $in: [null, 'active'] };
        }

        if (Object.keys(query).length === 0) {
            return [];
        }

        return [{ $match: query }];
    }
}
