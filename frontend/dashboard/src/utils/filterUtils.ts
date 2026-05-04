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
 * Utility per la generazione di scale dinamiche ed ergonomiche
 */

/**
 * Genera una scala di valori "belli" (passi logici) tra un minimo e un massimo.
 * Esempio: min 2, max 500 -> [2, 5, 10, 25, 50, 100, 250, 500]
 * Il parametro pivot permette di forzare l'inclusione di un valore (es. il filtro corrente).
 */
export function generateSmartScale(min: number, max: number, maxSteps: number = 6, pivot?: number | null): number[] {
    if (max <= min) {
        const res = [min];
        if (pivot !== undefined && pivot !== null && pivot !== min) res.push(pivot);
        return res.sort((a, b) => a - b);
    }
    
    // Lista di "passi" preferiti (multipli comuni)
    const preferredSteps = [1, 2, 3, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000];
    
    // Filtriamo i passi che rientrano nel range [min, max]
    let possible = preferredSteps.filter(s => s >= min && s <= max);

    // Se abbiamo un pivot, assicuriamoci che sia considerato tra i possibili se nel range o vicino
    if (pivot !== undefined && pivot !== null && !possible.includes(pivot)) {
        possible.push(pivot);
    }
    
    // Se abbiamo troppi passi, li diradiamo
    if (possible.length > maxSteps) {
        const result = [];
        result.push(min); // Sempre il minimo
        
        const step = Math.floor(possible.length / (maxSteps - 1));
        for (let i = 1; i < maxSteps - 1; i++) {
            const idx = i * step;
            if (possible[idx] > min && possible[idx] < max) {
                result.push(possible[idx]);
            }
        }

        // Se abbiamo un pivot e non è finito nel campionamento, forziamolo
        if (pivot !== undefined && pivot !== null && !result.includes(pivot)) {
            result.push(pivot);
        }
        
        if (!result.includes(max)) result.push(max); // Sempre il massimo
        return [...new Set(result)].sort((a, b) => a - b);
    }
    
    // Assicuriamoci che min e max siano inclusi
    if (!possible.includes(min)) possible.unshift(min);
    if (!possible.includes(max)) possible.push(max);
    
    return [...new Set(possible)].sort((a, b) => a - b);
}

/**
 * Genera una scala specifica per il punteggio di rischio (0-100)
 */
export function generateScoreScale(min: number, max: number, pivot?: number | null): number[] {
    // Per lo score usiamo passi di 5 o 10
    const baseScale = [0, 5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100];
    let filtered = baseScale.filter(s => s >= min && s <= max);

    // Forza pivot se presente
    if (pivot !== undefined && pivot !== null && !filtered.includes(pivot)) {
        filtered.push(pivot);
    }
    
    if (!filtered.includes(min)) filtered.unshift(min);
    if (!filtered.includes(max) && max > min) filtered.push(max);
    
    return [...new Set(filtered)].sort((a, b) => a - b);
}

/**
 * Genera una scala di intervalli temporali basata sul range di date disponibile.
 * Se viene fornito un range globale, i pulsanti della scala saranno basati su quello (per permettere l'espansione),
 * ma verranno inclusi indicatori o opzioni speciali per il range filtrato (attivo).
 */
export function generateTimeScale(
    minDateStr: string | null, 
    maxDateStr: string | null,
    globalMinDateStr: string | null = null,
    globalMaxDateStr: string | null = null
) {
    const defaultScale = [
        { v: 1, u: 'hours', l: '1H' },
        { v: 24, u: 'hours', l: '24H' },
        { v: 7, u: 'days', l: '7D' },
        { v: 30, u: 'days', l: '1M' },
        { v: 90, u: 'days', l: '3M' }
    ];

    // Usiamo il range globale per decidere quali preset mostrare (così l'utente può sempre tornare indietro)
    const effectiveMin = globalMinDateStr || minDateStr;
    const effectiveMax = globalMaxDateStr || maxDateStr;

    if (!effectiveMin || !effectiveMax) return defaultScale;

    const min = new Date(effectiveMin).getTime();
    const max = new Date(effectiveMax).getTime();
    const diffHours = (max - min) / (1000 * 60 * 60);

    const scale = [];
    if (diffHours >= 0) scale.push({ v: 1, u: 'hours', l: '1H' });
    if (diffHours >= 1) scale.push({ v: 24, u: 'hours', l: '24H' });
    if (diffHours >= 24) scale.push({ v: 7, u: 'days', l: '7D' });
    if (diffHours >= 24 * 7) scale.push({ v: 30, u: 'days', l: '1M' });
    if (diffHours >= 24 * 30) scale.push({ v: 90, u: 'days', l: '3M' });
    if (diffHours >= 24 * 90) scale.push({ v: 180, u: 'days', l: '6M' });
    if (diffHours >= 24 * 180) scale.push({ v: 365, u: 'days', l: '1Y' });

    // Aggiungiamo sempre l'opzione per coprire tutto il range GLOBALE disponibile
    const totalGlobalDays = Math.ceil(diffHours / 24);
    if (totalGlobalDays > 0) {
        const labels = scale.map(s => s.l);
        if (totalGlobalDays > 365) {
            scale.push({ v: totalGlobalDays, u: 'days', l: 'FULL' });
        } else if (totalGlobalDays > 90 && !labels.includes('6M') && !labels.includes('1Y')) {
            scale.push({ v: totalGlobalDays, u: 'days', l: 'FULL' });
        }
    }

    // NOVITÀ: Aggiungiamo un'opzione speciale "DATA RANGE" se il range filtrato è significativamente
    // diverso (più stretto) del range globale, per permettere di zoomare esattamente sui dati trovati.
    if (minDateStr && maxDateStr && globalMinDateStr && globalMaxDateStr) {
        const fMin = new Date(minDateStr).getTime();
        const fMax = new Date(maxDateStr).getTime();
        const fDiffDays = Math.ceil((fMax - fMin) / (1000 * 60 * 60 * 24));
        
        // Se il range dei dati filtrati è diverso dal range globale selezionato
        if (fDiffDays > 0 && fDiffDays < totalGlobalDays) {
             // Possiamo inserire un'opzione "AUTO" o "FOCUS"
             // Per ora lo lasciamo gestire alla UI che può evidenziare i dati.
        }
    }

    // Se c'è pochissimo scarto, mostriamo comunque almeno un paio di opzioni per chiarezza UI
    if (scale.length === 1) scale.push({ v: 24, u: 'hours', l: '24H' });
    if (scale.length === 2) scale.push({ v: 7, u: 'days', l: '7D' });

    // Aggiungiamo sempre l'opzione ALL alla fine
    scale.push({ v: null, u: null, l: 'ALL' });

    return scale;
}
