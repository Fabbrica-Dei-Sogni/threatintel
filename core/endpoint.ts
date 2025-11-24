import express from "express";
import dotenv from 'dotenv';
dotenv.config();

import { logger } from '../logger';
import ratelimitroutes from './apis/ratelimitroutes';
import threatroutes from './apis/threatroutes';
import routes from './apis/routes';
import managelimitroutes from './apis/managelimitroutes';
import { getComponent } from './di/container';
import { ThreatLogService } from "./services/ThreatLogService";
import { IpDetailsService } from "./services/IpDetailsService";
import { RateLimitService } from "./services/RateLimitService";
import { ThreatLogger } from "./threatLogger";

const threatLogService = getComponent(ThreatLogService);
const ipDetailsService = getComponent(IpDetailsService);
const rateLimitService = getComponent(RateLimitService);

const threatLogger = getComponent(ThreatLogger);

const router = express.Router();


// Configurazione Threat Logger

// **IMPORTANTE: Il middleware di threat logging deve essere PRIMO**
router.use(threatLogger.middleware());

//api ratelimit per ottenere informazioni dal rate limiter redis
router.use('/', ratelimitroutes(logger, rateLimitService));

// api dashboard per analizzare i dati
router.use('/', threatroutes(logger, threatLogService, ipDetailsService));

//api honeypot per esporre finti servizi http
router.use('/', routes(logger));

//api honeypot per esporre finti servizi http
router.use('/', managelimitroutes(logger));

export default router;