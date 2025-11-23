# 🗺️ Threat Intelligence - Development Roadmap

**Progetto**: Sistema di Logging Threat Intelligence  
**Versione corrente**: 1.0.0 (JavaScript)  
**Target versione**: 2.0.0 (TypeScript + DI)

---

## 🎯 Milestone Overview

| Milestone | Status | Priority | Estimated Time |
|-----------|--------|----------|----------------|
| [M1: TypeScript Migration](#m1-typescript-migration) | 🟢 In Progress (10%) | 🔴 High | 2-3 settimane |
| [M2: Dependency Injection](#m2-dependency-injection) | ⚪ Planned | 🟠 Medium | 1-2 settimane |
| [M3: Test Suite Expansion](#m3-test-suite-expansion) | 🟢 In Progress (15%) | 🔴 High | 3-4 settimane |
| [M4: Performance Optimization](#m4-performance-optimization) | ⚪ Planned | 🟡 Low | 1 settimana |
| [M5: Security Enhancements](#m5-security-enhancements) | ⚪ Planned | 🟠 Medium | 1-2 settimane |
| [M6: Monitoring & Observability](#m6-monitoring--observability) | ⚪ Planned | 🟡 Low | 1 settimana |

**Legenda:**
- 🟢 In Progress
- ⚪ Planned
- ✅ Completed
- 🔴 High Priority
- 🟠 Medium Priority
- 🟡 Low Priority

---

## M1: TypeScript Migration

**Obiettivo**: Migrare gradualmente l'intera codebase JavaScript a TypeScript

**Status**: 🟢 In Progress (Phase 1/5 completata)

### Phase 1: Infrastructure Setup ✅ (Completata)
- [x] Install TypeScript dependencies
- [x] Create `tsconfig.json` with `allowJs: true`
- [x] Add TypeScript npm scripts (`dev:ts`, `build`)
- [x] Convert `server.js` → `server.ts`
- [x] Verify runtime with `npm run dev:ts`
- [x] Fix IPv6 rate limiter warning

**Deliverable**: Applicazione bilingue (JS + TS) funzionante ✅

---

### 📋 Strategia di Migrazione (IMPORTANTE!)

> [!IMPORTANT]
> **Approccio in 3 fasi obbligatorie:**
>
> **A) Migrazione graduale JS → TS**
> - Convertire file per file
> - Usare SEMPRE librerie TypeScript corrette (`@types/*`)
> - **NO workaround** o `any` generalizzati
> - Verificare compilazione: `npm run build` ✅
> - Verificare runtime: `npm run dev:ts` ✅
> - **FERMARSI e indagare** se errori prima di procedere
>
> **B) Integrazione Dependency Injection**
> - **SOLO DOPO** completamento migrazione TypeScript
> - Usare `tsyringe` + `reflect-metadata`
> - Integrare DI dove serve (non ovunque)
> - Verificare compilazione ✅
> - Verificare runtime ✅
>
> **C) Ridefinizione Test Suite**
> - **DOPO** integrazione DI
> - Adattare test per usare DI mocking
> - Mantenere coverage 80%+

**Regole ferree:**
1. ✅ Compilazione corretta
2. ✅ Runtime funzionante
3. ⚠️ Errore? → STOP e indaga
4. 🚫 Non proseguire con errori

---

### Phase 2: Core Utilities (Next)
- [ ] Convert `core/utils/logger.js` → `.ts`
- [ ] Convert `core/config.js` → `.ts`
- [ ] Runtime test after each file

### Phase 3: Models & Schemas
- [ ] Convert all Mongoose schemas to TypeScript
- [ ] Create TypeScript interfaces for documents
- [ ] Add proper type exports

### Phase 4: Services Layer
- [ ] Convert services one by one:
  - [ ] `ConfigService.js`
  - [ ] `PatternAnalysisService.js`
  - [ ] `RateLimitService.js`
  - [ ] `IpDetailsService.js`
  - [ ] `ThreatLogService.js`
  - [ ] `Authservice.js`
  - [ ] `ForensicService.js`
- [ ] Runtime test after each service

### Phase 5: Middleware & APIs
- [ ] Convert middleware files (`rateLimitMiddleware`, `threatLogger`)
- [ ] Convert API routes
- [ ] Full integration test

**Approccio**:
- ✅ Migrazione graduale e cautelosa
- ✅ Test runtime dopo OGNI file
- ✅ Mai procedere se qualcosa si rompe
- ✅ Mantenere sempre app JavaScript funzionante

**Rischi**:
- Dipendenze circolari
- Breaking changes su import/export
- Runtime incompatibilità

**Mitigazione**:
- Test continuo a runtime
- Checkpoint frequenti via git
- Rollback immediato se necessario

---

## M2: Dependency Injection

**Obiettivo**: Integrare Dependency Injection per migliorare testabilità e manutenibilità

**Status**: ⚪ Planned

**Prerequisiti**: M1 Phase 3 completata (modelli convertiti)

### Tasks
- [ ] Install `tsyringe` e `reflect-metadata`
- [ ] Configure TypeScript decorators
- [ ] Create DI container (`core/di/container.ts`)
- [ ] Refactor services con `@injectable` decorator:
  - [ ] ConfigService
  - [ ] PatternAnalysisService (inject ConfigService)
  - [ ] ForensicService (inject ConfigService)
  - [ ] Altri servizi
- [ ] Update service consumers to use DI
- [ ] Update tests to use DI mocking

**Note importanti**:
> [!CAUTION]
> L'approccio precedente con `@singleton()` e `container.resolve()` ha causato problemi a runtime. Nuova strategia:
> - Evitare export di `container.resolve()` direttamente
> - Usare factory functions o lazy initialization
> - Testare SEMPRE a runtime prima di procedere

**Benefici**:
- Migliore testabilità (mock injection)
- Loose coupling tra componenti
- Configurazione centralizzata

---

## M3: Test Suite Expansion

**Obiettivo**: Raggiungere 80% code coverage su tutto il backend

**Status**: 🟢 In Progress (15% completato)

### Phase 1: Services Layer ✅ (Completata)
- [x] Setup Jest + MongoDB Memory Server
- [x] Test `ConfigService` (85% coverage)
- [x] Test `PatternAnalysisService` (100% coverage)
- [x] Test `RateLimitService`
- [x] Test `IpDetailsService`
- [x] Test `ThreatLogService`
- [x] Test `Authservice`
- [x] Test `ForensicService`

**Risultato**: 32 test, 31 passing, ~15% coverage totale ✅

### Phase 2: Middleware & Utils
- [ ] Test `rateLimitMiddleware.js`
- [ ] Test `threatLogger.js`
- [ ] Test `core/utils/logger.js`

### Phase 3: API Routes
- [ ] Integration tests con `supertest`
- [ ] Test `threatroutes.js`
- [ ] Test `ratelimitroutes.js`
- [ ] Test `managelimitroutes.js`
- [ ] Test `routes.js` (honeypot)

### Phase 4: E2E Tests
- [ ] End-to-end scenarios
- [ ] Rate limiting flow
- [ ] Threat logging flow
- [ ] Blacklist flow

**Target**: 80% statement coverage ✅

---

## M4: Performance Optimization

**Obiettivo**: Migliorare performance e scalabilità

**Status**: ⚪ Planned

### Tasks
- [ ] Profile MongoDB queries (slow queries)
- [ ] Add database indexes where needed
- [ ] Optimize aggregation pipelines in `ForensicService`
- [ ] Implement query result caching (Redis)
- [ ] Optimize rate limiter Redis operations
- [ ] Add database connection pooling optimization
- [ ] Load testing con k6 or Artillery

**Metriche target**:
- Response time API < 200ms (p95)
- MongoDB query time < 50ms (p95)
- Throughput > 1000 req/s

---

## M5: Security Enhancements

**Obiettivo**: Rafforzare sicurezza applicazione

**Status**: ⚪ Planned

### Tasks
- [ ] Audit dependencies (`npm audit`)
- [ ] Implement rate limiting per user (oltre a per IP)
- [ ] Add request signature validation
- [ ] Enhance CORS policy
- [ ] Add input sanitization middleware
- [ ] Implement JWT token rotation
- [ ] Add security headers (già parzialmente fatto con Helmet)
- [ ] Secrets management (migrate da .env a vault)

**Compliance**:
- OWASP Top 10
- Best practices Node.js security

---

## M6: Monitoring & Observability

**Obiettivo**: Migliorare monitoring e debugging

**Status**: ⚪ Planned

### Tasks
- [ ] Integrate Prometheus metrics
- [ ] Add Grafana dashboards
- [ ] Implement distributed tracing (Jaeger/OpenTelemetry)
- [ ] Add structured logging (già fatto con Winston)
- [ ] Error tracking (Sentry integration)
- [ ] Health check endpoints
- [ ] Alerting rules (MongoDB down, Redis down, high error rate)

**Benefici**:
- Visibilità real-time su performance
- Debug più rapido
- Alerting proattivo

---

## 📅 Timeline Stimata

```
Novembre 2025    M1 Phase 1 ✅ (Infrastructure)
Dicembre 2025    M1 Phase 2-3 (Utils + Models)
Gennaio 2026     M1 Phase 4-5 (Services + APIs)
Febbraio 2026    M2 (Dependency Injection)
Febbraio 2026    M3 Phase 2-3 (Middleware + API tests)
Marzo 2026       M3 Phase 4 (E2E tests)
Marzo 2026       M4 (Performance)
Aprile 2026      M5 (Security)
Aprile 2026      M6 (Monitoring)
```

**Versione 2.0.0 Release**: Aprile 2026 (stimata)

---

## 🎓 Lessons Learned

### TypeScript Migration
- ✅ **Gradualità è fondamentale**: Convertire un file alla volta
- ✅ **Test runtime sempre**: Build success ≠ Runtime success
- ✅ **allowJs: true**: Permette coesistenza JS/TS durante migrazione
- ⚠️ **DI cautamente**: L'approccio `@singleton()` + `container.resolve()` può causare problemi

### Test Suite
- ✅ **MongoDB Memory Server**: Ottimo per test isolati
- ✅ **Mocking esterno**: Mock sempre chiamate esterne (axios, whois, ipinfo)
- ⚠️ **Schema validation**: Attenzione ai campi required nei test data

---

## 📊 Progress Tracking

**Overall Project Completion**: ~12%

| Area | Coverage | Status |
|------|----------|--------|
| TypeScript Migration | 10% | 🟢 |
| Test Coverage | 15% | 🟢 |
| DI Integration | 0% | ⚪ |
| Performance | Baseline | ⚪ |
| Security | Baseline | ⚪ |
| Monitoring | Basic (Winston) | 🟡 |

---

**Ultimo aggiornamento**: 2025-11-23  
**Prossimo checkpoint**: Fine M1 Phase 2
