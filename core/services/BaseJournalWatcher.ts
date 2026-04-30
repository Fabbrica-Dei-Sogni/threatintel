/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */

import { spawn } from 'child_process';
import { Logger } from 'winston';
import { ILongRunningService, ServiceStatus } from '../types/lifecycle';

/**
 * Base abstract class for services that watch system logs via journalctl.
 */
export abstract class BaseJournalWatcher implements ILongRunningService {
    public abstract readonly serviceName: string;
    protected status: ServiceStatus = ServiceStatus.IDLE;
    protected journalProcess: any = null;

    constructor(
        protected readonly logger: Logger
    ) {}

    public getStatus(): ServiceStatus {
        return this.status;
    }

    /**
     * Specific journal identifier for spawn (e.g. SYSLOG_IDENTIFIER=sshd)
     */
    protected abstract getJournalIdentifier(): string[];

    /**
     * Hook to process a single JSON entry from journal
     */
    protected abstract processEntry(entry: any): Promise<void>;

    /**
     * Start the journal monitoring process.
     */
    async start() {
        if (this.status === ServiceStatus.RUNNING) {
            this.logger.warn(`[${this.serviceName}] Monitoraggio già attivo.`);
            return;
        }

        this.status = ServiceStatus.STARTING;
        try {
            const identifier = this.getJournalIdentifier();
            this.logger.info(`[${this.serviceName}] Avvio monitoraggio log (${identifier.join(' ')})...`);

            this.journalProcess = spawn('journalctl', [...identifier, '-f', '-o', 'json', '-n', '0']);

            this.journalProcess.stdout.on('data', (data: Buffer) => {
                this.handleLogData(data);
            });

            this.journalProcess.stderr.on('data', (data: Buffer) => {
                this.handleLogError(data);
            });

            this.journalProcess.on('close', (code: number) => {
                this.logger.warn(`[${this.serviceName}] Processo terminato (code ${code}). Riavvio in 10s...`);
                this.journalProcess = null;
                if (this.status !== ServiceStatus.IDLE) {
                    setTimeout(() => this.start(), 10000);
                }
            });

            this.status = ServiceStatus.RUNNING;
        } catch (err: any) {
            this.logger.error(`[${this.serviceName}] Errore critico durante lo startup: ${err.message}`);
            this.status = ServiceStatus.FAILED;
            throw err;
        }
    }

    /**
     * Stop the journal monitoring process.
     */
    stop() {
        if (this.journalProcess) {
            this.journalProcess.kill();
            this.journalProcess = null;
            this.logger.info(`[${this.serviceName}] Monitoraggio fermato.`);
        }
        this.status = ServiceStatus.IDLE;
    }

    /**
     * Common logic to handle chunks of data from stdout.
     */
    protected handleLogData(data: Buffer) {
        const lines = data.toString().split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const entry = JSON.parse(line);
                this.processEntry(entry);
            } catch (err) {
                this.logger.error(`[${this.serviceName}] Errore nel parsing della riga del journal`, { error: err, line });
            }
        }
    }

    /**
     * Common error message handling for journalctl.
     */
    protected handleLogError(data: Buffer) {
        const msg = data.toString();
        if (msg.includes('not seeing messages from other users')) {
            this.logger.error(`[${this.serviceName}] 🛑 PERMESSI INSUFFICIENTI: Il sistema non ha il permesso di leggere i log.`);
            this.logger.error(`[${this.serviceName}] 💡 Eseguire: "sudo usermod -aG systemd-journal $USER" e riavviare il server.`);
        } else {
            this.logger.error(`[${this.serviceName}] journalctl stderr: ${msg}`);
        }
    }

    /**
     * History recovery (backfill).
     */
    async backfillLogs(since: string = '1 day ago') {
        const identifier = this.getJournalIdentifier();
        this.logger.info(`[${this.serviceName}] Recupero log pregressi (--since "${since}")...`);

        return new Promise<void>((resolve) => {
            const proc = spawn('journalctl', [...identifier, '--since', since, '-o', 'json', '--no-pager']);
            let buffer = '';
            let count = 0;

            proc.stdout.on('data', (data) => {
                buffer += data.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const entry = JSON.parse(line);
                        this.processEntry(entry);
                        count++;
                    } catch { /* ignore parse error on backfill */ }
                }
            });

            proc.on('close', () => {
                this.logger.info(`[${this.serviceName}] Backfill completato (${count} righe).`);
                resolve();
            });
        });
    }
}
