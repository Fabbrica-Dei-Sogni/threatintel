import { PipelineStage } from '../PipelineStage';

export class MatchFilterStage implements PipelineStage {
    constructor(private readonly filters: any) { }

    generate(): any[] {
        if (!this.filters || Object.keys(this.filters).length === 0) {
            return [];
        }
        return [{ $match: this.filters }];
    }
}
