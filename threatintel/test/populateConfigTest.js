const ConfigService = require('../core/services/ConfigService');
const mongoose = require('mongoose');

const mongoUri = process.env.MONGO_URI || 'mongodb://intelagent:intelagent@localhost:17017/threatinteldb';

mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // opzioni aggiuntive se richieste
})
    .then(() => console.log('MongoDB connesso correttamente'))
    .catch(err => console.error('Errore connessione MongoDB:', err));
    
async function populateConfigs() {
    await ConfigService.saveConfig('SUSPICIOUS_PATTERNS', '.*server.*,.*status.*,geoip,editor,upload.*,wp-content,.*php,update,sym403,logging,/wp-includes*,/powershell,appdev,password,tracert,admin,union.*select,select.*from,insert.*into,update.*set,delete.*from,script.*alert,\\.\\.\\.,etc\\/passwd,wp-login\\.php,cmd\\.exe,exec\\(\\),base64_decode,phpinfo\\(\\),\\/wp-admin,\\/phpmyadmin,\\/manager\\/html,\\/console,sqlmap,nmap,nikto,burp,zap,hydra,dirbuster,dirb,wfuzz,ffuf,/solr,/actuator,/uaa,/jenkins,/login,/setup');

    await ConfigService.saveConfig('BOT_PATTERNS', 'Nmap,Go-http-client,l9scan,bot,crawler,spider,scraper,zgrab,zmap,sqlmap,nikto,acunetix,burp,owasp-zap,masscan,httprint,dirbuster');

    await ConfigService.saveConfig('SUSPICIOUS_REFERERS', 'libredtail-http,sqlmap,nikto,nmap,burp,zap,masscan,hydra,dirbuster,dirb,ffuf,acunetix,wpscan,skipfish');

    await ConfigService.saveConfig('SUSPICIOUS_SCORES', 'URL_PATTERN:12,BODY_PATTERN:18,QUERY_PATTERN:10,MISSING_USER_AGENT:15,SHORT_USER_AGENT:3,BOT_USER_AGENT:8,SUSPICIOUS_REFERER:6,UNCOMMON_METHOD:4');

    console.log('Configurazioni inserite correttamente');
}

populateConfigs().catch(err => {
    console.error('Errore inserimento configurazioni:', err);
});
