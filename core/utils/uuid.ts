import crypto from 'crypto';

/**
 * Genera un UUID deterministico partendo da una stringa.
 * Utile per Qdrant che accetta solo UUID o interi.
 * @param str La stringa di input (es. IP o ObjectId)
 * @returns Una stringa in formato UUID (8-4-4-4-12)
 */
export function stringToUuid(str: string): string {
    if (!str) return '00000000-0000-0000-0000-000000000000';
    
    // Usiamo MD5 per ottenere 32 caratteri hex (128 bit)
    const hash = crypto.createHash('md5').update(str).digest('hex');
    
    // Formattiamo come UUID: 8-4-4-4-12
    return [
        hash.substring(0, 8),
        hash.substring(8, 12),
        hash.substring(12, 16),
        hash.substring(16, 20),
        hash.substring(20, 32)
    ].join('-');
}
