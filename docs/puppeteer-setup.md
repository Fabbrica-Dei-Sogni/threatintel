# Guida Installazione Puppeteer per Reportistica

La funzionalità di generazione dei report PDF in **ThreatIntel** utilizza **Puppeteer**, una libreria Node.js che controlla un'istanza "headless" di Chromium. Puppeteer richiede alcune dipendenze di sistema a livello di OS per funzionare correttamente su Linux.

## Requisiti di Sistema (Host Linux)

Puppeteer scarica automaticamente una versione di Chromium compatibile, ma Chromium non può avviarsi se mancano alcune librerie condivise nel sistema operativo. 

### Errore Tipico (Code 127)
Se vedi l'errore `Code 127` o `error while loading shared libraries`, significa che mancano le dipendenze sotto elencate.

## Comando di Setup per Ubuntu/Debian

Per abilitare il supporto alla generazione PDF in una nuova installazione, esegui il seguente comando con privilegi di root:

```bash
sudo apt-get update && sudo apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libu2f-udev \
    libvulkan1 \
    xdg-utils
```

> [!NOTE]
> Ho incluso anche alcuni font (come `fonts-liberation`) per garantire che il testo nei PDF venga renderizzato correttamente.

## Parametri di Configurazione nel Codice

Il backend è configurato per l'uso in ambienti server (senza interfaccia grafica) tramite questi flag critici in `ReportService.ts`:

- `--no-sandbox`: Necessario se il processo non ha permessi di sandbox utente.
- `--disable-setuid-sandbox`: Argomento di sicurezza aggiuntivo.
- `--disable-dev-shm-usage`: Forza Chromium a usare `/tmp` invece di `/dev/shm` (evita crash se la memoria condivisa è limitata).
- `--disable-gpu`: Disabilita l'accelerazione hardware (non necessaria su server).

## Troubleshooting

1. **Riavvio Servizio**: Dopo l'installazione delle librerie, ricordati sempre di riavviare il servizio:
   ```bash
   sudo systemctl restart threatintel
   ```

2. **Permessi Cache**: Puppeteer salva Chromium in `~/.cache/puppeteer`. Assicurati che l'utente che esegue il servizio (`amodica` nel tuo caso) abbia i permessi di scrittura in quella cartella.
