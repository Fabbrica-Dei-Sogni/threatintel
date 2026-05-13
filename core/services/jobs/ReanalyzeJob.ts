import { inject, injectable } from 'tsyringe';
import * as Tokens from '../../di/tokens';
import { Logger } from 'winston';
import { IBackgroundJob } from '../../types/jobs';
import { BackgroundJobManager } from '../BackgroundJobManager';

@injectable()
export class ReanalyzeJob implements IBackgroundJob {
    public readonly type = 'reanalyze';

    constructor(
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger,
        @inject(Tokens.BACKGROUND_JOB_MANAGER_TOKEN) private readonly jobManager: BackgroundJobManager
    ) { }

    async execute(jobId: string, params: any): Promise<void> {
        this.logger.info(`[ReanalyzeJob] Avvio rianalisi completa (HTTP + SSH) per il job ${jobId}...`);
        
        const batchSize = params.batchSize || 100;
        const updateDatabase = params.updateDatabase !== undefined ? params.updateDatabase : true;

        // In questo contesto, il meta-job lancia i due job specifici
        // Nota: non attendiamo il completamento qui per non bloccare il manager, 
        // ma in un'architettura più complessa potremmo monitorarli.
        await this.jobManager.startJob('threat_reanalyze', { batchSize, updateDatabase }, 'system-orchestrator');
        
        // DISABILITATO SU RICHIESTA UTENTE: la rianalisi SSH sarà gestita separatamente
        // await this.jobManager.startJob('ssh_reanalyze', { batchSize }, 'system-orchestrator');
        
        this.logger.info(`[FullReanalyzeJob] Job di rianalisi (HTTP) lanciato con successo.`);
    }

    async stop(): Promise<void> {
        // Il meta-job è istantaneo nel lancio, lo stop non ha effetto sui figli in questo schema semplice
    }
}
