import { PipelineStage } from '../PipelineStage';

export class MatchFilterStage implements PipelineStage {
    constructor(private readonly filters: any) { }

    generate(): any[] {
        const query = { ...this.filters };

        if (Object.keys(query).length === 0) {
            return [];
        }

        return [{ $match: query }];
    }
}
