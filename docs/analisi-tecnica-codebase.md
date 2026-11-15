# Analisi Tecnica e Funzionale della Codebase - Threat Intelligence Honeypot

> [!WARNING]
> Snapshot tecnico storico, non allineato alla codebase corrente. In particolare, le sezioni che descrivono autenticazione incompleta, modelli auth inutilizzati e servizi JavaScript non devono essere usate come stato attuale. Consultare il [PRODUCT.md del Kit Harness](../../devops-procedure/codeassist/products/threatintel/PRODUCT.md) per stack e comandi e `auth_integration.md` per l'integrazione di autenticazione. Le altre valutazioni richiedono una verifica prima di essere riutilizzate.

## 📋 Indice
1. [Panoramica del Sistema](#panoramica-del-sistema)
2. [Architettura Generale](#architettura-generale)
3. [Stack Tecnologico](#stack-tecnologico)
4. [Componenti Backend](#componenti-backend)
5. [Componenti Frontend](#componenti-frontend)
6. [Infrastruttura e Deployment](#infrastruttura-e-deployment)
7. [Sicurezza e Rate Limiting](#sicurezza-e-rate-limiting)
8. [Analisi delle Minacce](#analisi-delle-minacce)
9. [Database e Persistenza](#database-e-persistenza)
10. [Punti di Forza](#punti-di-forza)
11. [Aree di Miglioramento](#aree-di-miglioramento)
12. [Conclusioni](#conclusioni)

---

## 🎯 Panoramica del Sistema

**Nome Progetto**: Threat Intelligence Logger (Honeypot)  
**Versione**: 1.0.0  
**Obiettivo**: Sistema di logging e analisi per threat intelligence domestica, progettato per catturare, analizzare e catalogare tentativi di attacco su servizi esposti.

### Scopo Funzionale
Il sistema è un **honeypot avanzato** che:
- Cattura richieste HTTP sospette su endpoint finti
- Esegue analisi forense delle minacce in tempo reale
- Integra fonti di reputazione IP esterne (AbuseIPDB, IPInfo, WHOIS)
- Fornisce dashboard interattiva per visualizzazione e analisi
- Implementa rate limiting multilivello e blacklist automatica

---

## 🏗️ Architettura Generale

### Modello Architetturale
L'applicazione segue un'architettura **Client-Server a 3 livelli**:

```mermaid
graph TB
    subgraph "Client Layer"
        FE[Dashboard Vue.js]
    end
    
    subgraph "Proxy Layer"
        NGINX[Nginx Reverse Proxy]
    end
    
    subgraph "Application Layer"
        BE[Express.js Backend]
        TL[ThreatLogger Middleware]
        RL[Rate Limiter]
        APIs[REST APIs]
    end
    
    subgraph "Data Layer"
        MONGO[(MongoDB)]
        REDIS[(Redis)]
    end
    
    subgraph "External Services"
        ABUSE[AbuseIPDB API]
        IPINFO[IPInfo API]
        WHOIS[WHOIS Lookup]
        AUTH[Digital Auth]
    end
    
    FE -->|HTTPS| NGINX
    NGINX -->|Proxy Pass| BE
    BE --> TL
    TL --> RL
    BE --> APIs
    APIs --> MONGO
    RL --> REDIS
    BE --> ABUSE
    BE --> IPINFO
    BE --> WHOIS
    APIs --> AUTH
```

### Flusso di Request Processing

1. **Ricezione Richiesta**
   - Nginx riceve richiesta HTTPS
   - Proxy verso Express.js su localhost:3999

2. **Middleware Chain**
   - Security headers (Helmet)
   - CORS configuration
   - ThreatLogger middleware
   - Rate limiting checks
   - Route handlers

3. **Threat Analysis**
   - Fingerprinting della richiesta
   - Pattern analysis (SQL injection, XSS, path traversal, JNDI)
   - Geolocalizzazione IP
   - Score di pericolosità

4. **Persistenza**
   - Salvataggio log su MongoDB
   - Tracking rate limit su Redis
   - Aggiornamento reputazione IP

---

## 💻 Stack Tecnologico

### Backend
| Tecnologia | Versione | Utilizzo |
|-----------|----------|----------|
| **Node.js** | Latest (via nvm) | Runtime JavaScript |
| **Express.js** | 4.18.2 | Web framework |
| **Mongoose** | 7.5.0 | ODM per MongoDB |
| **ioRedis** | 5.7.0 | Client Redis |
| **Helmet** | 7.2.0 | Security headers |
| **Winston** | 3.17.0 | Logger centralizzato |
| **Axios** | 1.11.0 | HTTP client |

### Frontend
| Tecnologia | Versione | Utilizzo |
|-----------|----------|----------|
| **Vue.js** | 3.3.4 | Framework UI |
| **TypeScript** | 5.9.2 | Type safety |
| **Element Plus** | 2.11.2 | UI component library |
| **Pinia** | 2.1.4 | State management |
| **Chart.js** | 4.4.0 | Data visualization |
| **Vue Router** | 4.3.4 | Routing |
| **Vite** | 7.1.4 | Build tool |

### Infrastructure
| Componente | Tecnologia | Configurazione |
|-----------|-----------|----------------|
| **Database** | MongoDB | Docker Compose, porta 17017 |
| **Cache/Rate Limit** | Redis | Docker Compose, porta 6379 |
| **Reverse Proxy** | Nginx | SSL/TLS, proxy pass |
| **Process Manager** | systemd | Service `threatintel.service` |

---

## 🔧 Componenti Backend

### 1. Core Services (`core/services/`)

#### ThreatLogService
**Percorso**: [`core/services/ThreatLogService.js`](file:///home/amodica/workspaces/threatintel/core/services/ThreatLogService.js)

**Responsabilità**:
- Salvataggio e recupero log di minacce
- Aggregazione attacchi per IP/fingerprint
- Calcolo statistiche (total requests, suspicious requests, top threats)
- Analisi forense batch e assegnazione IP details

**Metodi Principali**:
```javascript
class ThreatLogService {
    saveLog(logEntry)                          // Salva log minaccia
    getLogs({ page, pageSize, filters })       // Lista paginata
    getAttacks({ minLogsForAttack, filters })  // Aggregazione attacchi
    analyzeLogs({ batchSize })                 // Analisi batch
    getStats(timeframe)                        // Statistiche temporali
    getTopThreats(limit)                       // Top N minacce
}
```

**Pattern utilizzati**:
- ✅ Singleton pattern (`module.exports = new ThreatLogService()`)
- ✅ Aggregation pipeline MongoDB per performance
- ✅ Paginazione server-side

---

#### IpDetailsService
**Percorso**: [`core/services/IpDetailsService.js`](file:///home/amodica/workspaces/threatintel/core/services/IpDetailsService.js)

**Responsabilità**:
- Enrichment IP con sorgenti esterne (WHOIS, IPInfo, AbuseIPDB)
- Gestione cache IP details su MongoDB
- Esclusione IP whitelist (CIDR/ranges)
- Tracking reputazione IP

**Funzionalità chiave**:
- **WHOIS lookup**: Informazioni registrar/ASN
- **IPInfo API**: Geolocalizzazione, ISP, tipo connessione
- **AbuseIPDB**: Score di reputazione e report abuse
- **IP range checking**: Esclusione range privati/trusted

**Configurazione** (`.env`):
```bash
EXCLUDED_IPS=127.0.0.1,::1,192.168.1.100,203.0.113.0/24
ABUSEIPDB_KEY=<api_key>
```

---

#### PatternAnalysisService
**Percorso**: [`core/services/PatternAnalysisService.js`](file:///home/amodica/workspaces/threatintel/core/services/PatternAnalysisService.js)

**Responsabilità**:
- Rilevamento pattern di attacco (SQL injection, XSS, path traversal)
- Fingerprinting richieste (hash di IP + User-Agent + headers)
- Calcolo score di pericolosità
- Detection bot/crawler

**Pattern rilevati**:
```javascript
const patterns = {
    sqlInjection: /(\bunion\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b)/i,
    xss: /(<script|javascript:|onerror=|onload=)/i,
    pathTraversal: /(\.\.[\/\\]|\.\.%2f)/i,
    jndi: /\$\{jndi:/i,
    commonAttacks: /(eval\(|exec\(|system\(|passthru\()/i
}
```

**Scoring**:
- Base score per pattern match
- Incremento per multiple indicators
- Detection bot via User-Agent patterns
- Referer sospetti

**Configurazione dinamica**:
- Caricamento pattern da MongoDB (`ConfigSchema` con `category: 'analysis'`)

---

#### RateLimitService
**Percorso**: [`core/services/RateLimitService.js`](file:///home/amodica/workspaces/threatintel/core/services/RateLimitService.js)

**Responsabilità**:
- Logging eventi rate limit su MongoDB
- Query eventi per diagnostica

---

#### ConfigService
**Percorso**: [`core/services/ConfigService.js`](file:///home/amodica/workspaces/threatintel/core/services/ConfigService.js)

**Responsabilità**:
- Gestione configurazioni dinamiche da MongoDB
- CRUD operazioni su `ConfigSchema`

---

#### ForensicService
**Percorso**: [`core/services/forense/ForensicService.js`](file:///home/amodica/workspaces/threatintel/core/services/forense/ForensicService.js)

**Responsabilità**:
- Analisi forense avanzata delle minacce
- Estrazione indicatori di compromissione (IOC)

---

### 2. Middleware Layer

#### ThreatLogger Middleware
**Percorso**: [`core/threatLogger.js`](file:///home/amodica/workspaces/threatintel/core/threatLogger.js)

**Responsabilità**:
- Intercettazione richieste HTTP
- Estrazione IP reale (gestione reverse proxy)
- Sanitizzazione headers/body
- Rilevamento payload JNDI (Log4Shell)
- Salvataggio log strutturato

**Caratteristiche**:
- ✅ Skip logging per `/api/*` (endpoint interni)
- ✅ Gestione proxy headers (`X-Forwarded-For`, `X-Real-IP`)
- ✅ Sanitizzazione dati sensibili (password, token, keys)
- ✅ Truncation body > maxBodySize
- ✅ Request ID tracking (UUID)

**Flusso**:
```javascript
middleware() {
    return async (req, res, next) => {
        // 1. Estrai IP reale
        // 2. Valida IP vs JNDI payload
        // 3. Genera fingerprint
        // 4. Analizza pattern
        // 5. Geolocalizza
        // 6. Log on response finish
        next();
    }
}
```

---

#### Rate Limiting Middleware
**Percorso**: [`core/rateLimitMiddleware.js`](file:///home/amodica/workspaces/threatintel/core/rateLimitMiddleware.js)

**Livelli di protezione**:

| Limiter | Window | Max Requests | Scopo |
|---------|--------|--------------|-------|
| **DDoS Protection** | 1 min | 100 | Protezione generale |
| **Critical Endpoints** | 15 min | 20 | Login, admin |
| **Trap Endpoints** | 5 min | 50 | Honeypot specifici |
| **Application** | 1 min | 200 | Rate app generale |

**Blacklist automatica**:
- Tracking violazioni su Redis (`violations:{ip}`)
- Soglia: 5 violazioni in 1 ora → blacklist 2 ore
- Blacklist manuale via API

**Store**:
- Redis distribuito (produzione)
- Memory fallback (sviluppo)

---

### 3. API Routes (`core/apis/`)

#### Threat Routes
**Percorso**: [`core/apis/threatroutes.js`](file:///home/amodica/workspaces/threatintel/core/apis/threatroutes.js)

**Endpoints**:
```
GET  /api/stats                    # Statistiche aggregate
GET  /api/threats                  # Lista minacce paginate
GET  /api/threats/:id              # Dettaglio minaccia
GET  /api/attacks                  # Attacchi aggregati
GET  /api/ip/:ip/details           # Dettagli IP arricchiti
POST /api/ip/:ip/enrich            # Trigger enrichment manuale
GET  /api/ip/distinct              # Lista IP unici
POST /api/analyze/dry-run          # Dry run analisi
POST /api/analyze                  # Analisi batch
```

**Autenticazione**:
- Token validation verso Digital Auth (opzionale)
- Endpoint pubblici per dashboard

---

#### Rate Limit Routes
**Percorso**: [`core/apis/ratelimitroutes.js`](file:///home/amodica/workspaces/threatintel/core/apis/ratelimitroutes.js)

**Endpoints**:
```
GET  /api/ratelimit/events         # Eventi rate limit
GET  /api/ratelimit/stats          # Statistiche rate limit
```

---

#### Manage Limit Routes
**Percorso**: [`core/apis/managelimitroutes.js`](file:///home/amodica/workspaces/threatintel/core/apis/managelimitroutes.js)

**Endpoints**:
```
POST /api/blacklist/:ip            # Blacklist manuale IP
GET  /api/blacklist/status/:ip     # Controllo blacklist
```

---

#### Honeypot Routes
**Percorso**: [`core/apis/routes.js`](file:///home/amodica/workspaces/threatintel/core/apis/routes.js)

**Endpoints finti** (configurabili via `.env`):
```
/admin, /wp-admin, /phpmyadmin, /manager/html,
/console, /panel, /control, /dashboard,
/api, /api/v1, /rest, /graphql, /uaa,
/actuator, /solr, /jenkins, /login, /manage, /setup
```

**Risposta**: Redirect a pagina 404 personalizzata + logging

---

### 4. Data Models (`core/models/`)

#### ThreatLogSchema
**Percorso**: [`core/models/ThreatLogSchema.js`](file:///home/amodica/workspaces/threatintel/core/models/ThreatLogSchema.js)

**Schema**:
```javascript
{
    id: String,                    // UUID richiesta
    timestamp: Date,
    request: {
        ip: String,
        jndiPayload: String,       // Payload JNDI rilevato
        method: String,
        url: String,
        userAgent: String,
        referer: String,
        headers: Object,
        body: Object,
        query: Object
    },
    geo: {
        country: String,
        city: String,
        lat: Number,
        lon: Number
    },
    fingerprint: {
        hash: String,
        suspicious: Boolean,
        score: Number,
        indicators: [String]       // Pattern rilevati
    },
    metadata: {
        sessionId: String,
        isBot: Boolean,
        isCrawler: Boolean
    },
    response: {
        statusCode: Number,
        responseTime: Number,
        size: Number
    },
    ipDetails: ObjectId            // Riferimento a IpDetails
}
```

---

#### IpDetailsSchema
**Percorso**: [`core/models/IpDetailsSchema.js`](file:///home/amodica/workspaces/threatintel/core/models/IpDetailsSchema.js)

**Schema**:
```javascript
{
    ip: String,                    // Index unico
    whois: Object,                 // Dati WHOIS
    ipinfo: Object,                // Dati IPInfo
    abuseIpDb: ObjectId,           // Riferimento AbuseIpDb
    lastChecked: Date,
    createdAt: Date,
    updatedAt: Date
}
```

---

#### AbuseIpDbSchema
**Percorso**: [`core/models/AbuseIpDbSchema.js`](file:///home/amodica/workspaces/threatintel/core/models/AbuseIpDbSchema.js)

**Schema**:
```javascript
{
    ipAddress: String,
    abuseConfidenceScore: Number,
    usageType: String,
    isp: String,
    domain: String,
    countryCode: String,
    isWhitelisted: Boolean,
    totalReports: Number,
    lastReportedAt: Date,
    reports: [ObjectId]            // Riferimenti AbuseReport
}
```

---

#### RateLimitEventSchema
**Percorso**: [`core/models/RateLimitEventSchema.js`](file:///home/amodica/workspaces/threatintel/core/models/RateLimitEventSchema.js)

**Schema**:
```javascript
{
    ip: String,
    userAgent: String,
    path: String,
    method: String,
    limitType: String,             // ddos, critical, trap, application
    timestamp: Date,
    headers: Object,
    honeypotId: String,
    message: String
}
```

---

#### ConfigSchema
**Percorso**: [`core/models/ConfigSchema.js`](file:///home/amodica/workspaces/threatintel/core/models/ConfigSchema.js)

**Schema**:
```javascript
{
    category: String,              // analysis, ratelimit, etc.
    key: String,
    value: Mixed,
    description: String
}
```

---

### 5. Tools & Utils

#### Analyze Tool
**Percorso**: [`core/tools/analyze.js`](file:///home/amodica/workspaces/threatintel/core/tools/analyze.js)

**Funzionalità**:
- Scheduler analisi periodica (cron-like)
- Trigger batch enrichment IP

---

#### Logger Utility
**Percorso**: [`core/utils/logger.js`](file:///home/amodica/workspaces/threatintel/core/utils/logger.js)

**Configurazione**:
- Winston logger centralizzato
- Output: console + file (`logs/app.log`)
- Livelli: error, warn, info, debug

---

#### Rate Limit Monitor
**Percorso**: [`core/utils/rateLimitMonitor.js`](file:///home/amodica/workspaces/threatintel/core/utils/rateLimitMonitor.js)

**Funzionalità**:
- Monitoraggio metriche Redis
- Dashboard monitoring

---

## 🎨 Componenti Frontend

### Architettura Frontend

**Framework**: Vue 3 + Composition API + TypeScript  
**Directory**: [`frontend/dashboard/`](file:///home/amodica/workspaces/threatintel/frontend/dashboard)

```
frontend/dashboard/
├── src/
│   ├── main.ts              # Entry point
│   ├── App.vue              # Root component
│   ├── router/              # Vue Router config
│   ├── api/                 # API client layer
│   ├── models/              # TypeScript interfaces
│   ├── composable/          # Composables (useApi, etc.)
│   └── views/               # Page components (17 views)
├── public/                  # Static assets
├── Dockerfile               # Container build
├── nginx.conf               # Production nginx
└── vite.config.ts           # Build config
```

### API Client Layer
**Percorso**: `src/api/`

**Responsabilità**:
- Axios client configurato
- Gestione errori centralizzata
- Interceptors per autenticazione (opzionale)
- Base URL: http://localhost:3999/api (dev)

### State Management
**Tecnologia**: Pinia  
**Utilizzo**: Store per:
- Dati dashboard (stats, threats, attacks)
- Filtri e paginazione
- User session (se autenticazione attiva)

### Views (17 componenti)
Struttura tipica:
```vue
<template>
  <el-container>
    <el-header>Statistiche</el-header>
    <el-main>
      <chart-component :data="stats" />
      <el-table :data="threats" />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '@/composable/useApi'

const stats = ref()
onMounted(async () => {
  stats.value = await useApi('/stats')
})
</script>
```

### Build & Deployment
**Development**:
```bash
cd frontend/dashboard
npm run dev  # Vite dev server su porta 5173
```

**Production**:
```bash
docker compose up --build -d  # Nginx serving /usr/share/nginx/html
```

---

## 🚀 Infrastruttura e Deployment

### Deployment Architecture

```mermaid
graph TB
    subgraph "Host Machine"
        SYSTEMD[systemd threatintel.service]
        NODE[Node.js Backend :3999]
        NGINX_HOST[Nginx :80/443]
        
        subgraph "Docker Containers"
            MONGO[MongoDB :17017]
            REDIS[Redis :6379]
            FE_DOCKER[Frontend Nginx]
        end
    end
    
    SYSTEMD --> NODE
    NGINX_HOST --> NODE
    NGINX_HOST --> FE_DOCKER
    NODE --> MONGO
    NODE --> REDIS
```

### MongoDB Configuration
**Directory**: [`mongodb/`](file:///home/amodica/workspaces/threatintel/mongodb)

**Docker Compose**:
```yaml
services:
  mongodb:
    image: mongo:7
    ports:
      - "17017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: intelagent
      MONGO_INITDB_ROOT_PASSWORD: intelagent
      MONGO_INITDB_DATABASE: threatinteldb
    volumes:
      - ./data:/data/db
      - ./mongo-init:/docker-entrypoint-initdb.d
```

**Collections**:
- `threatlogs` - Log richieste
- `ipdetails` - Cache IP enrichment
- `abuseipdb` - Dati AbuseIPDB
- `abusereports` - Report abuse per IP
- `ratelimitevents` - Eventi rate limit
- `configs` - Configurazioni dinamiche

---

### Redis Configuration
**Directory**: [`redis/`](file:///home/amodica/workspaces/threatintel/redis)

**Docker Compose**:
```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    environment:
      REDIS_PASSWORD: !!!HoneyPotRedis!!!
    volumes:
      - ./redis-data:/data
      - ./config/redis.conf:/usr/local/etc/redis/redis.conf
```

**Utilizzo**:
- Rate limiting store (express-rate-limit)
- Blacklist IP (`blacklisted-ips` set)
- Violation tracking (`violations:{ip}`)
- TTL automatici

---

### Nginx Reverse Proxy
**Directory**: [`proxy/`](file:///home/amodica/workspaces/threatintel/proxy)

**Configurazione**:
```nginx
server {
    listen 443 ssl http2;
    server_name <domain>;
    
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    
    location /api/ {
        proxy_pass http://127.0.0.1:3999;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location / {
        proxy_pass http://frontend-dashboard:80;
    }
}
```

**Features**:
- SSL/TLS con Let's Encrypt
- HTTP/2
- Header injection per real IP
- Gzip compression

---

### Systemd Service
**File**: [`threatintel.service`](file:///home/amodica/workspaces/threatintel/threatintel.service)

**Configurazione**:
```ini
[Unit]
Description=Threat Intelligence Honeypot
After=network.target mongodb.service redis.service

[Service]
Type=simple
User=amodica
WorkingDirectory=/home/amodica/workspaces/threatintel
ExecStart=/usr/bin/node server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

**Gestione**:
```bash
sudo systemctl enable threatintel
sudo systemctl start threatintel
sudo systemctl status threatintel
journalctl -u threatintel -f
```

---

## 🔒 Sicurezza e Rate Limiting

### Implementazioni di Sicurezza

#### 1. Helmet Security Headers
```javascript
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}))
```

#### 2. CORS Configuration
```javascript
app.use(cors())  // Configurare whitelist in produzione
```

#### 3. Input Sanitization
- Body size limit: 1MB
- Header sanitization (rimozione auth, cookie prima del log)
- Query parameter validation

#### 4. Trust Proxy
```javascript
app.set('trust proxy', true)  // Nginx reverse proxy
```

---

### Rate Limiting Strategy

#### Livelli di Protezione

```javascript
// Layer 1: DDoS General
app.use(violationTracker(logger))
app.use(ddosProtectionLimiter(logger))

// Layer 2: Specific Routes
app.use('/admin', criticalEndpointsLimiter(logger))
app.use('/wp-admin', trapEndpointsLimiter(logger))

// Layer 3: Application General
app.use(applicationLimiter(logger))
```

#### Blacklist Workflow

```mermaid
graph LR
    REQ[Request] --> CHECK{Blacklisted?}
    CHECK -->|Yes| BLOCK[403 Forbidden]
    CHECK -->|No| LIMIT{Rate Limit?}
    LIMIT -->|OK| PROCESS[Process]
    LIMIT -->|Exceeded| TRACK[Track Violation]
    TRACK --> COUNT{Violations >= 5?}
    COUNT -->|Yes| AUTO_BL[Auto Blacklist 2h]
    COUNT -->|No| RETURN_429[429 Too Many Requests]
```

#### Configurazione (`.env`)
```bash
# DDoS Protection
DDOS_WINDOW_MS=60000          # 1 minuto
DDOS_MAX_REQUESTS=100

# Critical Endpoints
CRITICAL_WINDOW_MS=900000     # 15 minuti
CRITICAL_MAX_REQUESTS=20

# Trap Endpoints
TRAP_WINDOW_MS=300000         # 5 minuti
TRAP_MAX_REQUESTS=50

# Blacklist
MAX_VIOLATIONS=5              # Soglia per auto-blacklist
BLACKLIST_DURATION=7200       # 2 ore in secondi
```

---

## 🔍 Analisi delle Minacce

### Pattern Detection

#### Categorie di Attacchi Rilevati

| Categoria | Pattern | Score |
|-----------|---------|-------|
| **SQL Injection** | `union`, `select`, `insert`, `update`, `delete`, `drop` | +10 |
| **XSS** | `<script`, `javascript:`, `onerror=`, `onload=` | +10 |
| **Path Traversal** | `../`, `..\`, `..%2f` | +8 |
| **JNDI Injection** | `${jndi:` | +15 |
| **Command Injection** | `eval(`, `exec(`, `system(`, `passthru(` | +12 |
| **Common Exploits** | `/admin`, `/wp-admin`, `/phpmyadmin` | +5 |

#### Fingerprinting Algorithm

```javascript
generateFingerprint(req, ip) {
    const data = [
        ip,
        req.get('User-Agent'),
        req.get('Accept-Language'),
        req.get('Accept-Encoding'),
        Object.keys(req.headers).sort().join(',')
    ].join('|')
    
    return crypto.createHash('sha256').update(data).digest('hex')
}
```

#### Score Calculation

```javascript
let score = 0
let indicators = []

// Pattern matching
if (sqlInjectionPattern.test(url)) {
    score += 10
    indicators.push('sql-injection')
}

// JNDI payload
if (jndiPayload) {
    score += 15
    indicators.push('jndi-injection')
}

// Suspicious referer
if (suspiciousReferers.includes(referer)) {
    score += 5
    indicators.push('suspicious-referer')
}

return { score, indicators, suspicious: score > 10 }
```

---

### Enrichment Pipeline

```mermaid
graph TB
    LOG[New Threat Log] --> CHECK{IP Exists?}
    CHECK -->|No| ENRICH[Enrichment Pipeline]
    CHECK -->|Yes| CACHE{Cache Valid?}
    CACHE -->|No| ENRICH
    CACHE -->|Yes| LINK[Link to IpDetails]
    
    ENRICH --> WHOIS[WHOIS Lookup]
    WHOIS --> IPINFO[IPInfo API]
    IPINFO --> ABUSE[AbuseIPDB API]
    ABUSE --> REPORTS[Fetch Reports]
    REPORTS --> SAVE[Save IpDetails]
    SAVE --> LINK
```

**Automatizzazione**:
- Scheduled job (`scheduleAnalysis()` in [`core/tools/analyze.js`](file:///home/amodica/workspaces/threatintel/core/tools/analyze.js))
- Interval configurabile via `.env`: `ANALYZE_INTERVAL=5m`
- Batch processing con rate limiting API

---

### Forensic Analysis

#### AttackDTO
**Percorso**: [`core/models/dto/AttackDTO.js`](file:///home/amodica/workspaces/threatintel/core/models/dto/AttackDTO.js)

**Aggregazione**:
```javascript
{
    _id: {
        ip: String,
        fingerprint: String
    },
    firstSeen: Date,
    lastSeen: Date,
    requestCount: Number,
    uniqueTechniques: Number,      // Numero pattern unici
    avgScore: Number,
    maxScore: Number,
    countries: [String],
    userAgents: [String],
    targetUrls: [String],
    indicators: [String],          // Tutti gli indicatori rilevati
    dangerScore: Number            // Score calcolato con pesi
}
```

#### DangerScore Formula
```javascript
dangerScore = 
    DANGER_WEIGHT_RPSNORM     * (requestCount / maxRequests) +
    DANGER_WEIGHT_DURNORM     * (durationHours / 24) +
    DANGER_WEIGHT_SCORENORM   * (avgScore / 100) +
    DANGER_WEIGHT_UNIQUETECHNORM * (uniqueTechniques / maxTechniques)
```

**Configurazione pesi** (`.env`):
```bash
DANGER_WEIGHT_RPSNORM=0.135        # 13.5% peso request count
DANGER_WEIGHT_DURNORM=0.162        # 16.2% peso durata
DANGER_WEIGHT_SCORENORM=0.486      # 48.6% peso score medio
DANGER_WEIGHT_UNIQUETECHNORM=0.216 # 21.6% peso tecniche uniche
```

---

## 💾 Database e Persistenza

### MongoDB Collections

#### Indici Ottimizzati

**ThreatLogs**:
```javascript
{
    timestamp: 1,              // Range queries temporali
    'request.ip': 1,           // Lookup per IP
    'fingerprint.hash': 1,     // Aggregazione fingerprint
    'fingerprint.score': -1,   // Ordinamento score
    ipDetails: 1               // Join con IpDetails
}
```

**IpDetails**:
```javascript
{
    ip: 1,                     // Unique index
    lastChecked: 1             // Cache invalidation
}
```

**RateLimitEvents**:
```javascript
{
    timestamp: 1,
    ip: 1,
    limitType: 1
}
```

---

### Redis Data Structures

**Keys**:
```
ddos:{ip}                      # Counter DDoS limiter
critical:{ip}:{path}           # Counter critical endpoints
trap:{ip}                      # Counter trap endpoints
app:{ip}                       # Counter application
violations:{ip}                # Counter violazioni
blacklisted-ips                # Set di IP blacklisted
blacklist:{ip}                 # TTL info blacklist
```

**TTL Policy**:
- Rate limit keys: Window duration (60s - 15min)
- Violations: 1 ora
- Blacklist: 2 ore (configurabile)

---

## ✅ Punti di Forza

### 1. Architettura Ben Strutturata
- ✅ Separazione concerns (services, models, apis, middleware)
- ✅ Singleton pattern per services
- ✅ Middleware chain chiara
- ✅ Modularità elevata

### 2. Monitoring e Logging Avanzato
- ✅ Winston logger centralizzato
- ✅ Structured logging (JSON)
- ✅ Correlation ID (request UUID)
- ✅ Rate limit event tracking
- ✅ Forensic analysis batch

### 3. Sicurezza Multilivello
- ✅ Rate limiting granulare (4 livelli)
- ✅ Blacklist automatica
- ✅ Pattern detection avanzato
- ✅ Helmet security headers
- ✅ Input sanitization
- ✅ SSL/TLS enforcement

### 4. Scalabilità
- ✅ Redis distribuito per rate limiting
- ✅ MongoDB aggregation pipeline
- ✅ Paginazione server-side
- ✅ Batch processing enrichment
- ✅ Cache IP details

### 5. Integrazione Esterna
- ✅ AbuseIPDB API
- ✅ IPInfo API
- ✅ WHOIS lookup
- ✅ Digital Auth (opzionale)

### 6. DevOps Ready
- ✅ Docker Compose per dependencies
- ✅ systemd service
- ✅ Nginx reverse proxy configurato
- ✅ Environment-based configuration
- ✅ Health check scripts

### 7. Frontend Moderno
- ✅ Vue 3 + TypeScript
- ✅ Element Plus UI library
- ✅ Chart.js per visualizzazioni
- ✅ Pinia state management
- ✅ Vite build tool (fast HMR)

---

## ⚠️ Aree di Miglioramento

### 1. Testing
> [!CAUTION]
> **Assenza totale di test automatizzati**

**Problemi**:
- ❌ Nessun file `*.test.js` o `*.spec.js` trovato
- ❌ Nessuna coverage configurata
- ❌ Regressioni non rilevabili

**Raccomandazioni**:
```bash
# Implementare
npm install --save-dev jest supertest
# Unit tests per services
# Integration tests per API
# E2E tests per flussi critici
```

**Priorità**: 🔴 **CRITICA**

---

### 2. Autenticazione e Autorizzazione
> [!WARNING]
> **Sistema di autenticazione incompleto**

**Osservazioni**:
- ⚠️ Modelli auth presenti (`core/models/auth/`) ma non utilizzati
- ⚠️ API pubbliche senza protezione
- ⚠️ Digital Auth integrato ma opzionale

**Raccomandazioni**:
- Implementare JWT o session-based auth
- Middleware di authorization per API sensibili (`/api/analyze`, `/api/blacklist`)
- RBAC per separare admin/viewer

**Priorità**: 🟠 **ALTA**

---

### 3. Validazione Input
> [!IMPORTANT]
> **Validazione input minimale**

**Problemi**:
- ⚠️ Nessuna libreria di validation (joi, yup, zod)
- ⚠️ Query parameters non validati
- ⚠️ Potenziali NoSQL injection

**Raccomandazioni**:
```javascript
// Esempio con Joi
const { body, query, validationResult } = require('express-validator')

router.post('/api/attacks',
    query('page').isInt({ min: 1 }),
    query('pageSize').isInt({ min: 1, max: 100 }),
    body('filters.ip').optional().isIP(),
    (req, res, next) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() })
        }
        next()
    },
    attacksController
)
```

**Priorità**: 🟠 **ALTA**

---

### 4. Error Handling Centralizzato
**Problemi**:
- ⚠️ Try-catch sparsi senza pattern uniforme
- ⚠️ Nessun middleware error handler globale
- ⚠️ Errori 500 non loggati consistentemente

**Raccomandazioni**:
```javascript
// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        requestId: req.id
    })
    
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message
    })
})
```

**Priorità**: 🟡 **MEDIA**

---

### 5. Configurazione Ambiente
**Problemi**:
- ⚠️ File `.env` tracciato in git (security risk)
- ⚠️ Nessun `.env.example` per onboarding
- ⚠️ Secrets in plaintext

**Raccomandazioni**:
```bash
# .gitignore
.env
.env.local

# Fornire template
cp .env.example .env

# Usare secret manager in produzione
# AWS Secrets Manager, Vault, etc.
```

**Priorità**: 🟠 **ALTA**

---

### 6. Documentazione API
**Problemi**:
- ❌ Nessuna documentazione OpenAPI/Swagger
- ❌ Endpoint non documentati
- ❌ Esempi request/response assenti

**Raccomandazioni**:
```bash
npm install swagger-jsdoc swagger-ui-express

# Annotare routes con JSDoc
/**
 * @swagger
 * /api/stats:
 *   get:
 *     summary: Statistiche aggregate
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [1h, 24h, 7d, 30d]
 */
```

**Priorità**: 🟡 **MEDIA**

---

### 7. Performance Optimization

#### Database
**Problemi**:
- ⚠️ Aggregation pipeline potenzialmente lente su dataset grandi
- ⚠️ Nessun campo `createdAt` indexed su ThreatLog

**Raccomandazioni**:
```javascript
// Compound index per query comuni
ThreatLogSchema.index({ 'request.ip': 1, timestamp: -1 })
ThreatLogSchema.index({ 'fingerprint.suspicious': 1, timestamp: -1 })

// TTL index per pulizia automatica
ThreatLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }) // 90 giorni
```

#### Caching
**Raccomandazioni**:
- Cache Redis per query frequenti (`/api/stats`)
- Cache-Control headers per frontend
- ETag per risorse statiche

**Priorità**: 🟡 **MEDIA**

---

### 8. Monitoring e Alerting
**Problemi**:
- ❌ Nessuna integrazione monitoring (Prometheus, Grafana)
- ❌ Nessun alerting automatico
- ❌ Metriche applicative non esposte

**Raccomandazioni**:
```javascript
// Metrics endpoint con prom-client
const promClient = require('prom-client')
const register = new promClient.Registry()

const requestDuration = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code']
})

register.registerMetric(requestDuration)

app.get('/metrics', (req, res) => {
    res.set('Content-Type', register.contentType)
    res.end(register.metrics())
})
```

**Priorità**: 🟡 **MEDIA**

---

### 9. Code Quality

#### Linting
**Problemi**:
- ❌ Nessun ESLint configurato
- ❌ Nessun Prettier
- ❌ Stile codice inconsistente

**Raccomandazioni**:
```bash
npm install --save-dev eslint prettier eslint-config-prettier
npx eslint --init

# .eslintrc.json
{
    "extends": ["eslint:recommended"],
    "env": { "node": true, "es2021": true },
    "rules": {
        "no-console": "warn",
        "no-unused-vars": "error"
    }
}
```

#### Type Safety
**Problemi**:
- ⚠️ Backend in JavaScript puro (no TypeScript)
- ⚠️ Nessun JSDoc per parametri funzioni

**Raccomandazioni**:
- Migrare backend a TypeScript
- Aggiungere JSDoc completo come minimo

**Priorità**: 🟢 **BASSA**

---

### 10. Deployment e CI/CD
**Problemi**:
- ❌ Nessun pipeline CI/CD
- ❌ Nessun Dockerfile per backend
- ❌ Nessun Kubernetes manifests

**Raccomandazioni**:
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run lint
```

**Priorità**: 🟡 **MEDIA**

---

### 11. Gestione Dipendenze
**Problemi**:
- ⚠️ Dipendenze potenzialmente vulnerabili
- ⚠️ Nessun Renovate/Dependabot configurato

**Raccomandazioni**:
```bash
npm audit
npm audit fix

# Configurare Dependabot
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
```

**Priorità**: 🟡 **MEDIA**

---

### 12. Frontend Optimizations
**Problemi**:
- ⚠️ Nessun lazy loading componenti Vue
- ⚠️ Nessun code splitting configurato
- ⚠️ Bundle size non ottimizzato

**Raccomandazioni**:
```javascript
// router/index.ts
const routes = [
    {
        path: '/stats',
        component: () => import('@/views/StatsView.vue') // Lazy load
    }
]

// vite.config.ts
export default defineConfig({
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'element-plus': ['element-plus'],
                    'charts': ['chart.js', 'vue-chartjs']
                }
            }
        }
    }
})
```

**Priorità**: 🟢 **BASSA**

---

## 📊 Conclusioni

### Riepilogo Generale

Il progetto **Threat Intelligence Logger** è un sistema honeypot **ben progettato e funzionalmente completo** per il monitoraggio domestico di tentativi di attacco. Presenta una **solida architettura backend** con pattern recognition avanzato, rate limiting multilivello, e integrazioni esterne per enrichment IP.

### Punti Salienti

#### ✅ Strengths
1. **Architettura modulare** - Separazione chiara tra middleware, services, models, APIs
2. **Security-first approach** - Helmet, rate limiting, blacklist, pattern detection
3. **Rich data collection** - Logging strutturato con fingerprinting e geolocalizzazione
4. **External integrations** - AbuseIPDB, IPInfo, WHOIS per threat intelligence
5. **Modern frontend** - Vue 3 + TypeScript + Element Plus
6. **DevOps ready** - Docker, systemd, Nginx configurati

#### ⚠️ Critical Gaps
1. **Testing** - Assenza totale di test automatizzati
2. **Authentication** - Sistema auth incompleto/non utilizzato
3. **Input validation** - Nessuna libreria di validation
4. **API documentation** - Nessun Swagger/OpenAPI
5. **Secret management** - `.env` in git, secrets in plaintext

---

### Maturità del Progetto

| Aspetto | Maturità | Note |
|---------|----------|------|
| **Funzionalità** | 🟢 90% | Core features complete |
| **Sicurezza** | 🟠 70% | Rate limiting ✅, Auth ❌ |
| **Qualità Codice** | 🟡 60% | Architettura ✅, Testing ❌ |
| **Documentazione** | 🔴 40% | README ✅, API docs ❌ |
| **DevOps** | 🟢 80% | Docker ✅, CI/CD ❌ |
| **Monitoring** | 🟡 50% | Logging ✅, Metrics ❌ |

**Overall Maturity**: 🟡 **65%** - **Progetto funzionale in produzione domestica, ma necessita hardening per uso enterprise**

---

### Raccomandazioni Prioritarie

#### Fase 1 - Critical (2-3 settimane)
1. ✅ **Implementare test suite** (Jest + Supertest)
   - Unit tests per services (70% coverage)
   - Integration tests per API
2. ✅ **Completare autenticazione** (JWT)
   - Middleware auth per API sensibili
   - RBAC basic (admin/viewer)
3. ✅ **Validazione input** (express-validator)
   - Tutti gli endpoint API
   - Sanitizzazione MongoDB queries
4. ✅ **Secret management**
   - Rimuovere `.env` da git
   - `.env.example` template
   - Secret rotation plan

#### Fase 2 - High Priority (1-2 settimane)
1. ✅ **Documentazione API** (Swagger)
   - OpenAPI 3.0 spec
   - Swagger UI endpoint `/api-docs`
2. ✅ **Error handling centralizzato**
   - Global error middleware
   - Custom error classes
3. ✅ **Performance optimization**
   - MongoDB compound indexes
   - Redis caching layer

#### Fase 3 - Medium Priority (2-3 settimane)
1. ✅ **Monitoring** (Prometheus + Grafana)
   - Metrics endpoint
   - Custom dashboards
   - Alerting rules
2. ✅ **CI/CD pipeline** (GitHub Actions)
   - Automated tests
   - Linting
   - Security scanning (Snyk)
3. ✅ **Code quality** (ESLint + Prettier)
   - Backend linting
   - Pre-commit hooks

---

### Use Case Ideale

**✅ Perfetto per**:
- Ricercatori sicurezza domestici
- Small business threat monitoring
- Analisi pattern attacchi low-volume
- Proof-of-concept honeypot

**⚠️ Non pronto per**:
- Enterprise production (senza auth robusta)
- High-traffic environments (senza scaling)
- Compliance-critical applications (senza audit logging)

---

### Valutazione Finale

**Rating Complessivo**: ⭐⭐⭐⭐☆ (4/5)

> **Eccellente progetto per scopi didattici e domestici, con solide basi architetturali. Richiede investimento in testing, autenticazione e documentazione per passare a livello enterprise.**

**Raccomandazione**: 🟢 **APPROVATO per uso personale/ricerca. Implementare Fase 1 prima di considerare deployment pubblico.**

---

## 📚 Appendici

### A. File Structure Completa

```
threatintel/
├── core/                          # Backend core
│   ├── apis/                      # REST API routes
│   │   ├── common.auth.js         # Auth utilities
│   │   ├── managelimitroutes.js   # Blacklist management
│   │   ├── ratelimitroutes.js     # Rate limit stats
│   │   ├── routes.js              # Honeypot endpoints
│   │   └── threatroutes.js        # Threat analysis APIs
│   ├── models/                    # MongoDB schemas
│   │   ├── auth/                  # Auth models (non utilizzati)
│   │   ├── dto/                   # Data Transfer Objects
│   │   ├── AbuseCategoryEnum.js
│   │   ├── AbuseIpDbSchema.js
│   │   ├── AbuseReportSchema.js
│   │   ├── ConfigSchema.js
│   │   ├── IpDetailsSchema.js
│   │   ├── RateLimitEventSchema.js
│   │   └── ThreatLogSchema.js
│   ├── services/                  # Business logic
│   │   ├── forense/
│   │   │   └── ForensicService.js
│   │   ├── Authservice.js
│   │   ├── ConfigService.js
│   │   ├── IpDetailsService.js
│   │   ├── PatternAnalysisService.js
│   │   ├── RateLimitService.js
│   │   └── ThreatLogService.js
│   ├── tools/                     # Utilities
│   │   └── analyze.js             # Scheduled analysis
│   ├── utils/                     # Helper functions
│   │   ├── logger.js              # Winston logger
│   │   └── rateLimitMonitor.js
│   ├── config.js                  # App configuration
│   ├── rateLimitMiddleware.js     # Rate limiting
│   └── threatLogger.js            # Main middleware
├── frontend/                      # Vue.js dashboard
│   └── dashboard/
│       ├── src/
│       │   ├── api/               # API client
│       │   ├── composable/        # Vue composables
│       │   ├── models/            # TypeScript types
│       │   ├── router/            # Vue Router
│       │   ├── views/             # Page components (17)
│       │   ├── App.vue
│       │   └── main.ts
│       ├── Dockerfile
│       ├── nginx.conf
│       ├── package.json
│       └── vite.config.ts
├── mongodb/                       # MongoDB Docker
│   ├── docker-compose.yml
│   └── mongo-init/
├── redis/                         # Redis Docker
│   ├── docker-compose.yml
│   └── config/
├── proxy/                         # Nginx config
│   ├── nginx.conf
│   └── threatintel.conf
├── test/                          # Test scripts
│   ├── populateConfigTest.js
│   └── rateLimitTest.js
├── .env                           # Environment variables
├── server.js                      # Main entry point
├── threatintel.service            # systemd service
└── package.json                   # Dependencies
```

---

### B. Environment Variables Reference

```bash
# Server
PORT=3999

# MongoDB
MONGO_URI=mongodb://user:pass@localhost:17017/threatinteldb

# External APIs
ABUSEIPDB_KEY=<your_key>
URI_DIGITAL_AUTH=https://example.com/api/v1/

# Analysis
ANALYZE_INTERVAL=5m
EXCLUDED_IPS=127.0.0.1,::1,192.168.1.0/24

# DangerScore Weights (sum = 1.0)
DANGER_WEIGHT_RPSNORM=0.135
DANGER_WEIGHT_DURNORM=0.162
DANGER_WEIGHT_SCORENORM=0.486
DANGER_WEIGHT_UNIQUETECHNORM=0.216

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=<your_password>
REDIS_DB=0

# Rate Limiting
DDOS_WINDOW_MS=60000
DDOS_MAX_REQUESTS=100
CRITICAL_WINDOW_MS=900000
CRITICAL_MAX_REQUESTS=20
TRAP_WINDOW_MS=300000
TRAP_MAX_REQUESTS=50
APP_WINDOW_MS=60000
APP_MAX_REQUESTS=200

# Blacklist
MAX_VIOLATIONS=5
BLACKLIST_DURATION=7200
LOG_RATE_LIMIT_EVENTS=true
HONEYPOT_INSTANCE_ID=honeypot-host-001

# Honeypot Endpoints
COMMON_ENDPOINTS=/admin,/wp-admin,/phpmyadmin,/manager/html,...
```

---

### C. API Endpoints Quick Reference

#### Threat Analysis
```
GET  /api/stats?timeframe=24h
GET  /api/threats?page=1&pageSize=20&filters={...}
GET  /api/threats/:id
GET  /api/attacks?page=1&minLogsForAttack=10
```

#### IP Details
```
GET  /api/ip/:ip/details
POST /api/ip/:ip/enrich
GET  /api/ip/distinct
```

#### Rate Limiting
```
GET  /api/ratelimit/events?page=1
GET  /api/ratelimit/stats
POST /api/blacklist/:ip
GET  /api/blacklist/status/:ip
```

#### Analysis Tools
```
POST /api/analyze/dry-run
POST /api/analyze?batchSize=100
```

---

### D. Comandi Operativi

```bash
# Development
npm run dev                      # Backend debug mode
cd frontend/dashboard && npm run dev

# Production
sudo systemctl start threatintel
docker compose -f mongodb/docker-compose.yml up -d
docker compose -f redis/docker-compose.yml up -d
docker compose -f frontend/docker-compose.yml up -d

# Monitoring
journalctl -u threatintel -f
tail -f logs/app.log
redis-cli monitor
mongo threatinteldb --eval "db.threatlogs.find().limit(5)"

# Testing
npm run test-ratelimit
redis-cli ping
./mongodb/check-mongodb.sh
./redis/check-redis.sh
```

---

**Documento generato il**: 2025-11-22  
**Versione codebase analizzata**: 1.0.0  
**Autore analisi**: Antigravity AI Assistant
