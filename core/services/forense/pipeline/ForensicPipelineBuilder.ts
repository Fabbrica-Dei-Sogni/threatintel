import { PipelineStage } from './PipelineStage';

export class ForensicPipelineBuilder {
    private stages: PipelineStage[] = [];

    /**
     * Aggiunge uno stage alla pipeline.
     * @param stage Lo stage da aggiungere
     */
    addStage(stage: PipelineStage): this {
        this.stages.push(stage);
        return this;
    }

    /**
     * Costruisce la pipeline finale concatenando tutti gli stage.
     */
    build(): any[] {
        return this.stages.flatMap(stage => stage.generate());
    }

    /**
     * Resetta la pipeline rimuovendo tutti gli stage.
     */
    reset(): this {
        this.stages = [];
        return this;
    }
}
