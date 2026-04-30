/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */

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

    // 1. Creazione eventi (inizio e fine attività)
    const events: { time: number; type: number; ip: string }[] = [];
    nodes.forEach(n => {
        const start = new Date(n.firstSeen).getTime();
        const end = new Date(n.lastSeen).getTime();
        if (!isNaN(start) && !isNaN(end)) {
            events.push({ time: start, type: 1, ip: n.ip });  // 1 = START
            events.push({ time: end, type: -1, ip: n.ip }); // -1 = END
        }
    });

    // 2. Ordinamento eventi per tempo (in caso di parità, processiamo prima gli START)
    events.sort((a, b) => a.time - b.time || b.type - a.type);

    const windows: CorrelationWindow[] = [];
    let activeIps = new Set<string>();
    let lastTime = events[0].time;

    // 3. Sweep-line: scansione degli eventi
    for (const event of events) {
        const currentTime = event.time;

        // Se c'è un intervallo e avevamo più di un IP attivo, salviamo la finestra
        if (currentTime > lastTime && activeIps.size > 1) {
            const ipsArray = Array.from(activeIps).sort();
            
            // Unione intelligente: se l'ultima finestra ha gli stessi IP, la allunghiamo
            const lastWindow = windows[windows.length - 1];
            if (lastWindow && 
                lastWindow.ips.length === ipsArray.length && 
                lastWindow.ips.every((ip, idx) => ip === ipsArray[idx])) {
                lastWindow.end = currentTime;
            } else {
                windows.push({ start: lastTime, end: currentTime, ips: ipsArray });
            }
        }

        // Aggiorniamo il set degli IP attivi
        if (event.type === 1) {
            activeIps.add(event.ip);
        } else {
            activeIps.delete(event.ip);
        }
        
        lastTime = currentTime;
    }

    return windows;
}
