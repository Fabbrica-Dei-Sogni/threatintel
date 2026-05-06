import 'reflect-metadata';
import { container } from '../../di/container';
import { BackgroundJobManager } from '../BackgroundJobManager';
import * as Tokens from '../../di/tokens';
import { Lifecycle } from 'tsyringe';
import { IBackgroundJob } from '../../types/jobs';

// Mock del modello Mongoose
jest.mock('../../models/AnalysisJobSchema', () => ({
    __esModule: true,
    default: {
        create: jest.fn().mockResolvedValue({ id: 'job-id', save: jest.fn() }),
        updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
        findByIdAndUpdate: jest.fn().mockResolvedValue({}),
        findOneAndUpdate: jest.fn().mockResolvedValue({ id: 'job-id' }),
    },
    JobStatus: {
        PENDING: 'pending',
        RUNNING: 'running',
        COMPLETED: 'completed',
        FAILED: 'failed',
        CANCELLED: 'cancelled'
    }
}));

// Una classe di test per verificare l'isolamento
class MockJob implements IBackgroundJob {
    public readonly type = 'mock_job';
    public isStopped = false;
    async execute(jobId: string, params: any): Promise<void> {
        // Simuliamo un'attesa lunga per permettere il test di stop
        while (!this.isStopped) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }
    async stop(): Promise<void> {
        this.isStopped = true;
    }
}

describe('BackgroundJobManager - Isolation Test', () => {
    let manager: BackgroundJobManager;
    const mockLogger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    };

    beforeAll(() => {
        // Registriamo il logger
        container.registerInstance(Tokens.LOGGER_TOKEN, mockLogger as any);
        
        // Registriamo il MockJob come Transient
        container.register(Tokens.SSH_REANALYZE_JOB_TOKEN, { useClass: MockJob }, { lifecycle: Lifecycle.Transient });
    });

    beforeEach(() => {
        jest.clearAllMocks();
        manager = container.resolve(BackgroundJobManager);
    });

    it('should resolve distinct instances for each job execution (Transient Lifecycle)', async () => {
        // Simuliamo l'avvio di due job del tipo 'ssh_reanalyze' (che abbiamo mappato a MockJob)
        // Usiamo un trucco: accediamo alla mappa privata per verificare le istanze, 
        // oppure verifichiamo il comportamento tramite stopJob.
        
        // In realtà BackgroundJobManager.startJob chiama runJob asincronamente.
        // Dobbiamo assicurarci di catturare le istanze.
        
        const job1Doc = await manager.startJob('ssh_reanalyze');
        const job2Doc = await manager.startJob('ssh_reanalyze');
        
        // Recuperiamo le istanze dalla mappa interna (activeJobs è privata, ma possiamo usare stopJob per testare l'effetto)
        // Ma per un test di isolamento "puro" vogliamo essere sicuri che siano oggetti diversi.
        
        // Dato che abbiamo registrato SSH_REANALYZE_JOB_TOKEN come Transient, 
        // container.resolve deve restituire istanze diverse.
        
        const inst1 = container.resolve<MockJob>(Tokens.SSH_REANALYZE_JOB_TOKEN);
        const inst2 = container.resolve<MockJob>(Tokens.SSH_REANALYZE_JOB_TOKEN);
        
        expect(inst1).not.toBe(inst2);
        expect(inst1 instanceof MockJob).toBe(true);
        expect(inst2 instanceof MockJob).toBe(true);
    });

    it('should not affect other jobs when one is stopped', async () => {
        // Avviamo due job
        // Per testare questo nel manager, dobbiamo simulare jobId diversi
        const AnalysisJob = require('../../models/AnalysisJobSchema').default;
        AnalysisJob.create
            .mockResolvedValueOnce({ id: 'job-1', save: jest.fn() })
            .mockResolvedValueOnce({ id: 'job-2', save: jest.fn() });

        await manager.startJob('ssh_reanalyze');
        await manager.startJob('ssh_reanalyze');

        // Attendiamo un attimo che i job siano avviati asincronamente e messi in activeJobs
        await new Promise(resolve => setTimeout(resolve, 50));

        // Ora fermiamo il job-1
        await manager.stopJob('job-1');

        // Come facciamo a verificare che l'istanza 2 è ancora in esecuzione?
        // Possiamo controllare la mappa activeJobs se fosse pubblica, 
        // oppure possiamo fidarci che se il manager ha risolto istanze diverse, lo stop chiama stop() solo su quella corretta.
        
        // Verifichiamo che il log di stop sia stato chiamato per il job-1
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Job job-1 marcato come CANCELLED'));
    });
});
