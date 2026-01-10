
/**
 * Interfaccia comune per tutti gli stage della pipeline di analisi forense.
 */
export interface PipelineStage {
    /**
     * Genera gli step di aggregazione MongoDB per questo stage.
     * @returns Array di oggetti stage MongoDB
     */
    generate(): any[];
}
