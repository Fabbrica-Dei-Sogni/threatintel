import { CONFIG_MANIFEST } from './ConfigManifest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script per generare automaticamente il file env.template, il manifest JSON 
 * e il wizard shell partendo dalla definizione unica in ConfigManifest.ts
 */

const PROJECT_ROOT = path.join(__dirname, '../../');
const ENV_TEMPLATE_PATH = path.join(PROJECT_ROOT, 'installer/deploy/env.template');
const JSON_MANIFEST_PATH = path.join(PROJECT_ROOT, 'installer/deploy/config-manifest.json');
const SH_WIZARD_PATH = path.join(PROJECT_ROOT, 'installer/deploy/config-wizard.sh');
const PACKAGE_JSON_PATH = path.join(PROJECT_ROOT, 'package.json');

// 1. Leggi la versione (Priorità: Argomento riga di comando > package.json)
const versionArg = process.argv[2];
const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
const APP_VERSION = versionArg || pkg.version || '1.0.0';

// 2. Aggiorna dinamicamente la versione nel manifest (solo in memoria per la generazione)
const manifestWithVersion = CONFIG_MANIFEST.map(param => {
    if (param.key === 'VERSION') {
        return { ...param, defaultValue: APP_VERSION };
    }
    return param;
});

function generateEnvTemplate() {
    let content = '# === THREAT INTEL PRODUCTION CONFIGURATION ===\n';
    content += '# Generato automaticamente da ConfigManifest.ts\n\n';

    let currentGroup = '';

    manifestWithVersion.forEach(param => {
        // La versione NON deve stare nel .env (è una proprietà della build, non configurabile)
        if (param.key === 'VERSION') return;

        if (param.group !== currentGroup) {
            currentGroup = param.group;
            content += `\n# --- ${currentGroup} Settings ---\n`;
        }
        
        const placeholder = `{{${param.key}}}`;
        content += `${param.key}=${placeholder}\n`;
    });

    fs.writeFileSync(ENV_TEMPLATE_PATH, content);
    console.log(`✅ File generato: ${ENV_TEMPLATE_PATH}`);
}

function generateJsonManifest() {
    fs.writeFileSync(JSON_MANIFEST_PATH, JSON.stringify(manifestWithVersion, null, 2));
    console.log(`✅ Manifest JSON generato (Versione: ${APP_VERSION}): ${JSON_MANIFEST_PATH}`);
}

function generateShellWizard() {
    let content = '#!/bin/bash\n\n';
    content += '# Wizard di configurazione generato automaticamente\n';
    content += '# NON MODIFICARE DIRETTAMENTE QUESTO FILE\n\n';
    content += 'run_config_wizard() {\n';
    content += '    CONFIRMED=false\n';
    content += '    while [ "$CONFIRMED" = false ]; do\n';
    content += '        echo "📝 Configurazione iniziale rilevata. Rispondi alle seguenti domande:"\n';
    content += '        echo "------------------------------------------------------------"\n\n';

    content += '        # 1. Esportazione Default iniziali (per variabili senza prompt)\n';
    manifestWithVersion.forEach(param => {
        content += `        export ${param.key}="${param.defaultValue}"\n`;
    });
    content += '        echo ""\n\n';

    content += '        # 2. Informazioni Generali (Legacy/Installer)\n';
    content += '        echo "📦 INFORMAZIONI GENERALI"\n';
    content += '        read -p "📛 Nome del Servizio [$SERVICE_NAME]: " NEW_SERVICE_NAME\n';
    content += '        SERVICE_NAME=${NEW_SERVICE_NAME:-$SERVICE_NAME}\n';
    content += '        DEFAULT_DESC="Threat Intelligence Logger - $SERVICE_NAME"\n';
    content += '        read -p "📝 Descrizione del Servizio [$DEFAULT_DESC]: " SERVICE_DESC\n';
    content += '        SERVICE_DESC=${SERVICE_DESC:-$DEFAULT_DESC}\n';
    content += '        echo ""\n\n';

    let currentGroup = '';

    manifestWithVersion.forEach(param => {
        if (!param.prompt) return;

        // Logica speciale per suggerimenti dinamici
        if (param.key === 'URI_DIGITAL_AUTH') {
             content += '        echo "🌐 RETE E ACCESSO"\n';
        }

        if (param.key === 'APP_DOMAIN') {
            content += '        read -p "🌐 Dominio Applicazione [localhost]: " APP_DOMAIN\n';
            content += '        APP_DOMAIN=${APP_DOMAIN:-"localhost"}\n';
            return;
        }

        if (param.key === 'APP_BASE_PATH') {
            content += '        read -p "📂 Base Path (es. /honeypot) [INVIO per root /]: " APP_BASE_PATH\n';
            content += '        APP_BASE_PATH=${APP_BASE_PATH:-""}\n';
            content += '        # Normalizzazione Base Path\n';
            content += '        CLEAN_BASE_PATH=$APP_BASE_PATH\n';
            content += '        if [[ -n "$CLEAN_BASE_PATH" && "$CLEAN_BASE_PATH" != /* ]]; then CLEAN_BASE_PATH="/$CLEAN_BASE_PATH"; fi\n';
            content += '        CLEAN_BASE_PATH=${CLEAN_BASE_PATH%/}\n';
            return;
        }

        if (param.key === 'API_BASE_URL') {
            content += '        DYNAMIC_API_BASE="https://$APP_DOMAIN$CLEAN_BASE_PATH/api"\n';
            content += '        read -p "🔗 API Base URL ($DYNAMIC_API_BASE): " API_BASE_URL\n';
            content += '        API_BASE_URL=${API_BASE_URL:-$DYNAMIC_API_BASE}\n';
            return;
        }

        if (param.key === 'APP_ID') {
            content += '        # Calcolo APP_ID dinamico\n';
            content += '        CLEAN_DOMAIN=$(echo "$APP_DOMAIN" | sed -e "s|https://||g" -e "s|http://||g" -e "s|/.*||g")\n';
            content += '        [ -z "$CLEAN_DOMAIN" ] && CLEAN_DOMAIN="localhost"\n';
            content += '        DEFAULT_APP_ID="com.$CLEAN_DOMAIN.$SERVICE_NAME"\n';
            content += '        read -p "🆔 Application ID [$DEFAULT_APP_ID]: " APP_ID\n';
            content += '        APP_ID=${APP_ID:-$DEFAULT_APP_ID}\n';
            return;
        }

        if (param.key === 'OLLAMA_URL') {
            content += '        echo ""\n        echo "🤖 INTELLIGENZA ARTIFICIALE (Ollama)"\n';
            content += '        if [ "$APP_DOMAIN" = "localhost" ]; then SUGGESTED_OLLAMA="http://82.112.255.186:11434"; else SUGGESTED_OLLAMA="http://$APP_DOMAIN:11434"; fi\n';
            content += '        read -p "🔗 Ollama URI [$SUGGESTED_OLLAMA]: " OLLAMA_URL\n';
            content += '        OLLAMA_URL=${OLLAMA_URL:-$SUGGESTED_OLLAMA}\n';
            return;
        }

        if (param.group !== currentGroup && !['App', 'AI', 'Auth'].includes(param.group)) {
            currentGroup = param.group;
            content += `        echo ""\n        echo "📦 [${currentGroup}] Settings"\n`;
        }

        const readCmd = param.isSecret ? 'read -sp' : 'read -p';
        const icon = param.icon || '❓';
        content += `        ${readCmd} "${icon} ${param.prompt} [${param.defaultValue}]: " VAL_${param.key}\n`;
        if (param.isSecret) content += `        echo ""\n`;
        content += `        export ${param.key}=\${VAL_${param.key}:-"${param.defaultValue}"}\n`;
    });

    content += '\n        echo ""\n';
    content += '        echo "🧐 RIEPILOGO CONFIGURAZIONE:"\n';
    content += '        echo "------------------------------------------------------------"\n';
    content += '        echo "  Servizio:      $SERVICE_NAME ($SERVICE_DESC)"\n';

    manifestWithVersion.forEach(param => {
        if (!param.prompt && param.key !== 'API_BASE_URL' && param.key !== 'APP_ID') return;
        const valExpr = param.isSecret ? '********' : `\${${param.key}}`;
        content += `        echo "  ${param.key.padEnd(14)}: ${valExpr}"\n`;
    });

    content += '        echo "------------------------------------------------------------"\n';
    content += '        \n';
    content += '        read -p "✅ Le impostazioni sono corrette? (y/n): " CONFIRM_CHOICE\n';
    content += '        if [[ "$CONFIRM_CHOICE" =~ ^[Yy]$ ]]; then\n';
    content += '            CONFIRMED=true\n';
    content += '        else\n';
    content += '            read -p "Rifare da zero (r) o Uscire (q)? [r]: " FAIL_CHOICE\n';
    content += '            if [ "$FAIL_CHOICE" = "q" ]; then\n';
    content += '                echo "❌ Installazione annullata."\n';
    content += '                exit 0\n';
    content += '            fi\n';
    content += '            echo "🔄 Riavvio wizard..."\n';
    content += '            echo ""\n';
    content += '        fi\n';
    content += '    done\n';
    content += '}\n';

    fs.writeFileSync(SH_WIZARD_PATH, content);
    fs.chmodSync(SH_WIZARD_PATH, '755');
    console.log(`✅ Wizard Shell generato: ${SH_WIZARD_PATH}`);
}

try {
    generateEnvTemplate();
    generateJsonManifest();
    generateShellWizard();
} catch (error) {
    console.error('❌ Errore durante la generazione dei file di configurazione:', error);
    process.exit(1);
}
