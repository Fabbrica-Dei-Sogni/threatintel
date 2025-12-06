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
    text-shadow: 0 0 2px rgba(255, 255, 255, 0.7);
}


/* Definizioni dei Colori per Livello */
/* DEFCON 5 - Blu (normale) */
.defcon-normal {
    background-color: #1e88e5;
    /* blu medio */
}

/* DEFCON 4 - Verde (basso) */
.defcon-low {
    background-color: #43a047;
    /* verde intenso */
}

/* DEFCON 3 - Giallo (medio) */
.defcon-medium {
    background-color: #fdd835;
    /* giallo vivace */
}

/* DEFCON 2 - Rosso (alto) */
.defcon-high {
    background-color: #e53935;
    /* rosso allerta */
}

/* DEFCON 1 - Bianco (critico) */
.defcon-critical {
    background-color: #ffffff;
    /* bianco pieno */
    color: #b71c1c;
    /* testo rosso scuro per contrasto */
    animation: critical-pulse 1.5s infinite alternate;
    box-shadow: 0 0 12px rgba(255, 255, 255, 0.9),
        0 0 20px rgba(183, 28, 28, 0.9);
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