# Guida Configurazione Nexus Group & Release Docker

Questa guida spiega come configurare Nexus per gestire sia i pacchetti privati che quelli pubblici, e come adattare il build Docker per le release di produzione.

## 1. Configurazione Nexus Repository Manager

Per evitare errori 404 durante l'installazione delle dipendenze (es. axios), è necessario che Nexus agisca da "collettore" unico.

### Passaggio A: Crea il Proxy Repository (npmjs.org)
1. Vai su **Server Administration** (icona ingranaggio) -> **Repository** -> **Repositories**.
2. Clicca su **Create repository** e seleziona **npm (proxy)**.
3. Nome: `npm-proxy`.
4. Remote storage URL: `https://registry.npmjs.org`.
5. Salva.

### Passaggio B: Crea il Group Repository
1. Clicca su **Create repository** e seleziona **npm (group)**.
2. Nome: `npm-all`.
3. Nella sezione **Group**, sposta in "Members":
   - `npm-cloud-pubblico` (il tuo repository hosted privato).
   - `npm-proxy` (quello creato al passaggio A).
4. **Ordine importante**: Assicurati che `npm-cloud-pubblico` sia sopra `npm-proxy`.
5. Salva.

## 2. Pubblicazione (Inalterata)

Il tuo `package.json` rimane configurato per pubblicare sul repository privato. Questo garantisce che i tuoi pacchetti finiscano nello spazio corretto.

```json
"publishConfig": {
    "registry": "http://alessandromodica.com:8081/repository/npm-cloud-pubblico/"
}
```

**Nota**: Assicurati che la cartella `dist/` (generata da `npm run build`) sia inclusa nel pacchetto pubblicato. Controlla che non sia presente nel file `.npmignore`.

## 3. Adattamento Docker (Release)

Durante il build della release, istruiamo Docker a usare il **Group Repository** (`npm-all`) per scaricare sia il tuo pacchetto che tutte le sue dipendenze pubbliche.

### Modifica `compose/release.yml`
Punta l'argomento `NPM_REGISTRY_URI` al nuovo gruppo:

```yaml
args:
  NPM_VERSION: ${NPM_VERSION:-0.1.8}
  NPM_REGISTRY_URI: ${NPM_REGISTRY_URI:-http://alessandromodica.com:8081/repository/npm-all/}
```

Nota: e' stato impostato l'uri di nexus a https://alessandromodica.com/nexus

### Modifica `Dockerfile.release`
Dato che il pacchetto pubblicato contiene già la cartella `dist/` compilata, non è necessario (né consigliato) rieseguire il build dentro il container. Questo evita errori come "sh: vue-tsc: not found" dovuti alla mancanza di devDependencies.

1. Commenta o rimuovi `RUN npm run build`.
2. Assicurati che il comando di copia prenda i file dalla cartella scaricata.

```dockerfile
# Esempio di logica nel Dockerfile.release
RUN npm install honeypot-dashboard@$NPM_VERSION --registry=$NPM_REGISTRY_URI
RUN cp -fr /usr/app/node_modules/honeypot-dashboard/dist/* /usr/share/nginx/html/
```

---
*Documentazione generata per il progetto ThreatIntel - Frontend Release Workflow.*
