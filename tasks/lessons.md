# Lessons Learned - Threat Intelligence Project

## Dependency Injection & Testing
- **Metadati dei Decoratori**: Quando si usa `tsyringe` con Jest, è FONDAMENTALE configurare `jest.config.js` per usare `ts-jest` con `emitDecoratorMetadata: true`. Se Jest usa `babel-jest` (default se presente un `babel.config.js`), i metadati dei tipi nel costruttore vengono persi, causando l'errore `TypeInfo not known`.
- **Side-effects del Container**: Assicurarsi che il container DI usato nei test sia quello del progetto (es. `core/di/container.ts`) e non quello globale di `tsyringe`, per beneficiare delle registrazioni già effettuate.
- **Import dei Servizi**: In Jest, importare esplicitamente le classi dei servizi nei file di test delle API aiuta ad assicurare che i decoratori vengano eseguiti e i metadati registrati.

## Mocking & Global Logger
- **Incomplete Mocks**: Evitare di mockare l'intera libreria `winston` se si usa un logger globale che ne dipende. Se il mock è incompleto (manca `format`, `transports`), il modulo `logger.ts` fallirà al caricamento. È meglio iniettare un logger mockato localmente dove serve.

## SshLogService & Buffering
- **Buffering nei Test**: Quando si introduce un meccanismo di buffering (es. `sshBatchBuffer`), i test che invocano metodi privati di elaborazione (es. `processEntry`) devono esplicitamente invocare il metodo di flush (es. `flushBuffer`) per svuotare lo stato nel DB prima delle asserzioni.

## Database Isolation
- **Parallelismo nei Test**: Se più suite di test scrivono sulla stessa collezione (es. `Configuration`), l'esecuzione parallela di Jest può causare collisioni. Utilizzare `npm test -- -i` (esecuzione sequenziale) o assicurare database isolati per ogni worker.
