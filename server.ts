// MUST BE FIRST: reflect-metadata for TSyringe DI
import "reflect-metadata";
// Bootstrap DI container (side-effect import)
import "./core/di/container";

import dotenv from 'dotenv';
dotenv.config();

import { logger } from './logger';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { AnalysisService } from './core/tools/analyze';
import path from 'path';
import { port } from './core/config';
import api from './core/endpoint';
import { getComponent } from './core/di/container';
import { SshLogService } from './core/services/SshLogService';
import { CowrieService } from './core/services/CowrieService';
import { NginxLogService } from './core/services/NginxLogService';

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
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:"],
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
    exposedHeaders: ['Content-Disposition', 'Content-Length']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Trust proxy per IP reali dietro Nginx
app.set('trust proxy', true);

//caricamento api del threat intel
app.use(api);

const PORT = port;
app.listen(Number(PORT), '127.0.0.1', async () => {
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

        // Avvio sequenza di bootstrap (non blocca l'ascolto del server)
        await lifecycleManager.boot();
    } catch (err) {
        logger.error('❌ Errore critico durante il bootstrap dei servizi:', err);
    }
});
