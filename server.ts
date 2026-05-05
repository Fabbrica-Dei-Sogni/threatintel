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
import { SshLogService } from './core/services/SshLogService';
import { CowrieService } from './core/services/CowrieService';
import { NginxLogService } from './core/services/NginxLogService';
import { RagSyncWorker } from './core/services/assistant/RagSyncWorker';
import { RAG_EVENT_LISTENER_TOKEN, RAG_SYNC_WORKER_TOKEN, STATUS_EVENT_LISTENER_TOKEN, PRUNING_SERVICE_TOKEN } from './core/di/tokens';
import { RagEventListener } from './core/services/assistant/RagEventListener';
import { StatusEventListener } from './core/services/StatusEventListener';
import { PruningService } from './core/services/PruningService';
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

//caricamento api del threat intel
app.use(api);

const PORT = port;
app.listen(Number(PORT), '0.0.0.0', async () => {
    logger.info(`🚀 Server threat intelligence avviato su porta ${PORT}`);
    logger.info(`📊 Dashboard statistiche: http://localhost:${PORT}/api/stats`);
    logger.info(`🕸️  Landing page: http://localhost:${PORT}/`);

    // Bootstrap dei servizi in background tramite LifecycleManager
    try {
        const lifecycleManager = getComponent(LifecycleManager);

        // Registrazione servizi
        lifecycleManager.register(getComponent(SshLogService));
        lifecycleManager.register(getComponent(NginxLogService));
        lifecycleManager.register(getComponent(CowrieService));
        lifecycleManager.register(getComponent(AnalysisService));
        
        // Registrazione RAG Worker
        lifecycleManager.register(getComponent<RagSyncWorker>(RAG_SYNC_WORKER_TOKEN));
        
        // Registrazione RAG Event Listener
        lifecycleManager.register(getComponent<RagEventListener>(RAG_EVENT_LISTENER_TOKEN));

        // Registrazione Status Event Listener
        const statusEventListener = getComponent<StatusEventListener>(STATUS_EVENT_LISTENER_TOKEN);
        lifecycleManager.register({
            serviceName: 'StatusEventListener',
            start: async () => statusEventListener.start(),
            stop: () => {},
            getStatus: () => ServiceStatus.RUNNING
        } as any);

        // Registrazione Pruning Service
        const pruningService = getComponent<PruningService>(PRUNING_SERVICE_TOKEN);
        lifecycleManager.register({
            serviceName: 'PruningService',
            start: async () => pruningService.start(),
            stop: () => pruningService.stop(),
            getStatus: () => ServiceStatus.RUNNING
        } as any);

        // Avvio sequenza di bootstrap (non blocca l'ascolto del server)
        await lifecycleManager.boot();
    } catch (err) {
        logger.error('❌ Errore critico durante il bootstrap dei servizi:', err);
    }
});
