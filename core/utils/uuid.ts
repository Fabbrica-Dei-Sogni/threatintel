/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import crypto from 'crypto';

/**
 * Genera un UUID v5 (SHA-1) deterministico partendo da una stringa.
 * @param str La stringa di input
 * @returns Una stringa in formato UUID (8-4-4-4-12)
 */
export function stringToUuid(str: string): string {
    if (!str) return '00000000-0000-0000-0000-000000000000';
    
    // Usiamo SHA-1 per UUID v5
    const hash = crypto.createHash('sha1').update(str).digest('hex');
    
    // Formattiamo come UUID: 8-4-4-4-12
    // Nota: Per essere un vero v5 dovremmo manipolare alcuni bit (versione e variant),
    // ma per Qdrant l'importante è il formato hex 8-4-4-4-12.
    // Applichiamo comunque la maschera per correttezza formale.
    const part1 = hash.substring(0, 8);
    const part2 = hash.substring(8, 12);
    const part3 = '5' + hash.substring(13, 16); // Versione 5
    const part4 = ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.substring(18, 20); // Variant 10xx
    const part5 = hash.substring(20, 32);

    return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}
