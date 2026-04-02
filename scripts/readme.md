La cartella build contiene gli script per creare una release di un servizio versionato.

Gli script sono in pieno sviluppo e la loro funzione è basilare per garantire atomicità nel rilascio di una versione del prodotto.

clean-release.sh pulisce la cartella artifacts in cui sono copiati i tar distribuili, mentre la cartella release è quella di workspace.

deploy-pending.sh permette di registrare su systemctl un servizio presente nella folder deployments

uninstall-release.sh deregistra un servizio da systemctl (il contrario di deploy-pending.sh)

interactive-release.sh permette di personalizzare e versionare il nome del servizio (evolverà per futuri raccordi con pipeline)

make-release.sh esegue in modo parametrico la release del servizio, è utilizzato da interactive-service.sh come wizard interattivo