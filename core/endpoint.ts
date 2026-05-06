/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import express from "express";
import dotenv from 'dotenv';
dotenv.config();

// import ratelimitroutes from './apis/ratelimitroutes'; // [REMOVED]
// import threatroutes from './apis/threatroutes'; // [REMOVED] - Now handled by RouterHub
// import campaignroutes from './apis/campaignroutes'; // [REMOVED]
// import routes from './apis/routes'; // [REMOVED]
// import managelimitroutes from './apis/managelimitroutes'; // [REMOVED]
// import configroutes from './apis/configroutes'; // [REMOVED]
// import dossierroutes from './apis/dossierroutes'; // [REMOVED]
// import authroutes from './apis/authroutes'; // [REMOVED]
// import cowrieroutes from './apis/cowrieroutes'; // [REMOVED]

import { getComponent, container } from './di/container';
import { ThreatLogger } from "./threatLogger";
import { CowrieController } from "./controllers/CowrieController";
import { ThreatController } from "./controllers/ThreatController";
import { CampaignController } from "./controllers/CampaignController";
import { AttackLogController } from "./controllers/AttackLogController";
import { ConfigController } from "./controllers/ConfigController";
import { RateLimitController } from "./controllers/RateLimitController";
import { ManageLimitController } from "./controllers/ManageLimitController";
import { FakeLoginController } from "./controllers/FakeLoginController";
import { ReportController } from "./controllers/ReportController";
import { DossierController } from "./controllers/DossierController";
import { AuthController } from "./controllers/AuthController";
import { JobController } from "./controllers/JobController";
import { AuthMiddleware } from "./middlewares/AuthMiddleware";
import { AssistantController } from "./controllers/AssistantController";
import { McpProtocolController } from "./controllers/McpProtocolController";
import { RateLimitMiddleware } from "./rateLimitMiddleware";
import { setupSwagger } from "./swagger";
import { RouterHub } from "./registry/RouterHub";

// Instantiate controllers via DI container
const authMiddleware = getComponent(AuthMiddleware);

const threatLogger = getComponent(ThreatLogger);
const rateLimitMiddleware = getComponent(RateLimitMiddleware);
const routerHub = getComponent(RouterHub);

const router = express.Router();

// [NEW] Register controllers with RouterHub
routerHub.register(ThreatController);
routerHub.register(AttackLogController);
routerHub.register(CampaignController);
routerHub.register(ConfigController);
routerHub.register(RateLimitController);
routerHub.register(ManageLimitController);
routerHub.register(ReportController);
routerHub.register(DossierController);
routerHub.register(AuthController);
routerHub.register(CowrieController);
routerHub.register(JobController);
routerHub.register(AssistantController);
routerHub.register(McpProtocolController);
//XXX: deve essere registrato per ultimo
routerHub.register(FakeLoginController);

// Configurazione Threat Logger
// **IMPORTANTE: Il middleware di threat logging deve essere PRIMO**
router.use(threatLogger.middleware());

// Allineamento Sicurezza DDoS Globale (Copertura Frontend + Honeypot)
router.use(rateLimitMiddleware.violationTracker());
router.use(rateLimitMiddleware.ddosProtectionLimiter());
router.use(rateLimitMiddleware.applicationLimiter());

// Proxy Auth Reale (Pubblico)
// router.use('/api', authroutes(authController)); // [REMOVED]

// Integrazione Documentazione Swagger (OpenAPI) - PUBBLICA (Visualizzazione consentita a tutti)
setupSwagger(router);

// Protezione Globale API (Escluso le trap e l'auth che passano prima in questo file)
router.use('/api', authMiddleware.isAuthenticated());

// [NEW] Bind decorated routes (ThreatController, etc.)
routerHub.bindHttp(router, container);

export default router;