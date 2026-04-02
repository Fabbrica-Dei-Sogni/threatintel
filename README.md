# Procedura standard per installare l'honeypot al pari di come è installato ora

[Analisi tecnica](./docs/analisi-tecnica-codebase.md)

Aggiornare l'host con i comandi

`sudo apt update`

`sudo apt upgrade`

## Installare git

`sudo apt install git`

configurarlo con il proprio nome e email

`git config --global user.name "John Doe"`

`git config --global user.email johndoe@example.com`


## Installare npm

`sudo apt install npm`

Installare nvm per avere node.js sempre allineato con npm

`curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash`

fare logout

al login di shell avviare il comando

`nvm install node`

per ottenere il node.js allineato con la versione npm.

## Passaggi di installazione

Considerate la folder assoluta del progetto la seguente

`/home/amodica/workspaces/threatintel`

ma cambia a seconda le vostre scelte.

Eseguire il comando

`npm install`

per compilare il package.json e costruire il node modules dell'applicazione.

## Mappatura direttive proxy nginx

Come azione preliminare è necessario fornire i permessi minimi necessari dell'utente a cui è assegnato il servizio

# Fornisci i permessi a www-data alla working directory
sudo chown -R www-data:www-data $(pwd)
sudo chmod -R 755 $(pwd)

Nella mia personale installazione ho utilizzato la mia utenza, anche se di default nginx usa www-data .

In ogni caso, l'utente assegnato al servizio deve appartenere, al gruppo `systemd-journal` affinchè il backend dell'honeypot possa leggere i log da nginx correttamente.

`sudo usermod -aG systemd-journal <USER>`


1. Override configurazione nginx.conf

Questa procedura fornisce un override nel file di configurazione di nginx e definisce regole proxy per l'honeypot

`cd /etc/nginx`

con privilegi root eseguire:

`sudo ln -s nginx.conf -> /home/amodica/workspaces/threatintel/proxy/nginx.conf`

Si vuole integrare un nginx.conf ad hoc per l'honeypot.

Se si vuole utilizzare il nginx.conf della propria macchina deve essere installato il protocollo stream per futuri supporti honeypot

Vedi il readme della folder proxy


2. Integrazione delle direttive nginx per l'honeypot

il file 

`threatintel.conf`

ha come server name localhost, ma dovrebbe essere riadattato se ci sono policy ad hoc sul proprio dominio.

Stesso discorso per i puntamenti dei certificati ssl associati al dominio.

Un certificato gratuito e affidadbile è letsencrypts per ottenere un certificato al proprio dominio domestico. 


`cd /etc/nginx/site-enabled`

eseguire un soft link nel seguente modo

`ln -s threatintel.conf -> /home/amodica/workspaces/threatintel/proxy/threatintel.conf`

integrare il formato json per i log (obbligatorio per il backend core)

si copia la configurazione

`threatintel_logging.conf`

nella folder di nginx

`/etc/nginx/conf.d/`

oppure eseguire un link simbolico al .conf di progetto come primo "setup"

`cd /etc/nginx/conf.d/`

`ln -s /home/amodica/workspaces/threatintel/proxy/threatintel.conf threatintel.conf`

3. Riavvio nginx

riavviare nginx
`sudo systemctl restart nginx`

controllare sul journalctl o simili lo stato del proxy, se tutto ok il servizio è pronto a ricevere richieste esterne.

## Configurazione servizio threatintel.service

Il file threatintel.service è il servizio avviato e testato da questo progetto.
Tenere in considerazione che questo servizio è una base per evoluzioni custom di policy di avvio

La scelta di usare un servizio systemd deriva da due principali motivazioni:
1. Questa configurazione pure host permette di ascoltare le richieste esterne senza intermediari come un host docker.

2. L'avvio tramite servizio garantisce priorità durante la fase di boot.

Update: esiste nella folder scripts un orchestratore per creare un servizio di avvio automatizzato.

La documentazione seguente è da considerarsi legacy e di archivio storico:

Questo aspetto deve essere compatibile con le fasi di avvio del database mongodb e redis.
Quest'ultimi sono requisiti affinchè il servizio si avvia senza errori.

Per installare il service andare con privilegi root alla folder

`/etc/systemd/system`

e definire un soft link nel seguente modo:

threatintel.service -> /home/amodica/workspaces/threatintel/threatintel.service

successivamente aggiornare il daemon systemd

`sudo systemctl daemon-reload`

impostare a enabled il servizio  e avviarlo (vedi comandi linux canonici)

Da questo momento con i comandi systemctl e journalctl è possibile monitorare lo stato del servizio dell'honeypot.


## Configurazione parametri di ambiente

I parametri di ambiente dell'honeypot sono presenti nel file .env

`/home/amodica/workspaces/threatintel/.env`

I parametri significativi sono i seguenti, tutti quelli non menzionati non sono da modificare per un avvio minimale corretto.

Se si è registrati al servizio abuseipdb è possibile interagire con le sue api impostanto la chiave assegnata

L'autenticazione si riferisce all'endpoint https disponibile dall'esterno esposto dal modulo digital-auth oppure un ente terzo come firebase

`ABUSEIPDB_KEY=$ABUSE_KEY`

`URI_DIGITAL_AUTH=<https://$DIGITAL_AUTH/api/v1/>`

##  Avvio mongodb e redis

Sia mongodb, il database applicativo, che redis, il database legato al rate limiting, una volta avviati risultano sempre disponibili, anche dopo un riavvio dell'host, a meno che non si decida di fermarli. Direttiva docker unless-stopped

Sono entrambi configurabili con direttive docker compose con opportuni .env a supporto environment.
Le uniche configurazioni custom da applicare sono legate alle credenziali, facilmente individuabili nei compose corrispettivi.

Creare le directory di mount storage necessari ai due database.
(Si trovano facilmente sui docker compose)

il comando
`docker compose up --build -d`

applicato su

`/home/amodica/workspaces/threatintel/mongodb`

e

`/home/amodica/workspaces/threatintel/redis`

eseguono la build fino a creare e avviare i database.

Successivamente possono essere gestiti con i canonici comandi docker compose, qualora necessario.

# Avvio del frontend

Posizionarsi sulla folder

`/home/amodica/workspaces/threatintel/frontend`

e avviare il comando

`docker compose up --build -d`

per avviare la dashboard con una build completa.


## Procedura per l'avvio in debug remoto

1. Il database mongodb e redis sono online senza soluzione di continuità

1. Stoppare il servizio e il docker ufficiali di produzione

sudo systemctl stop threatintel.service

`cd /home/amodica/workspaces/threatintel/frontend`
`docker compose stop`

2. Avviare i componenti backend e frontend in modalita debug

Alla base del progetto avviare in una shell
`npm run dev`

In un altra shell avanzare sulla folder frontend e avviare

`docker compose up --build`

altrimenti avviare il frontend in debug sulla folder frontend/dashboard

`cd /home/amodica/workspaces/threatintel/frontend/dashboard`

`npm run dev`


3. Analisi breakpoint debug backend e frontend

A backend avviare il launch.json con la configuration

        `{
            "type": "node",
            "request": "attach",
            "name": "Attach to Threatlog",
            "port": 9229,
            "restart": true
        }`

A frontend aprire ispeziona del chrome e interagire in debug con lo strumento chrome.

## Monitoraggi e diagnostiche per il corretto funzionamento

### Verifica stato servizi

`sudo systemctl status nginx threatintel`

### Monitora i log in tempo reale

`sudo journalctl -u threatintel -f`

### Statistiche via curl

`curl -s http://localhost/api/stats | jq .`

### Monitoring continuo dei log MongoDB

`mongo threatintel --eval "db.threatlogs.find().sort({timestamp:-1}).limit(5).pretty()"`


## Test rate limiting redis

### 1. Assicurati che Redis sia attivo (se configurato)

`redis-cli ping`


### 2. Avvia l'applicazione

`npm run dev`

### 3. Testa il rate limiting

`npm run test-ratelimit`

### 4. Monitora i log dell'applicazione

`tail -f logs/app.log`

### 5. Monitora Redis (se configurato)

`redis-cli monitor`
