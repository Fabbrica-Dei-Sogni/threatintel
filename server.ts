/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
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
import { port } from './core/config';
import api from './core/endpoint';
import { getComponent } from './core/di/container';
import { SshLogService } from './core/services/SshLogService';
import { CowrieService } from './core/services/CowrieService';
import { NginxLogService } from './core/services/NginxLogService';
import { RagSyncWorker } from './core/services/assistant/RagSyncWorker';

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
            connectSrc: ["'self'", "https://alessandromodica.com", "http://82.112.255.186:5173", "http://82.112.255.186:4300", "http://localhost:4300"]
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
    origin: ['http://localhost:5173', 'https://alessandromodica.com', 'http://82.112.255.186:5173', 'http://82.112.255.186:4300', 'http://localhost:4300'],
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
        lifecycleManager.register(getComponent(RagSyncWorker));

        // Avvio sequenza di bootstrap (non blocca l'ascolto del server)
        await lifecycleManager.boot();
    } catch (err) {
        logger.error('❌ Errore critico durante il bootstrap dei servizi:', err);
    }
});
