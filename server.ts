// MUST BE FIRST: reflect-metadata for TSyringe DI
import "reflect-metadata";
import dotenv from 'dotenv';
dotenv.config();

// Bootstrap DI container (side-effect import)
import "./core/di/container";

import { logger } from './logger';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { AnalysisService } from './core/tools/analyze';
import path from 'path';
import { port, allowedOrigins } from './core/config';
import api from './core/endpoint';
import { getComponent } from './core/di/container';
import * as Tokens from './core/di/tokens';
import { ServiceStatus } from './core/types/lifecycle';
import { LifecycleManager } from './core/services/LifecycleManager';

const app = express();


//binding delle pagine html fake per altri honeypot page
app.use(express.static(path.join(__dirname, 'public')));

// Middleware di sicurezza
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https://validator.swagger.io"],
            connectSrc: ["'self'", ...allowedOrigins]
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Middleware generali
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    exposedHeaders: ['Content-Disposition', 'Content-Length']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Trust proxy per IP reali dietro Nginx
app.set('trust proxy', true);

// carichiamo le api del threat intel
app.use(api);

const PORT = port;
const server = app.listen(Number(PORT), '0.0.0.0', async () => {
    logger.info(`🚀 Server threat intelligence avviato su porta ${PORT}`);
    logger.info(`📊 Dashboard statistiche: http://localhost:${PORT}/api/stats`);
    logger.info(`🕸️  Landing page: http://localhost:${PORT}/`);

    // Bootstrap dei servizi in background tramite LifecycleManager
    try {
        const lifecycleManager = getComponent(LifecycleManager);

        // Registrazione servizi tramite Token
        lifecycleManager.register(getComponent(Tokens.SSH_LOG_SERVICE_TOKEN));
        lifecycleManager.register(getComponent(Tokens.NGINX_LOG_SERVICE_TOKEN));
        lifecycleManager.register(getComponent(Tokens.COWRIE_SERVICE_TOKEN));
        lifecycleManager.register(getComponent(Tokens.ANALYSIS_SERVICE_TOKEN));
        
        // Registrazione RAG Worker e Listener
        lifecycleManager.register(getComponent(Tokens.RAG_SYNC_WORKER_TOKEN));
        lifecycleManager.register(getComponent(Tokens.RAG_EVENT_LISTENER_TOKEN));

        // Registrazione Status Event Listener
        const statusEventListener = getComponent(Tokens.STATUS_EVENT_LISTENER_TOKEN);
        lifecycleManager.register({
            serviceName: 'StatusEventListener',
            start: async () => (statusEventListener as any).start(),
            stop: () => {},
            getStatus: () => ServiceStatus.RUNNING
        } as any);

        // Registrazione Pruning Service
        const pruningService = getComponent(Tokens.PRUNING_SERVICE_TOKEN);
        lifecycleManager.register({
            serviceName: 'PruningService',
            start: async () => (pruningService as any).start(),
            stop: () => (pruningService as any).stop(),
            getStatus: () => ServiceStatus.RUNNING
        } as any);

        // Avvio sequenza di bootstrap (non blocca l'ascolto del server)
        await lifecycleManager.boot();

        // --- Gestione Graceful Shutdown ---
        const shutdown = async (signal: string) => {
            logger.info(`\n[Server] Ricevuto segnale ${signal}. Avvio spegnimento controllato...`);
            
            // 1. Ferma l'accettazione di nuove connessioni HTTP
            server.close(() => {
                logger.info('[Server] HTTP server chiuso.');
            });

            // 2. Ferma i servizi in background (es. flush dei buffer)
            await lifecycleManager.shutdown();

            logger.info('[Server] Shutdown completato. Uscita.');
            process.exit(0);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (err) {
        logger.error('❌ Errore critico durante il bootstrap dei servizi:', err);
    }
});
