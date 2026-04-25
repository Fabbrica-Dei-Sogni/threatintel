/**
 * Utility per la generazione di scale dinamiche ed ergonomiche
 */

/**
 * Genera una scala di valori "belli" (passi logici) tra un minimo e un massimo.
 * Esempio: min 2, max 500 -> [2, 5, 10, 25, 50, 100, 250, 500]
 */
export function generateSmartScale(min: number, max: number, maxSteps: number = 6): number[] {
    if (max <= min) return [min];
    
    // Lista di "passi" preferiti (multipli comuni)
    const preferredSteps = [1, 2, 3, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000];
    
    // Filtriamo i passi che rientrano nel range [min, max]
    let possible = preferredSteps.filter(s => s >= min && s <= max);
    
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
export function generateScoreScale(min: number, max: number): number[] {
    // Per lo score usiamo passi di 5 o 10
    const baseScale = [0, 5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100];
    let filtered = baseScale.filter(s => s >= min && s <= max);
    
    if (!filtered.includes(min)) filtered.unshift(min);
    if (!filtered.includes(max) && max > min) filtered.push(max);
    
    return [...new Set(filtered)].sort((a, b) => a - b);
}
