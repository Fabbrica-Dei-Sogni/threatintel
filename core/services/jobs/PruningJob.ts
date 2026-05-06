import { inject, injectable } from 'tsyringe';
import * as Tokens from '../../di/tokens';
import { Logger } from 'winston';
import { IBackgroundJob } from '../../types/jobs';
import { PruningService, PruningParams } from '../PruningService';
import AnalysisJob from '../../models/AnalysisJobSchema';

@injectable()
export class PruningJob implements IBackgroundJob {
    public readonly type = 'pruning';

    constructor(
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger,
        @inject(Tokens.PRUNING_SERVICE_TOKEN) private readonly pruningService: PruningService
    ) { }

    async execute(jobId: string, params: PruningParams): Promise<void> {
        this.logger.info(`[PruningJob] Avvio operazione di pulizia per il job ${jobId}...`);

        try {
            // 1. Calcolo del totale potenziale per la barra di avanzamento
            const total = await this.pruningService.countPotentialPruning(params);
            
            await AnalysisJob.findByIdAndUpdate(jobId, {
                $set: { 'metadata.total': total }
            });

            this.logger.info(`[PruningJob] Trovati ${total} record potenziali da processare.`);

            // 2. Esecuzione del pruning
            // Nota: Al momento prune() esegue operazioni bulk (updateMany/deleteMany), 
            // quindi il progresso passerà da 0 a 100 velocemente. 
            // In futuro potremmo iterare a blocchi per una barra più fluida.
            const stats = await this.pruningService.prune(params);

            // 3. Aggiornamento finale
            await AnalysisJob.findByIdAndUpdate(jobId, {
                $set: {
                    progress: 100,
                    'metadata.processed': (stats.archived || 0) + (stats.deleted || 0) + (stats.reset || 0),
                    'metadata.archived': stats.archived,
                    'metadata.deleted': stats.deleted,
                    'metadata.reset': stats.reset,
                    'metadata.total': total
                }
            });

            this.logger.info(`[PruningJob] Job ${jobId} completato: ${stats.archived} archiviati, ${stats.deleted} eliminati.`);

        } catch (err: any) {
            this.logger.error(`[PruningJob] Errore critico nel job ${jobId}:`, err);
            throw err;
        }
    }

    async stop(): Promise<void> {
        // Le operazioni bulk di MongoDB non sono facilmente interrompibili a metà 
        // senza logica complessa di cursori, ma il job finisce solitamente in pochi secondi.
    }
}
