import Redis from 'ioredis';
import { singleton, inject } from 'tsyringe';
import * as Tokens from '../di/tokens';
import { Logger } from 'winston';
import { AppConfigProvider } from './AppConfigProvider';
import dotenv from 'dotenv';

dotenv.config();

export type RedisState = 'disabled' | 'connecting' | 'ready' | 'unavailable';

@singleton()
export class RedisService {
    private client: Redis | null = null;
    private state: RedisState = 'disabled';
    private fallbackLogged = false;

    constructor(
        @inject(Tokens.LOGGER_TOKEN) private readonly logger: Logger,
        @inject(Tokens.CONFIG_PROVIDER_TOKEN) private readonly config: AppConfigProvider
    ) {
        this.initialize();
    }

    private initialize() {
        const host = this.config.redisHost;
        if (!host) {
            this.state = 'disabled';
            return;
        }

        const port = this.config.redisPort;
        const password = this.config.redisPassword;
        const db = this.config.redisDb;
        const connectTimeout = this.config.redisConnectTimeoutMs;
        const commandTimeout = this.config.redisCommandTimeoutMs;
        
        // In test mode, we might want to avoid auto-connecting unless specified
        const shouldAutoConnect = process.env.NODE_ENV !== 'test' || this.config.redisAutoConnectInTest;

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
                retryStrategy: (times: number) => Math.min(times * this.config.redisRetryDelayMs, this.config.redisMaxRetryDelayMs)
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
