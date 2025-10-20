require('dotenv').config();

const logger = require('./core/utils/logger');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const ThreatLogger = require('./core/threatLogger');
const ThreatLogService = require('./core/services/ThreatLogService');
const IpDetailsService = require('./core/services/IpDetailsService');
const RateLimitService = require('./core/services/RateLimitService');
const { scheduleAnalysis } = require('./core/tools/analyze');
const path = require('path');
const { mongoUri, port } = require('./core/config');

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

console.log = (...args) => logger.info(args.join(' '));
console.info = (...args) => logger.info(args.join(' '));
console.warn = (...args) => logger.warn(args.join(' '));
console.error = (...args) => logger.error(args.join(' '));


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
const ratelimitroutes = require('./core/apis/ratelimitroutes')(logger, RateLimitService);
app.use('/', ratelimitroutes);

// api dashboard per analizzare i dati
const threatroutes = require('./core/apis/threatroutes')(logger, ThreatLogService, IpDetailsService);
app.use('/', threatroutes);

//api honeypot per esporre finti servizi http
const routes = require('./core/apis/routes')(logger);
app.use('/', routes);

//api honeypot per esporre finti servizi http
const managelimit = require('./core/apis/managelimitroutes')(logger);
app.use('/', managelimit);





app.listen(PORT, '127.0.0.1', () => {
    console.log(`🚀 Server threat intelligence avviato su porta ${PORT}`);
    console.log(`📊 Dashboard statistiche: http://localhost:${PORT}/api/stats`);
    console.log(`🕸️  Landing page: http://localhost:${PORT}/`);
});

scheduleAnalysis();
