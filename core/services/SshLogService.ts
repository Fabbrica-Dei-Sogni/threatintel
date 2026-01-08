import { spawn } from 'child_process';
import { inject, singleton } from 'tsyringe';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';
import { ThreatLogService } from './ThreatLogService';
import PatternAnalysisService from './PatternAnalysisService';
import crypto from 'crypto';

@singleton()
export class SshLogService {
    private journalProcess: any = null;

    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        private readonly threatLogService: ThreatLogService,
        private readonly patternAnalysisService: PatternAnalysisService
    ) { }

    /**
     * Avvia il monitoraggio in tempo reale dei log SSH tramite journalctl.
     */
    async startMonitoring() {
        if (this.journalProcess) {
            this.logger.warn('[SshLogService] Monitoraggio già attivo.');
            return;
        }

        // Prima di avviare il monitoraggio real-time, proviamo a recuperare i log recenti (es. ultime 24h)
        await this.backfillLogs('5 hour ago');

        this.logger.info('[SshLogService] Avvio monitoraggio log SSH (journalctl -u ssh)...');

        // Utilizziamo SYSLOG_IDENTIFIER=sshd invece di -u ssh perché è più universale tra le varie distro
        // e spesso più accessibile se l'unità è configurata in modo particolare.
        this.journalProcess = spawn('journalctl', ['SYSLOG_IDENTIFIER=sshd', '-f', '-o', 'json', '-n', '0']);

        this.journalProcess.stdout.on('data', (data: Buffer) => {
            const dataStr = data.toString();
            const lines = dataStr.split('\n');

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const entry = JSON.parse(line);
                    this.processEntry(entry);
                } catch (err) {
                    this.logger.error('[SshLogService] Errore nel parsing della riga del journal', { error: err, line });
                }
            }
        });

        this.journalProcess.stderr.on('data', (data: Buffer) => {
            const errorMsg = data.toString();
            if (errorMsg.includes('not seeing messages from other users')) {
                this.logger.error('[SshLogService] 🛑 PERMESSI INSUFFICIENTI: Il sistema non ha il permesso di leggere i log di altri utenti (sshd).');
                this.logger.error('[SshLogService] 💡 Eseguire: "sudo usermod -aG systemd-journal $USER" e riavviare il server.');
            } else {
                this.logger.error(`[SshLogService] journalctl stderr: ${errorMsg}`);
            }
        });

        this.journalProcess.on('close', (code: number) => {
            this.logger.warn(`[SshLogService] Il processo journalctl è terminato con codice ${code}. Riavvio in 10 secondi...`);
            this.journalProcess = null;
            setTimeout(() => this.startMonitoring(), 10000);
        });

        this.journalProcess.on('error', (err: Error) => {
            this.logger.error('[SshLogService] Errore critico nel processo journalctl', err);
        });
    }

    /**
     * Recupera i log passati.
     * @param since Periodo da recuperare (es. '1 day ago', '1 hour ago')
     */
    async backfillLogs(since: string = '1 day ago') {
        this.logger.info(`[SshLogService] Recupero log SSH pregressi (--since "${since}")...`);

        return new Promise<void>((resolve) => {
            // Usiamo lo stesso identificatore del monitoraggio real-time
            const process = spawn('journalctl', ['SYSLOG_IDENTIFIER=sshd', '--since', since, '-o', 'json', '--no-pager']);
            let buffer = '';
            let processedCount = 0;

            process.stdout.on('data', (data) => {
                buffer += data.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const entry = JSON.parse(line);
                        this.processEntry(entry);
                        processedCount++;
                    } catch (err) {
                        this.logger.error('[SshLogService] Errore nel parsing del log SSH', { error: err, line });
                    }
                }
            });

            process.stderr.on('data', (data) => {
                const errorMsg = data.toString();
                if (errorMsg.includes('not seeing messages from other users')) {
                    this.logger.error('[SshLogService] 🛑 PERMESSI INSUFFICIENTI (Backfill): Non posso caricare lo storico senza il gruppo "systemd-journal".');
                } else {
                    this.logger.error(`[SshLogService] backfill stderr: ${errorMsg}`);
                }
            });

            process.on('close', () => {
                this.logger.info(`[SshLogService] Recupero log pregressi completato. Elaborate ${processedCount} righe.`);
                resolve();
            });

            process.on('error', (err) => {
                this.logger.error('[SshLogService] Errore durante il backfill dei log SSH', err);
                resolve();
            });
        });
    }

    /**
     * Ferma il monitoraggio.
     */
    stopMonitoring() {
        if (this.journalProcess) {
            this.journalProcess.kill();
            this.journalProcess = null;
            this.logger.info('[SshLogService] Monitoraggio SSH fermato.');
        }
    }

    private async processEntry(entry: any) {
        const message = entry.MESSAGE;
        if (!message) return;

        // Logga ogni riga trovata (debug)
        this.logger.debug(`[SshLogService] Analisi riga: ${message}`);

        // Filtriamo solo i messaggi che ci interessano (Failed, Accepted, Invalid)
        if (!message.includes('Failed') && !message.includes('Accepted') && !message.includes('Invalid')) {
            return;
        }

        this.logger.info(`[SshLogService] Trovata riga pertinente: ${message}`);

        // Regexp per estrarre IP e username dai messaggi comuni di sshd
        const failedMatch = message.match(/Failed password for (?:invalid user )?(\S+) from ([\d.]+) port/i);
        const invalidMatch = message.match(/Invalid user (\S+) from ([\d.]+) port/i);
        //esclusi 
        //const acceptedMatch = message.match(/Accepted password for (\S+) from ([\d.]+) port/i);

        let ip = null;
        let user = null;
        let type = null;
        let score = 0;
        let indicators: string[] = [];

        if (failedMatch) {
            user = failedMatch[1];
            ip = failedMatch[2];
            type = 'Failed';
            score = 15;
            indicators = ['SSH_FAILED_PASSWORD'];
        } else if (invalidMatch) {
            user = invalidMatch[1];
            ip = invalidMatch[2];
            type = 'Invalid';
            score = 25;
            indicators = ['SSH_INVALID_USER'];
        }
        /*else if (acceptedMatch) {
            user = acceptedMatch[1];
            ip = acceptedMatch[2];
            type = 'Accepted';
            score = 0;
            indicators = ['SSH_ACCEPTED_PASSWORD'];
        } */

        if (ip) {
            this.logger.info(`[SshLogService] Match riuscito! Tipo: ${type}, User: ${user}, IP: ${ip}`);
            await this.saveAsThreatLog(ip, user, type, message, score, indicators, entry.__CURSOR);
        } else {
            this.logger.warn(`[SshLogService] La riga ha superato il filtro iniziale ma la Regex non ha estratto i dati: ${message}`);
        }
    }

    private async saveAsThreatLog(ip: string, user: string, type: string, rawMessage: string, score: number, indicators: string[], cursor?: string) {
        const geo = this.patternAnalysisService.getGeoLocation(ip);

        // Usiamo il __CURSOR del journal come ID deterministico per evitare duplicati in caso di riavvio o backfill
        let requestId: string;
        if (cursor) {
            requestId = crypto.createHash('md5').update(cursor).digest('hex');
        } else {
            requestId = (crypto as any).randomUUID ? (crypto as any).randomUUID() : crypto.randomBytes(16).toString('hex');
        }

        // Mappatura dei dati SSH sul modello ThreatLog esistente
        const logEntry: any = {
            id: requestId,
            timestamp: new Date(),
            protocol: 'ssh',
            request: {
                ip: ip,
                method: type.toUpperCase(), // Riutilizziamo method per il tipo di evento
                url: `ssh://${user}`,       // Riutilizziamo url per mostrare l'utente target
                userAgent: 'sshd',          // Indichiamo la fonte
                headers: {
                    'raw-log': rawMessage,
                    'ssh-event': type,
                    'ssh-user': user
                }
            },
            geo: geo,
            fingerprint: {
                hash: crypto.createHash('md5').update(`ssh-${ip}-${user}-${type}`).digest('hex'),
                suspicious: score > 0,
                score: score,
                indicators: indicators
            },
            metadata: {
                isBot: false,
                isCrawler: false,
                sshInfo: {
                    user,
                    type,
                    raw: rawMessage
                }
            }
        };

        try {
            await this.threatLogService.saveLog(logEntry);
            this.logger.info(`[SshLogService] Rilevato evento SSH ${type} da ${ip} (utente: ${user})`);
        } catch (err) {
            this.logger.error('[SshLogService] Errore nel salvataggio del log SSH come ThreatLog', err);
        }
    }
}
