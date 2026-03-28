# Task: Risoluzione Regressioni Test

## Obiettivo
Ripristinare la stabilità della suite di test (11/11 passanti, 59/59 test OK) prima di procedere con le ottimizzazioni delle performance (M4).

## Analisi Regressioni Identificate
1. **IpDetailsService**: Errore di formato nel rate limit e fallimento retry.
2. **SshLogService**: Mancato salvataggio causa buffering non gestito nei test.
3. **CowrieService**: Errore `allowDiskUse` non presente nel mock di `aggregate`.
4. **ConfigRoutes API**: Fallimento DI `tsyringe` (TypeInfo not known).

## Piano di Intervento

### Fase 1: IpDetailsService [x]
- [x] Modificare `core/services/__tests__/IpDetailsServiceRateLimit.test.ts`.
- [x] Allineare l'oggetto errore atteso a `{ status: 429, error: 'Rate limit exceeded' }`.
- [x] Verificare la logica di retry assicurandosi che `enrichedAt` rimanga null in caso di errore.

### Fase 2: SshLogService [x]
- [x] Aggiornare `core/__tests__/SshLogService.test.ts`.
- [x] Invocare `await (service as any).flushBuffer()` dopo ogni chiamata a `processEntry` nei test di integrità.

### Fase 3: CowrieService [x]
- [x] Aggiornare `core/__tests__/CowrieService.test.ts`.
- [x] Estendere il mock di `CowrieSession.aggregate` per includere `allowDiskUse`.

### Fase 4: ConfigRoutes API & DI [x]
- [x] Modificare `core/apis/__tests__/configroutes.test.ts`.
- [x] Registrare `LOGGER_TOKEN` nel container di test prima di risolvere il controller.
- [x] Verificare se l'aggiunta di import espliciti dei servizi risolve il problema dei metadati.

## Verifica [x]
- [x] Eseguire `npm test` e confermare che tutti i 59 test passino.
- [x] Verificare che non ci siano regressioni nei log (`logs/app.log`).

## Note
- Seguire rigorosamente gli standard senior: niente hack, risolvere la causa radice.
- Mantenere l'eleganza dell'architettura DI.
