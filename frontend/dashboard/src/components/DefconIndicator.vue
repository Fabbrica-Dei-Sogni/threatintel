<template>
    <div class="defcon-wrapper" :title="`Danger Score: ${dangerScore}`">
        <!-- MODE: BAR -->
        <div v-if="mode === 'bar'" class="defcon-bar-container">
            <div class="defcon-bar-fill" :style="{ width: calculateDefconPercentage(level) + '%' }"
                :class="getDefconClass(level)">
                <span class="defcon-level-text">L{{ level }}</span>
            </div>
        </div>

        <!-- MODE: DOT -->
        <div v-else class="defcon-dot-container" :class="getDefconClass(level)">
            <span v-if="!hideLabel" class="defcon-dot-label">L{{ level }}</span>
            <div class="pulse-ring"></div>
        </div>
    </div>
</template>

<script setup>
import { defineProps } from 'vue';

const props = defineProps({
    level: {
        type: [String, Number],
        required: true,
        validator: (value) => {
            const num = parseInt(value, 10);
            return !isNaN(num) && num >= 1 && num <= 5;
        }
    },
    dangerScore: {
        type: [String, Number],
        default: 0
    },
    mode: {
        type: String,
        default: 'bar',
        validator: (value) => ['bar', 'dot'].includes(value)
    },
    hideLabel: {
        type: Boolean,
        default: false
    }
});

function calculateDefconPercentage(level) {
    const numericLevel = parseInt(level, 10);
    const minLevel = 1;
    const maxLevel = 5;
    if (isNaN(numericLevel) || numericLevel < minLevel || numericLevel > maxLevel) return 0;
    return ((maxLevel - numericLevel) / (maxLevel - minLevel)) * 100;
}

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
.defcon-wrapper {
    display: inline-flex;
    align-items: center;
    width: 100%;
}

/* --- BAR MODE --- */
.defcon-bar-container {
    height: 18px;
    width: 100%;
    background-color: #3b3030;
    border: 1px solid #663a39;
    border-radius: 4px;
    overflow: hidden;
    position: relative;
    min-width: 100px;
}

.defcon-bar-fill {
    height: 100%;
    transition: width 0.4s ease-out, background-color 0.4s ease-out;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 4px;
}

.defcon-level-text {
    color: #1e1b1a;
    text-shadow: 0 0 2px rgba(255, 255, 255, 0.7);
}

/* --- DOT MODE --- */
.defcon-dot-container {
    position: relative;
    width: 22px;
    height: 22px;
    min-width: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #000;
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
    z-index: 2;
    transform: translateZ(0); /* Isola il layer per evitare redraw jitter */
}

.defcon-dot-label {
    position: relative;
    z-index: 3;
}

.pulse-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    height: 100%;
    border-radius: 50%;
    z-index: 1;
    opacity: 0;
    will-change: transform, opacity; /* Suggerisce accelerazione hardware */
}

/* --- COLORS & ANIMATIONS --- */
.defcon-normal { background-color: #1e88e5; }
.defcon-dot-container.defcon-normal .pulse-ring { border: 2px solid #1e88e5; animation: pulse-dot 3s infinite; }

.defcon-low { background-color: #43a047; }
.defcon-dot-container.defcon-low .pulse-ring { border: 2px solid #43a047; animation: pulse-dot 2.5s infinite; }

.defcon-medium { background-color: #fdd835; }
.defcon-dot-container.defcon-medium .pulse-ring { border: 2px solid #fdd835; animation: pulse-dot 2s infinite; }

.defcon-high { background-color: #e53935; }
.defcon-dot-container.defcon-high .pulse-ring { border: 2px solid #e53935; animation: pulse-dot 1.5s infinite; }

.defcon-critical { 
    background-color: #ffffff; 
    color: #b71c1c;
    box-shadow: 0 0 12px rgba(255, 255, 255, 0.9), 0 0 8px rgba(183, 28, 28, 0.9);
}

/* Bar-specific critical pulse */
.defcon-bar-fill.defcon-critical {
    animation: critical-bar-pulse 1.5s infinite alternate;
}

/* Dot-specific critical pulse */
.defcon-dot-container.defcon-critical .pulse-ring { 
    border: 3px solid #ffffff; 
    animation: pulse-dot-critical 1.2s infinite; 
}

@keyframes pulse-dot {
    0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.8; }
    80%, 100% { transform: translate(-50%, -50%) scale(1.8); opacity: 0; }
}

@keyframes pulse-dot-critical {
    0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; border-width: 4px; }
    100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; border-width: 1px; }
}

@keyframes critical-bar-pulse {
    from { box-shadow: 0 0 8px rgba(255, 255, 255, 0.6); }
    to { box-shadow: 0 0 16px rgba(255, 255, 255, 1); }
}
</style>