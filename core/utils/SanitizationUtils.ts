/**
 * Utility per la sanitizzazione di stringhe grezze e oggetti complessi.
 * Fornisce protezione contro iniezioni (XSS) e gestione di sequenze JSON-escaped.
 */
export class SanitizationUtils {
    /**
     * Esegue l'escape dei caratteri HTML speciali per prevenire iniezioni di script (XSS).
     */
    static escapeHTML(str: string): string {
        if (typeof str !== 'string') return str;
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Pulisce una stringa grezza (JSON-unescaping) e applica l'escape HTML.
     */
    static sanitizeRawString(input: any): string {
        if (typeof input !== 'string' || !input) return input || '';
        
        let sanitized = input.trim();
        
        // Gestione sequenze racchiuse tra virgolette doppie (JSON unescaping)
        if (sanitized.startsWith('"') && sanitized.endsWith('"')) {
            try {
                sanitized = JSON.parse(sanitized);
            } catch (e) {
                sanitized = sanitized.slice(1, -1);
            }
        }
        
        // Rimpiazza sequenze letterali di escape comuni se presenti come testo
        sanitized = sanitized
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\"/g, '"')
            .replace(/\\t/g, '\t');

        // APPUNTO DI SICUREZZA: Dopo aver unescapato tutto, applichiamo l'escape HTML finale
        return this.escapeHTML(sanitized);
    }

    /**
     * Sanifica ricorsivamente un oggetto o un array, applicando l'escape HTML a tutte le stringhe.
     */
    static deepClean(input: any): any {
        if (input === null || input === undefined) return input;

        if (Array.isArray(input)) {
            return input.map(item => this.deepClean(item));
        }

        if (typeof input === 'object') {
            const cleaned: Record<string, any> = {};
            for (const [key, value] of Object.entries(input)) {
                cleaned[key] = this.deepClean(value);
            }
            return cleaned;
        }

        if (typeof input === 'string') {
            return this.escapeHTML(input);
        }

        return input;
    }

    /**
     * Sanifica ricorsivamente un oggetto data per pulire campi specifici (mantenuto per retrocompatibilità).
     * Ora utilizza il nuovo motore di escape HTML.
     */
    static sanitizeObjectData(data: Record<string, any>, fieldsToSanitize: string[] = ['whois', 'whois_raw', 'rawData', 'payload', 'comment', 'input']): Record<string, any> {
        if (!data || typeof data !== 'object') return data;
        
        const sanitized = { ...data };
        
        for (const key of Object.keys(sanitized)) {
            if (fieldsToSanitize.includes(key) && typeof sanitized[key] === 'string') {
                sanitized[key] = this.sanitizeRawString(sanitized[key]);
            } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
                sanitized[key] = this.sanitizeObjectData(sanitized[key], fieldsToSanitize);
            } else if (typeof sanitized[key] === 'string') {
                // Anche i campi non specificati vengono scappati per sicurezza globale
                sanitized[key] = this.escapeHTML(sanitized[key]);
            }
        }
        
        return sanitized;
    }
}
