# Procedura standard per installare l'honeypot al pari di come è installato ora

Aggiornare l'host con i comandi

sudo apt update

sudo apt upgrade

## Installare git

sudo apt install git

configurarlo con il proprio nome e email

$ git config --global user.name "John Doe"

$ git config --global user.email johndoe@example.com


## Installare npm

sudo apt install npm

Installare nvm per avere node.js sempre allineato con npm

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

fare logout

al login di shell avviare il comando

nvm install node

per ottenere il node.js allineato con la versione npm.

## Passaggi di installazione

Considerare come folder assoluta del software la variabile

$HONEYPOT_ROOT

che in questo esempio è riferito a

/home/amodica/workspaces/devops-procedure/common/cybersecurity/threatintel

Eseguire il comando

npm install

per compilare il package.json e costruire il node modules dell'applicazione.

## Mappatura direttive proxy nginx

Questa procedura fornisce un override nel file di configurazione di nginx e definisce regole proxy per l'honeypot

1. Override configurazione nginx.conf

con privilegi root eseguire le seguenti operazioni:

su /etc/nginx

eseguire un soft link nel seguente modo

nginx.conf -> /home/amodica/workspaces/devops-procedure/common/cybersecurity/threatintel/proxy/nginx.conf


2. Integrazione delle direttive nginx per l'honeypot

il file threatintel.conf deve essere riadattata la direttiva server_name nei blocchi server dedicati con il proprio dominio,

Stesso discorso per i puntamenti dei certificati ssl associati al dominio.

E' necessario usare servizi come letencrypts per ottenere un certificato valido al proprio dominio.


su /etc/nginx/site-enabled

eseguire un soft link nel seguente modo

threatintel.conf -> $HONEYPOT_ROOT/proxy/threatintel.conf

3. Riavvio nginx

riavviare nginx
sudo systemctl restart nginx

controllare sul journalctl o simili lo stato del proxy, se tutto ok il servizio è pronto a ricevere richieste esterne.

## Configurazione servizio threatintel.service

Il file threatintel.service è il servizio avviato e testato da questo progetto.
Tenere in considerazione che questo servizio è una base per evoluzioni custom di policy di avvio

La scelta di usare un servizio systemd deriva da due principali motivazioni:
1. Questa configurazione pure host permette di ascoltare le richieste esterne senza intermediari come un host docker.

2. L'avvio tramite servizio garantisce priorità durante la fase di boot.
Questo aspetto deve essere compatibile con le fasi di avvio del database mongodb e redis.
Quest'ultimi sono requisiti affinchè il servizio si avvia senza errori.

Per installare il service andare con privilegi root alla folder

/etc/systemd/system

e definire un soft link nel seguente modo:

threatintel.service -> $HONEYPOT_ROOT/threatintel.service

successivamente aggiornare il daemon systemd

sudo systemctl daemon-reload

impostare a enabled il servizio  e avviarlo (vedi comandi linux canonici)

Da questo momento con i comandi systemctl e journalctl è possibile monitorare lo stato del servizio dell'honeypot.

## Configurazione parametri di ambiente

I parametri di ambiente dell'honeypot sono presenti nel file .env

$HONEYPOT_ROOT/.env

I parametri significativi sono i seguenti, tutti quelli non menzionati non sono da modificare per un avvio minimale corretto.

Se si è registrati al servizio abuseipdb è possibile interagire con le sue api impostanto la chiave assegnata
L'autenticazione si riferisce all'endpoint https disponibile dall'esterno esposto dal modulo digital-auth

ABUSEIPDB_KEY=$ABUSE_KEY

URI_DIGITAL_AUTH=<https://$DIGITAL_AUTH/api/v1/>

##  Avvio mongodb e redis

Sia mongodb, il database applicativo, che redis, il database legato al rate limiting, una volta avviati risultano sempre disponibili, anche dopo un riavvio dell'host, a meno che non si decida di fermarli. Direttiva docker unless-stopped

Sono entrambi configurabili con direttive docker compose con opportuni .env a supporto environment.
Le uniche configurazioni custom da applicare sono legate alle credenziali, facilmente individuabili nei compose corrispettivi.

Creare le directory di mount storage necessari ai due database.
(Si trovano facilmente sui docker compose)

il comando
docker compose up --build -d

applicato su

$HONEYPOT_ROOT/mongodb

e

$HONEYPOT_ROOT/redis

eseguono la build fino a creare e avviare i database.

Successivamente possono essere gestiti con i canonici comandi docker compose, qualora necessario.

# Avvio del frontend

Posizionarsi sulla folder

$HONEYPOT_ROOT/frontend

e avviare il comando

docker compose up --build -d

per avviare la dashboard con una build completa.


## Procedura per l'avvio in debug remoto

1. Il database mongodb e redis sono online senza soluzione di continuità

1. Stoppare il servizio e il docker ufficiali di produzione

sudo systemctl stop threatintel.service

cd $HONEYPOT_ROOT/frontend
docker compose stop

2. Avviare i componenti backend e frontend in modalita debug

Alla base del progetto avviare in una shell
npm run dev

In un altra shell avanzare sulla folder frontend e avviare

docker compose up --build


3. Analisi breakpoint debug backend e frontend

A backend avviare il launch.json con la configuration

        {
            "type": "node",
            "request": "attach",
            "name": "Attach to Threatlog",
            "port": 9229,
            "restart": true
        }

A frontend aprire ispeziona del chrome e interagire in debug con lo strumento chrome.

## Monitoraggi e diagnostiche per il corretto funzionamento

### Verifica stato servizi
sudo systemctl status nginx threatintel

### Monitora i log in tempo reale
sudo journalctl -u threatintel -f

### Statistiche via curl
curl -s http://localhost/api/stats | jq .

### Monitoring continuo dei log MongoDB
mongo threatintel --eval "db.threatlogs.find().sort({timestamp:-1}).limit(5).pretty()"


## Test rate limiting redis

### 1. Assicurati che Redis sia attivo (se configurato)
redis-cli ping

### 2. Avvia l'applicazione
npm run dev

### 3. Testa il rate limiting
npm run test-ratelimit

### 4. Monitora i log dell'applicazione
tail -f logs/app.log

### 5. Monitora Redis (se configurato)
redis-cli monitor


# Istruzioni d'uso comando setup.sh (deprecato fino a nuova stesura)

## Rendi eseguibile lo script

chmod +x setup.sh

## Esegui il setup completo

sudo ./setup.sh

