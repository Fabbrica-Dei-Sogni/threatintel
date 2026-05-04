/**
 * ThreatIntel - Reference Implementation Dashboard
 * 
 * This file is part of the reference frontend implementation of the 
 * ThreatIntel Distributed Forensics Engine.
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Production or commercial use of this specific interface requires 
 * a valid commercial license from the author.
 */

/**
 * Gestore centralizzato per il LocalStorage con supporto ai Namespace.
 * Fornisce un accesso tipizzato e sicuro alla persistenza dei dati.
 */

export enum StorageNamespace {
    AUTH = 'hp_auth',
    SETTINGS = 'hp_settings',
    DASHBOARD = 'hp_dashboard',
    ATTACKS = 'hp_attacks',
    THREAT_LOGS = 'hp_threatlogs',
    COWRIE_SESSIONS = 'hp_cowrie_sessions',
    CAMPAIGNS = 'hp_campaigns',
    API = 'hp_api'
}

class StorageManager {
    /**
     * Salva un oggetto o un valore nel localStorage sotto un determinato namespace.
     */
    set<T>(namespace: StorageNamespace, data: T): void {
        try {
            const serialized = JSON.stringify(data);
            localStorage.setItem(namespace, serialized);
        } catch (error) {
            console.error(`[StorageManager] Errore durante il salvataggio nel namespace ${namespace}:`, error);
        }
    }

    /**
     * Recupera un oggetto o un valore dal localStorage per un determinato namespace.
     */
    get<T>(namespace: StorageNamespace): T | null {
        try {
            const serialized = localStorage.getItem(namespace);
            if (!serialized) return null;
            return JSON.parse(serialized) as T;
        } catch (error) {
            console.error(`[StorageManager] Errore durante il recupero dal namespace ${namespace}:`, error);
            return null;
        }
    }

    /**
     * Rimuove i dati di un determinato namespace.
     */
    remove(namespace: StorageNamespace): void {
        localStorage.removeItem(namespace);
    }

    /**
     * Pulisce tutti i dati gestiti dall'applicazione.
     */
    clearAll(): void {
        Object.values(StorageNamespace).forEach(ns => this.remove(ns));
    }
}

export const storage = new StorageManager();
