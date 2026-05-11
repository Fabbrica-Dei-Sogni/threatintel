/**
 * ThreatIntel Runtime Configuration
 * Unisce le variabili di build (Vite) con eventuali override a runtime (config.js)
 */

export const getEnv = (key: string): string => {
  // 1. Cerca nell'oggetto globale caricato a runtime da config.js
  if (window.APP_CONFIG && window.APP_CONFIG[key] !== undefined && window.APP_CONFIG[key] !== "") {
    // Evitiamo di usare il segnaposto non sostituito ${VAR}
    if (!window.APP_CONFIG[key].startsWith("${")) {
        console.debug(`[getEnv] ${key} found in window.APP_CONFIG: ${window.APP_CONFIG[key]}`);
        return window.APP_CONFIG[key];
    }
  }
  
  // 2. Fallback sulle variabili di build di Vite (import.meta.env)
  const buildVal = import.meta.env[key];
  if (buildVal) console.debug(`[getEnv] ${key} found in import.meta.env: ${buildVal}`);
  return buildVal || "";
};

/**
 * Calcola l'URL di base delle API in modo dinamico e context-aware.
 * Questa funzione è "pura" (non dipende da store) per evitare dipendenze circolari.
 */
export const getContextApiUrl = (): string => {
    const runtimeApi = getEnv('VITE_APP_API_URL');
    if (runtimeApi && runtimeApi !== "") {
        return runtimeApi;
    }

    // Se è configurato un dominio specifico (es. in dev o casi particolari), lo usiamo
    const envDomain = getEnv('VITE_APP_DOMAIN');
    const origin = (envDomain && envDomain !== "") 
        ? (envDomain.startsWith('http') ? envDomain : `https://${envDomain}`)
        : window.location.origin;

    const basePath = getEnv('VITE_APP_BASE_PATH') || '/';
    const normalizedBase = basePath.endsWith('/') ? basePath : basePath + '/';
    
    return `${origin}${normalizedBase}api`.replace(/\/+$/, '');
};




// Estensione interfaccia Window per TypeScript
declare global {
  interface Window {
    APP_CONFIG?: Record<string, string>;
  }
}
