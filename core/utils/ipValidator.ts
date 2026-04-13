// core/utils/ipValidator.ts
import net from 'net';
import ipRangeCheck from 'ip-range-check';

/**
 * Range privati, loopback, link-local, multicast, e cloud metadata.
 * Aggiorna questa lista se il tuo ambiente ha range interni diversi.
 */
const BLOCKED_RANGES = [
    '0.0.0.0/8',          // "This" network
    '10.0.0.0/8',         // Private
    '100.64.0.0/10',      // Carrier-grade NAT
    '127.0.0.0/8',        // Loopback
    '169.254.0.0/16',     // Link-local (cloud metadata: 169.254.169.254)
    '172.16.0.0/12',      // Private
    '192.0.0.0/24',       // IETF Protocol
    '192.168.0.0/16',     // Private
    '198.18.0.0/15',      // Benchmarking
    '198.51.100.0/24',    // Documentation
    '203.0.113.0/24',     // Documentation
    '224.0.0.0/4',        // Multicast
    '240.0.0.0/4',        // Reserved
    '255.255.255.255/32', // Broadcast
    '::1/128',            // IPv6 loopback
    'fc00::/7',           // IPv6 unique local
    'fe80::/10',          // IPv6 link-local
];

export class IpValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'IpValidationError';
    }
}

/**
 * Verifica che la stringa sia un indirizzo IP valido (v4 o v6).
 */
export function isValidIp(ip: string): boolean {
    return net.isIP(ip) !== 0;
}

/**
 * Verifica che l'IP sia pubblicamente raggiungibile (non privato/riservato).
 */
export function isPublicIp(ip: string): boolean {
    if (!isValidIp(ip)) return false;
    return !ipRangeCheck(ip, BLOCKED_RANGES);
}

/**
 * Lancia IpValidationError se l'IP non è valido o non è pubblico.
 * Usare nei controller prima di qualsiasi chiamata esterna.
 */
export function assertPublicIp(ip: string): void {
    if (!ip || typeof ip !== 'string') {
        throw new IpValidationError('IP non fornito');
    }
    const trimmed = ip.trim();
    if (!isValidIp(trimmed)) {
        throw new IpValidationError(`Formato IP non valido: ${trimmed}`);
    }
    if (!isPublicIp(trimmed)) {
        throw new IpValidationError(`IP non raggiungibile pubblicamente: ${trimmed}`);
    }
}