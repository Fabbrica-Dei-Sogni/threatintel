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

/**
 * Factory function to setup the API router.
 * We use a function to defer component resolution until the DI container is fully initialized.
 */
export default function setupApi() {
    const authMiddleware = getComponent(AuthMiddleware);
    const threatLogger = getComponent(ThreatLogger);
    const rateLimitMiddleware = getComponent(RateLimitMiddleware);
    const routerHub = getComponent(RouterHub);

    const router = express.Router();

    // Register controllers with RouterHub
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
    
    // NOTE: FakeLoginController must be registered last as it contains catch-all '*' routes
    routerHub.register(FakeLoginController);

    // Configuration of Threat Logger
    // IMPORTANT: The threat logging middleware must be FIRST
    router.use(threatLogger.middleware());

    // Security & DDoS protection alignment
    router.use(rateLimitMiddleware.violationTracker());
    router.use(rateLimitMiddleware.ddosProtectionLimiter());
    router.use(rateLimitMiddleware.applicationLimiter());

    // Integration of Swagger Documentation (OpenAPI)
    setupSwagger(router);

    // Global API Protection
    router.use('/api', authMiddleware.isAuthenticated());

    // Bind decorated routes to the router
    routerHub.bindHttp(router, container);

    return router;
}