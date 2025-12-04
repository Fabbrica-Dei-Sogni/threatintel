<template>
    <div class="defcon-bar-container" :title="`Danger Score: ${dangerScore}`">
        <div class="defcon-bar-fill" :style="{ width: calculateDefconPercentage(level) + '%' }"
            :class="getDefconClass(level)">
            <span class="defcon-level-text">L{{ level }}</span>
        </div>
    </div>
</template>
<script setup>
import { defineProps } from 'vue';

// 1. Props: Il componente accetta il livello e il punteggio come input
const props = defineProps({
    level: {
        type: [String, Number],
        required: true,
        // Conversione locale per sicurezza, anche se è meglio pulire i dati a monte
        validator: (value) => {
            const num = parseInt(value, 10);
            return !isNaN(num) && num >= 1 && num <= 5;
        }
    },
    dangerScore: {
        type: [String, Number],
        default: 0
    }
});

// 2. Metodi Comuni

/**
 * Calcola la percentuale di riempimento della barra (da 0% per 5 a 100% per 1).
 */
function calculateDefconPercentage(level) {
    const numericLevel = parseInt(level, 10);
    const minLevel = 1;
    const maxLevel = 5;

    if (isNaN(numericLevel) || numericLevel < minLevel || numericLevel > maxLevel) return 0;

    // Normalizzazione della scala
    return ((maxLevel - numericLevel) / (maxLevel - minLevel)) * 100;
}

/**
 * Restituisce la classe CSS per il colore/stile in base al livello.
 */
function getDefconClass(level) {
    const numericLevel = parseInt(level, 10);

    if (numericLevel <= 1) return 'defcon-critical';
    if (numericLevel === 2) return 'defcon-high';
    if (numericLevel === 3) return 'defcon-medium';
    if (numericLevel === 4) return 'defcon-low';
    return 'defcon-normal';
}
</script>

<style scoped>
/* 3. CSS: Incolla qui il CSS specifico della barra (quello che era in Attacks.css) */

.defcon-bar-container {
    height: 18px;
    /* Altezza fissa per la barra */
    width: 100%;
    background-color: #3b3030;
    /* Sfondo scuro del contenitore */
    border: 1px solid #663a39;
    border-radius: 4px;
    overflow: hidden;
    position: relative;
    min-width: 100px;
    /* Assicura che la colonna sia larga abbastanza */
}

.defcon-bar-fill {
    height: 100%;
    transition: width 0.4s ease-out, background-color 0.4s ease-out;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 4px;
    font-weight: 700;
    position: relative;
    z-index: 10;
}

.defcon-level-text {
    color: #1e1b1a;
    font-size: 11px;
    letter-spacing: 0.5px;
    text-shadow: 0 0 2px rgba(255, 255, 255, 0.7);
}


/* Definizioni dei Colori per Livello */
.defcon-normal {
    background-color: #3a755d;
}

.defcon-low {
    background-color: #c9b45b;
}

.defcon-medium {
    background-color: #e68d37;
}

.defcon-high {
    background-color: #d93025;
}

.defcon-critical {
    background-color: #ff0000;
    animation: critical-pulse 1.5s infinite alternate;
    box-shadow: 0 0 10px rgba(255, 0, 0, 0.8);
}

@keyframes critical-pulse {
    from {
        box-shadow: 0 0 10px rgba(255, 0, 0, 0.8);
    }

    to {
        box-shadow: 0 0 20px rgba(255, 0, 0, 1.2), 0 0 8px rgba(255, 0, 0, 0.5);
    }
}
</style>