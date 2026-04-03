/**
 * Utility per la sanitizzazione di stringhe grezze (come WHOIS o Payload)
 * che potrebbero arrivare come stringhe JSON-escaped o con caratteri di controllo.
 */
export class SanitizationUtils {
    /**
     * Pulisce una stringa grezza che potrebbe contenere sequenze letterali di escape
     * (es. "\n" scritto come testo) o essere racchiusa tra virgolette doppie.
     */
    static sanitizeRawString(input: any): string {
        if (typeof input !== 'string' || !input) return input || '';
        
        let sanitized = input.trim();
        
        // Se la stringa è racchiusa tra virgolette doppie, proviamo a unescaparla come JSON
        if (sanitized.startsWith('"') && sanitized.endsWith('"')) {
            try {
                // JSON.parse gestirà correttamente \n, \t e altri caratteri di escape
                return JSON.parse(sanitized);
            } catch (e) {
                // Se non è un JSON valido nonostante le virgolette, rimuoviamole manualmente
                sanitized = sanitized.slice(1, -1);
            }
        }
        
        // Fallback: rimpiazza manualmente sequenze letterali di escape se presenti come testo
        return sanitized
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\"/g, '"')
            .replace(/\\t/g, '\t');
    }

    /**
     * Sanifica ricorsivamente un oggetto data per pulire campi raw noti.
     */
    static sanitizeObjectData(data: Record<string, any>, fieldsToSanitize: string[] = ['whois', 'whois_raw', 'rawData', 'payload', 'comment', 'input']): Record<string, any> {
        if (!data || typeof data !== 'object') return data;
        
        const sanitized = { ...data };
        
        for (const key of Object.keys(sanitized)) {
            if (fieldsToSanitize.includes(key) && typeof sanitized[key] === 'string') {
                sanitized[key] = this.sanitizeRawString(sanitized[key]);
            } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
                sanitized[key] = this.sanitizeObjectData(sanitized[key], fieldsToSanitize);
            }
        }
        
        return sanitized;
    }
}
