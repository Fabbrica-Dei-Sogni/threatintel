import { JobStatus } from '../models/AnalysisJobSchema';

export interface IBackgroundJob {
    /**
     * Identificatore univoco del tipo di job (es. 'ssh_reanalyze')
     */
    readonly type: string;

    /**
     * Esegue il job. Deve aggiornare progressivamente lo stato sul database.
     * @param jobId L'ID del documento AnalysisJob creato nel DB
     * @param params Parametri personalizzati per l'esecuzione
     */
    execute(jobId: string, params: any): Promise<void>;

    /**
     * Tenta di fermare il job in corso.
     */
    stop(): Promise<void>;
}

export interface JobExecutionResult {
    processed: number;
    updated: number;
    total: number;
    errors: string[];
}
