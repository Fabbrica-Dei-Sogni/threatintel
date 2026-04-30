export interface CorrelationWindow {
    start: number;
    end: number;
    ips: string[];
}

export interface NodeTimeInfo {
    ip: string;
    firstSeen: Date | string | number;
    lastSeen: Date | string | number;
}

/**
 * Calcola le finestre di correlazione (hub) tra più nodi basandosi sulla contemporaneità temporale.
 * @param nodes Lista di nodi con firstSeen e lastSeen
 * @returns Array di finestre di correlazione
 */
export function calculateCorrelationHubs(nodes: NodeTimeInfo[]): CorrelationWindow[] {
    if (!nodes || nodes.length < 2) return [];

    // 1. Tutti i timestamps rilevanti
    const ts = new Set<number>();
    nodes.forEach(n => {
        if (n.firstSeen) ts.add(new Date(n.firstSeen).getTime());
        if (n.lastSeen) ts.add(new Date(n.lastSeen).getTime());
    });
    const sortedTs = Array.from(ts).sort((a, b) => a - b);

    // 2. Per ogni intervallo, vediamo chi è attivo
    const windows: CorrelationWindow[] = [];
    for (let i = 0; i < sortedTs.length - 1; i++) {
        const start = sortedTs[i];
        const end = sortedTs[i + 1];
        const mid = (start + end) / 2;

        const activeIps = nodes
            .filter(n => {
                const nStart = new Date(n.firstSeen).getTime();
                const nEnd = new Date(n.lastSeen).getTime();
                return mid >= nStart && mid <= nEnd;
            })
            .map(n => n.ip);

        if (activeIps.length > 1) {
            windows.push({ start, end, ips: activeIps });
        }
    }

    // 3. Uniamo le finestre consecutive con gli stessi IP
    if (windows.length === 0) return [];

    const merged: CorrelationWindow[] = [windows[0]];
    for (let i = 1; i < windows.length; i++) {
        const last = merged[merged.length - 1];
        const current = windows[i];

        const sameIps = last.ips.length === current.ips.length &&
            last.ips.every(ip => current.ips.includes(ip));

        if (sameIps) {
            last.end = current.end;
        } else {
            merged.push(current);
        }
    }

    return merged;
}
