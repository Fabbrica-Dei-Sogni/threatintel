import express from "express";
import dotenv from 'dotenv';
dotenv.config();

import { logger } from '../logger';
import ratelimitroutes from './apis/ratelimitroutes';
import threatroutes from './apis/threatroutes';
import routes from './apis/routes';
import managelimitroutes from './apis/managelimitroutes';
import configroutes from './apis/configroutes';
import reportroutes from './apis/reportroutes';
import { getComponent } from './di/container';
import { ThreatLogger } from "./threatLogger";
import { CowrieController } from "./controllers/CowrieController";
import { ThreatController } from "./controllers/ThreatController";
import { ConfigController } from "./controllers/ConfigController";
import { RateLimitController } from "./controllers/RateLimitController";
import { ManageLimitController } from "./controllers/ManageLimitController";
import { FakeLoginController } from "./controllers/FakeLoginController";
import { ReportController } from "./controllers/ReportController";
import { DossierController } from "./controllers/DossierController";
import { AuthController } from "./controllers/AuthController";
import { AuthMiddleware } from "./middlewares/AuthMiddleware";
import dossierroutes from './apis/dossierroutes';


// Instantiate controllers via DI container
const threatController = getComponent(ThreatController);
const configController = getComponent(ConfigController);
const rateLimitController = getComponent(RateLimitController);
const manageLimitController = getComponent(ManageLimitController);
const fakeLoginController = getComponent(FakeLoginController);
const cowrieController = getComponent(CowrieController);
const reportController = getComponent(ReportController);
const dossierController = getComponent(DossierController);
const authController = getComponent(AuthController);
const authMiddleware = getComponent(AuthMiddleware);


const threatLogger = getComponent(ThreatLogger);
import { RateLimitMiddleware } from "./rateLimitMiddleware";
const rateLimitMiddleware = getComponent(RateLimitMiddleware);

const router = express.Router();

// Configurazione Threat Logger
// **IMPORTANTE: Il middleware di threat logging deve essere PRIMO**
router.use(threatLogger.middleware());

// Allineamento Sicurezza DDoS Globale (Copertura Frontend + Honeypot)
router.use(rateLimitMiddleware.violationTracker());
router.use(rateLimitMiddleware.ddosProtectionLimiter());
router.use(rateLimitMiddleware.applicationLimiter());

// Proxy Auth Reale (Pubblico)
const authRouter = express.Router();
authRouter.post('/auth/login', (req, res) => authController.login(req, res));
authRouter.post('/auth/register', (req, res) => authController.register(req, res));
router.use('/api', authRouter);

// Protezione Globale API (Escluso le trap e l'auth che passano prima in questo file)
router.use('/api', authMiddleware.isAuthenticated());

// API Dashboards e statistiche
router.use('/', threatroutes(threatController, authMiddleware));

// API Reports
router.use('/', reportroutes(reportController));

// API Rate Limit (Redis)
router.use('/', ratelimitroutes(rateLimitController));

// API Configurazione
router.use('/', configroutes(configController, authMiddleware));

// API Honeypot Telnet (Cowrie)
import cowrieroutes from './apis/cowrieroutes';
router.use('/', cowrieroutes(logger, cowrieController));

// API Dossier (Persistenza investigazioni)
router.use('/', dossierroutes(dossierController));

// API Gestione Limiti (Blacklist manuale)
router.use('/', managelimitroutes(manageLimitController));

//XXX: ogni nuova api da importare definirlo prima di questa istruzione
// API Honeypot Trap e Fake Login
router.use('/', routes(logger, fakeLoginController, rateLimitMiddleware));


export default router;