/**
 * ThreatIntel Runtime Configuration
 * Unisce le variabili di build (Vite) con eventuali override a runtime (config.js)
 */

export const getEnv = (key: string): string => {
  // 1. Cerca nell'oggetto globale caricato a runtime da config.js
  if (window.APP_CONFIG && window.APP_CONFIG[key] !== undefined && window.APP_CONFIG[key] !== "") {
    // Evitiamo di usare il segnaposto non sostituito ${VAR}
    if (!window.APP_CONFIG[key].startsWith("${")) {
        return window.APP_CONFIG[key];
    }
  }
  
  // 2. Fallback sulle variabili di build di Vite (import.meta.env)
  return import.meta.env[key] || "";
};

// Estensione interfaccia Window per TypeScript
declare global {
  interface Window {
    APP_CONFIG?: Record<string, string>;
  }
}
