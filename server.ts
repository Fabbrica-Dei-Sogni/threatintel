import dotenv from 'dotenv';
dotenv.config();

import logger from './core/utils/logger';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import ThreatLogger from './core/threatLogger';
import ThreatLogService from './core/services/ThreatLogService';
import IpDetailsService from './core/services/IpDetailsService';
import RateLimitService from './core/services/RateLimitService';
import { scheduleAnalysis } from './core/tools/analyze';
import path from 'path';
import { mongoUri, port } from './core/config';
import ratelimitroutes from './core/apis/ratelimitroutes';
import threatroutes from './core/apis/threatroutes';
import routes from './core/apis/routes';
import managelimitroutes from './core/apis/managelimitroutes';

const app = express();
const PORT = port;

//binding delle pagine html fake per altri honeypot page
app.use(express.static(path.join(__dirname, 'public')));

// Configurazione Threat Logger
const threatLogger = new ThreatLogger({
    mongoUri: mongoUri,
    enabled: true,
    geoEnabled: true,
    maxBodySize: 1024 // KB
});

console.log = (...args: any[]) => logger.info(args.join(' '));
console.info = (...args: any[]) => logger.info(args.join(' '));
console.warn = (...args: any[]) => logger.warn(args.join(' '));
console.error = (...args: any[]) => logger.error(args.join(' '));


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

// **IMPORTANTE: Il middleware di threat logging deve essere PRIMO**
app.use(threatLogger.middleware());

//api ratelimit per ottenere informazioni dal rate limiter redis
app.use('/', ratelimitroutes(logger, RateLimitService));

// api dashboard per analizzare i dati
app.use('/', threatroutes(logger, ThreatLogService, IpDetailsService));

//api honeypot per esporre finti servizi http
app.use('/', routes(logger));

//api honeypot per esporre finti servizi http
app.use('/', managelimitroutes(logger));

app.listen(Number(PORT), '127.0.0.1', () => {
    console.log(`🚀 Server threat intelligence avviato su porta ${PORT}`);
    console.log(`📊 Dashboard statistiche: http://localhost:${PORT}/api/stats`);
    console.log(`🕸️  Landing page: http://localhost:${PORT}/`);
});

scheduleAnalysis();
