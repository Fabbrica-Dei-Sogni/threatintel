import express from "express";
import dotenv from 'dotenv';
dotenv.config();

import { logger } from '../logger';
import ThreatLogger from './threatLogger';
import ThreatLogService from './services/ThreatLogService';
import IpDetailsService from './services/IpDetailsService';
import RateLimitService from './services/RateLimitService';
import { mongoUri } from './config';
import ratelimitroutes from './apis/ratelimitroutes';
import threatroutes from './apis/threatroutes';
import routes from './apis/routes';
import managelimitroutes from './apis/managelimitroutes';

const router = express.Router();


// Configurazione Threat Logger
const threatLogger = new ThreatLogger({
    mongoUri: mongoUri,
    enabled: true,
    geoEnabled: true,
    maxBodySize: 1024 // KB
});

// **IMPORTANTE: Il middleware di threat logging deve essere PRIMO**
router.use(threatLogger.middleware());

//api ratelimit per ottenere informazioni dal rate limiter redis
router.use('/', ratelimitroutes(logger, RateLimitService));

// api dashboard per analizzare i dati
router.use('/', threatroutes(logger, ThreatLogService, IpDetailsService));

//api honeypot per esporre finti servizi http
router.use('/', routes(logger));

//api honeypot per esporre finti servizi http
router.use('/', managelimitroutes(logger));

export default router;