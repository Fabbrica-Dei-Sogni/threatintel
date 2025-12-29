# 🗺️ Threat Intelligence - Development Roadmap

**Progetto**: Sistema di Logging Threat Intelligence  
**Versione corrente**: 1.0.0 (JavaScript)  
**Target versione**: 2.0.0 (TypeScript + DI)

---

## 🎯 Milestone Overview

| Milestone | Status | Priority | Estimated Time |
|-----------|--------|----------|----------------|
| [M1: TypeScript Migration](#m1-typescript-migration) | ✅ Completed | 🔴 High | 2-3 settimane |
| [M2: Dependency Injection](#m2-dependency-injection) | ✅ Completed | 🟠 Medium | 1-2 settimane |
| [M3: Test Suite Expansion](#m3-test-suite-expansion) | ✅ Completed | 🔴 High | 3-4 settimane |
| [M4: Performance Optimization](#m4-performance-optimization) | ⚪ Planned | 🟡 Low | 1 settimana |
| [M5: Security Enhancements](#m5-security-enhancements) | ⚪ Planned | 🟠 Medium | 1-2 settimane |
| [M6: Monitoring & Observability](#m6-monitoring--observability) | ⚪ Planned | 🟡 Low | 1 settimana |
| [M7: Frontend Enhancements](#m7-frontend-enhancements) | 🟢 In Progress (80%) | 🟠 Medium | 2 settimane |

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

**Status**: ✅ Completed

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

### Phase 2: Core Utilities ✅
- [x] Convert `core/utils/logger.js` → `.ts`
- [x] Convert `core/config.js` → `.ts`
- [x] Runtime test after each file

### Phase 3: Models & Schemas ✅
- [x] Convert all Mongoose schemas to TypeScript
- [x] Create TypeScript interfaces for documents
- [x] Add proper type exports

### Phase 4: Services Layer ✅
- [x] Convert services one by one:
  - [x] `ConfigService.ts` (Migrated & Extended)
  - [x] `PatternAnalysisService.ts`
  - [x] `RateLimitService.ts`
  - [x] `IpDetailsService.ts`
  - [x] `ThreatLogService.ts`
  - [x] `Authservice.ts`
  - [x] `ForensicService.ts`
- [x] Runtime test after each service

### Phase 5: Middleware & APIs ✅
- [x] Convert middleware files (`rateLimitMiddleware`, `threatLogger`)
- [x] Convert API routes
- [x] Full integration test

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

**Status**: ✅ Completed

**Prerequisiti**: M1 Phase 3 completata (modelli convertiti)

### Tasks
- [x] Install `tsyringe` e `reflect-metadata`
- [x] Configure TypeScript decorators
- [x] Create DI container (`core/di/container.ts`)
- [x] Refactor services con `@injectable` decorator:
  - [x] ConfigService
  - [x] PatternAnalysisService (inject ConfigService)
  - [x] ForensicService (inject ConfigService)
  - [x] Altri servizi
- [x] Update service consumers to use DI
- [x] Update tests to use DI mocking

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

**Status**: ✅ Completed

### Phase 1: Services Layer ✅ (Completata)
- [x] Setup Jest + MongoDB Memory Server
- [x] Test `ConfigService` (85% coverage)
- [x] Test `PatternAnalysisService` (100% coverage)
- [x] Test `RateLimitService`
- [x] Test `IpDetailsService`
- [x] Test `ThreatLogService`
- [x] Test `Authservice`
- [x] Test `ForensicService`

**Risultato**: 32 test, 31 passing, ~80% coverage core services ✅

### Phase 2: Middleware & Utils ✅
- [x] Test `rateLimitMiddleware.ts`
- [x] Test `threatLogger.ts`
- [x] Test `core/utils/logger.ts`

### Phase 3: API Routes ✅
- [x] Integration tests con `supertest`
- [x] Test `threatroutes.ts`
- [x] Test `configroutes.ts` (100% route coverage)
- [x] Test `ratelimitroutes.ts`
- [x] Test `managelimitroutes.ts`
- [x] Test `routes.ts` (honeypot)

### Phase 4: E2E Tests ✅
- [x] End-to-end scenarios
- [x] Rate limiting flow
- [x] Threat logging flow
- [x] Blacklist flow

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

## M7: Frontend Enhancements

**Obiettivo**: Migliorare User Experience, Accessibilità e Responsività

**Status**: 🟢 In Progress (80% completato)

### Phase 1: Internationalization (I18n) ✅
- [x] Setup `vue-i18n`
- [x] Traduzione completa (IT, EN, FR, DE, ES, RU, PL)
- [x] Language Switcher component
- [x] Lazy loading delle traduzioni

### Phase 2: Responsive Design ✅
- [x] Mobile-first layout per pagina Ricerca Attacchi
- [x] Mobile-first layout per pagina Threat Logs
- [x] Dashboard & Radar Chart responsive
- [x] Tabella con tipografia fluida (`clamp`) e fallback scroll

### Phase 3: Dashboard V2 (Next)
- [ ] Dark/Light mode toggle avanzato
- [ ] Nuovi widget grafici (Time series attacks)
- [ ] Miglioramento accessibilità (ARIA support)

**Benefici**:
- Supporto multilingua completo
- Esperienza mobile nativa
- UI moderna e adattiva

---

## 📅 Timeline Stimata

```
Novembre 2025    M1 Phase 1 ✅ (Infrastructure)
Dicembre 2025    M1 Phase 2-5 ✅ (Utils + Models + Services + APIs)
Dicembre 2025    M2 ✅ (Dependency Injection)
Dicembre 2025    M3 ✅ (Test Suite Expansion)
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

**Overall Project Completion**: ~45%

| Area | Coverage | Status |
|------|----------|--------|
| TypeScript Migration | 100% | ✅ |
| Test Coverage | 80%+ | ✅ |
| DI Integration | 100% | ✅ |
| Performance | Baseline | ⚪ |
| Security | Baseline | ⚪ |
| Monitoring | Basic (Winston) | 🟡 |
| Frontend Enhancements | 80% (I18n + Responsive) | 🟢 |

---

**Ultimo aggiornamento**: 2025-12-29  
**Prossimo checkpoint**: Migrazione altri servizi Phase 4
