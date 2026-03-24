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
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Trust proxy per IP reali dietro Nginx
app.set('trust proxy', true);

//caricamento api del threat intel
app.use(api);

const PORT = port;
app.listen(Number(PORT), '127.0.0.1', () => {
    logger.info(`🚀 Server threat intelligence avviato su porta ${PORT}`);
    logger.info(`📊 Dashboard statistiche: http://localhost:${PORT}/api/stats`);
    logger.info(`🕸️  Landing page: http://localhost:${PORT}/`);
});

//XXX: verificare il corretto funzionamento del servizio di logging ssh per ora disattivato.
const sshLogService = getComponent(SshLogService);
//XXX: disattivato provvisoriamente il servizio di logging ssh per motivi di performance su grandi volumi di dati.
sshLogService.startMonitoring().catch(err => logger.error('Errore avvio SSH monitoring:', err));

// Avvio job in background di Cowrie per arricchimento Geo-IP degli accessi Telnet
const cowrieService = getComponent(CowrieService);
cowrieService.startEnrichmentJob();

// Avvio monitoraggio log Nginx (HTTPS - solo URI sospetti)
const nginxLogService = getComponent(NginxLogService);
nginxLogService.startMonitoring().catch(err => logger.error('[NginxLogService] Errore avvio:', err));

const analysisService = getComponent(AnalysisService);
analysisService.scheduleAnalysis();
