# Report di Analisi: Sicurezza e Architettura ThreatIntel

Questo report analizza lo stato attuale del sistema integrato, focalizzandosi sulla postura di sicurezza, la gestione dell'identità e la robustezza dell'infrastruttura.

## 🛡️ Analisi della Sicurezza: Autenticazione (AAA)

### Punti di Forza
1. **Isolamento dell'Identity Provider (IdP)**: 
   - L'uso di `digital-auth-ts` come servizio separato segue il principio di *Separation of Concerns*. Il core di `threatintel` non gestisce direttamente le password (hash bcrypt), ma delega tutto all'IdP.
2. **Multi-Tenancy Integrata**: 
   - L'introduzione del campo `authorizedApps` impedisce che un utente registrato su un'istanza dell'honeypot possa accedere automaticamente ad altre applicazioni che condividono lo stesso IdP, garantendo il segregamento degli accessi.
3. **RBAC (Role-Based Access Control)**:
   - Abbiamo implementato middleware che verificano i ruoli (`admin` vs `user`) sia a livello di rotta backend che di interfaccia frontend. L'uso di `.populate('roles').lean()` assicura che i dati dei ruoli siano sempre aggiornati e pronti per la serializzazione senza leak di memoria.
4. **Gestione dei Segreti**:
   - Spostando la `SMTP_PASSKEY` nelle variabili d'ambiente dell'host Linux e iniettandola dinamicamente nel Docker, abbiamo eliminato il rischio di "credential leakage" nei repository Git.

### Margini di Miglioramento (Security Debt)
- **Refresh Tokens**: Attualmente il sistema usa solo Access Token (JWT). In una fase successiva, sarebbe opportuno implementare i Refresh Token per permettere sessioni lunghe senza esporre JWT a lunga scadenza.
- **Storage del Token**: Il frontend salva il token in `localStorage`. Questo lo rende vulnerabile ad attacchi XSS. Il passaggio a **HttpOnly Cookies** (già predisposto nell'IdP) è il prossimo step consigliato per la produzione.

---

## 🌐 Sicurezza di Rete e Ingress (Nginx)

### Analisi del Layer di Protezione
- **SSL/TLS**: Le comunicazioni sono protette da certificati Let's Encrypt, garantendo la cifratura del traffico in transito.
- **Rate Limiting**: Nginx è configurato con zone di limitazione (`general` e `login`). Questo mitiga attacchi Brute Force e attacchi DDoS volumetrici semplici.
- **Path Rewriting & Exposure**: L'uso di Nginx per mappare `/honeypot/` verso `/api/` nasconde la struttura interna del server Node.js agli occhi di un attaccante esterno.

---

## 🛡️ Architettura Honeypot & Traps

### Postura "Cyber"
- **Silent Logging**: L'integrazione di Cowrie permette di catturare sessioni Telnet/SSH complete senza esporre il vero sistema operativo host.
- **Dossier System**: La capacità di generare report automatici (EJS) trasforma i dati grezzi in intelligence forense utilizzabile. 
- **Decoy Strategy**: Gli endpoint "trap" sono monitorati dal `RateLimitMiddleware`, permettendo di identificare e bannare preventivamente gli IP che effettuano scanning aggressivo.

---

## 🚀 Raccomandazioni Tecniche

1. **Re-abilitare il Rate Limiting (IdP)**: Abbiamo disabilitato il limitatore su `digital-auth-ts` per facilitare i test. In produzione va riattivato, impostando `USE_REDIS=true` per una gestione distribuita del blacklist degli IP.
2. **Monitoraggio Log**: Integrare un sistema come ELK o Grafana Loki per analizzare in tempo reale i log generati dall'AuthService e dal ThreatLogger.
3. **Audit Mongoose**: Implementare un plugin di "Audit Trail" su MongoDB per tracciare chi modifica le configurazioni dell'honeypot (ConfigController).

---

## Conclusione
Il sistema è attualmente in una fase di **"Secure-by-Design"**. L'integrazione tra l'IdP TypeScript e il Core è robusta e segue le best practice moderne per applicazioni distribuite. La base è pronta per scalare verso una suite di Threat Intelligence professionale.

© 2026 - Analisi di Sicurezza ThreatIntel
