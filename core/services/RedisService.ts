import Redis from 'ioredis';
import { singleton, inject } from 'tsyringe';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';
import dotenv from 'dotenv';

dotenv.config();

export type RedisState = 'disabled' | 'connecting' | 'ready' | 'unavailable';

@singleton()
export class RedisService {
    private client: Redis | null = null;
    private state: RedisState = 'disabled';
    private fallbackLogged = false;

    constructor(@inject(LOGGER_TOKEN) private readonly logger: Logger) {
        this.initialize();
    }

    private initialize() {
        const host = process.env.REDIS_HOST;
        if (!host) {
            this.state = 'disabled';
            return;
        }

        const port = Number(process.env.REDIS_PORT) || 6379;
        const password = process.env.REDIS_PASSWORD;
        const db = Number(process.env.REDIS_DB) || 0;
        const connectTimeout = parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS || '500', 10);
        const commandTimeout = parseInt(process.env.REDIS_COMMAND_TIMEOUT_MS || '500', 10);
        
        // In test mode, we might want to avoid auto-connecting unless specified
        const shouldAutoConnect = process.env.NODE_ENV !== 'test' || process.env.REDIS_RATE_LIMIT_AUTO_CONNECT_IN_TEST === 'true';

        try {
            this.state = 'connecting';
            this.client = new Redis({
                host,
                port,
                password,
                db,
                connectTimeout,
                commandTimeout,
                enableOfflineQueue: false,
                maxRetriesPerRequest: 1,
                lazyConnect: true,
                retryStrategy: (times: number) => Math.min(times * 100, 1000)
            });

            this.client.on('ready', () => {
                this.state = 'ready';
                this.fallbackLogged = false;
                this.logger.info('[REDIS] Rate limiting store ready');
            });

            this.client.on('connect', () => {
                this.state = 'connecting';
                this.logger.info('[REDIS] Rate limiting store connecting');
            });

            this.client.on('reconnecting', () => {
                this.state = 'connecting';
            });

            this.client.on('close', () => {
                this.markUnavailable('connection closed');
            });

            this.client.on('end', () => {
                this.markUnavailable('connection ended');
            });

            this.client.on('error', (err: any) => {
                this.logger.error('[REDIS] Rate limiting store error:', err.message);
                this.markUnavailable(err.message);
            });

            if (shouldAutoConnect) {
                this.client.connect().catch((err: any) => {
                    this.markUnavailable(err.message);
                });
            }
        } catch (error: any) {
            this.logger.warn('[REDIS] Redis initialization failed:', error.message);
            this.state = 'unavailable';
            this.client = null;
        }
    }

    private markUnavailable(message?: string) {
        this.state = 'unavailable';
        if (message && !this.fallbackLogged) {
            this.logger.warn(`[REDIS] Rate limiting store unavailable, falling back to local mode: ${message}`);
            this.fallbackLogged = true;
        }
    }

    public isReady(): boolean {
        return !!this.client && this.state === 'ready' && (this.client.status === 'ready' || this.client.status === 'connect');
    }

    public getClient(): Redis | null {
        return this.client;
    }

    public getState(): RedisState {
        return this.state;
    }

    public async shutdown() {
        if (this.client) {
            await this.client.quit();
            this.client = null;
            this.state = 'disabled';
        }
    }
}
