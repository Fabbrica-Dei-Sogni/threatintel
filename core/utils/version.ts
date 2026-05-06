/**
 * Converte una stringa di versione semantica (es. "1.2.3") in un numero intero comparabile.
 * Ogni segmento è pesato per permettere il confronto numerico (max 999 per segmento).
 * Esempio: "0.0.1" -> 1, "1.2.3" -> 1002003
 */
export function semverToId(version: string): number {
    if (!version) return 0;
    
    // Rimuove eventuali caratteri non numerici all'inizio (es. "v1.0.0" -> "1.0.0")
    const cleanVersion = version.replace(/^v/, '');
    
    const parts = cleanVersion.split('.').map(part => {
        const num = parseInt(part, 10);
        return isNaN(num) ? 0 : num;
    });

    const major = parts[0] || 0;
    const minor = parts[1] || 0;
    const patch = parts[2] || 0;

    // Usiamo una base 1000 per ogni segmento
    return (major * 1000000) + (minor * 1000) + patch;
}
