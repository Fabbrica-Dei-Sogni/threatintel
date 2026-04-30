/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */

import { injectable, inject } from 'tsyringe';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';
import path from 'path';
import fs from 'fs';

@injectable()
export class I18nService {
    private locales: Record<string, any> = {};
    private defaultLocale = 'it-IT';
    private localesPath = path.join(__dirname, '../locales');

    constructor(@inject(LOGGER_TOKEN) private readonly logger: Logger) {
        this.loadLocales();
    }

    /**
     * Carica tutti i file JSON presenti nella directory locales
     */
    private loadLocales() {
        try {
            const files = fs.readdirSync(this.localesPath);
            files.forEach(file => {
                if (file.endsWith('.json')) {
                    const localeName = file.replace('.json', '');
                    const filePath = path.join(this.localesPath, file);
                    const content = fs.readFileSync(filePath, 'utf8');
                    this.locales[localeName] = JSON.parse(content);
                }
            });
            this.logger.info(`[I18nService] Caricati ${Object.keys(this.locales).length} file locale.`);
        } catch (error) {
            this.logger.error(`[I18nService] Errore caricamento locale: ${error}`);
        }
    }

    /**
     * Traduce una chiave nel locale specificato
     * @param key Chiave della traduzione (es. "reports.common.title")
     * @param locale Codice locale (es. "en-US")
     * @param params Parametri per l'interpolazione (es. { count: 10 })
     */
    public t(key: string, locale: string = this.defaultLocale, params: Record<string, any> = {}): string {
        // Fallback al default se il locale non esiste
        let content = this.locales[locale] || this.locales[this.defaultLocale];
        
        if (!content) {
            this.logger.warn(`[I18nService] Locale ${locale} non trovato e fallback ${this.defaultLocale} fallito.`);
            return key;
        }

        // Risoluzione chiave nidificata (es. "a.b.c")
        const parts = key.split('.');
        let value = content;
        for (const part of parts) {
            value = value?.[part];
            if (value === undefined) break;
        }

        // Se non trovato nel locale corrente, prova nel default (se diverso)
        if (value === undefined && locale !== this.defaultLocale) {
            return this.t(key, this.defaultLocale, params);
        }

        if (value === undefined) {
            this.logger.warn(`[I18nService] Chiave ${key} non trovata per locale ${locale}.`);
            return key;
        }

        if (typeof value !== 'string') {
            return key;
        }

        // Interpolazione parametri (es. {count} -> 10)
        let translated = value;
        Object.entries(params).forEach(([k, v]) => {
            translated = translated.replace(new RegExp(`{${k}}`, 'g'), String(v));
        });

        return translated;
    }

    /**
     * Recupera l'oggetto grezzo della traduzione (senza interpolazione)
     * Utile per recuperare array di blue-print (template multi-riga)
     */
    public tm(key: string, locale: string = this.defaultLocale): any {
        let content = this.locales[locale] || this.locales[this.defaultLocale];
        if (!content) return null;

        const parts = key.split('.');
        let value = content;
        for (const part of parts) {
            value = value?.[part];
            if (value === undefined) break;
        }

        if (value === undefined && locale !== this.defaultLocale) {
            return this.tm(key, this.defaultLocale);
        }

        return value;
    }
}
