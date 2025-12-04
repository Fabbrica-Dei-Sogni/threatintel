<template>
    <div class="hex-editor-wrapper">
        <div v-if="label" class="hex-label">{{ label }}</div>
        <div class="hex-editor-container">

            <!-- Header delle colonne (00 01 02 ...) -->
            <div class="hex-row header">
                <div class="hex-offset">Offset</div>
                <div class="hex-bytes">
                    <span v-for="n in 16" :key="n">{{ (n - 1).toString(16).toUpperCase().padStart(2, '0') }}</span>
                </div>
                <div class="hex-ascii">Decoded Text</div>
            </div>

            <!-- Righe Dati -->
            <div v-for="(row, rIndex) in rows" :key="rIndex" class="hex-row" :class="{ 'alternate': rIndex % 2 !== 0 }">
                <!-- Colonna Offset -->
                <div class="hex-offset">
                    {{ (rIndex * 16).toString(16).toUpperCase().padStart(8, '0') }}
                </div>

                <!-- Colonna Hex -->
                <div class="hex-bytes">
                    <span v-for="(byte, bIndex) in 16" :key="bIndex" class="byte-cell"
                        :class="{ 'empty': !row[bIndex] && row[bIndex] !== 0 }"
                        @mouseover="highlightIndex = (rIndex * 16) + bIndex" @mouseleave="highlightIndex = -1">
                        {{ formatHex(row[bIndex]) }}
                    </span>
                </div>

                <!-- Colonna ASCII -->
                <div class="hex-ascii">
                    <span v-for="(byte, bIndex) in row" :key="bIndex" class="ascii-char" :class="{
                        'highlight': highlightIndex === (rIndex * 16) + bIndex,
                        'control-char': !isPrintable(byte)
                    }">
                        {{ formatAscii(byte) }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
    rawData: {
        type: [Object, String, Array],
        required: true
    },
    label: {
        type: String,
        default: ''
    }
});

const highlightIndex = ref(-1);

// Converte l'input in Uint8Array
const byteData = computed(() => {
    let text = '';

    if (!props.rawData) return new Uint8Array(0);

    if (typeof props.rawData === 'object') {
        // Se è un oggetto, lo rendiamo JSON pretty printato
        text = JSON.stringify(props.rawData, null, 2);
    } else {
        text = String(props.rawData);
    }

    const encoder = new TextEncoder();
    return encoder.encode(text);
});

// Suddivide i dati in righe da 16 byte
const rows = computed(() => {
    const result = [];
    const data = byteData.value;
    for (let i = 0; i < data.length; i += 16) {
        // Array.from crea un array vero e proprio dallo slice
        result.push(Array.from(data.slice(i, i + 16)));
    }
    return result;
});

// Utility
const formatHex = (byte) => {
    if (byte === undefined) return '  ';
    return byte.toString(16).toUpperCase().padStart(2, '0');
};

const isPrintable = (byte) => {
    return byte >= 32 && byte <= 126;
};

const formatAscii = (byte) => {
    if (isPrintable(byte)) {
        return String.fromCharCode(byte);
    }
    return '.';
};
</script>

<style scoped>
.hex-editor-wrapper {
    margin-top: 10px;
    margin-bottom: 20px;
}

.hex-label {
    font-size: 14px;
    font-weight: bold;
    color: #ff4c4c;
    margin-bottom: 5px;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.hex-editor-container {
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    background-color: #1e1e1e;
    border: 1px solid #444;
    border-radius: 6px;
    padding: 10px;
    font-size: 13px;
    line-height: 1.4;
    color: #d4d4d4;
    overflow-x: auto;
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
}

.hex-row {
    display: flex;
    gap: 15px;
}

.hex-row.header {
    color: #569cd6;
    border-bottom: 1px solid #444;
    margin-bottom: 5px;
    padding-bottom: 5px;
    font-weight: bold;
}

.hex-row.alternate {
    background-color: rgba(255, 255, 255, 0.03);
}

.hex-offset {
    color: #858585;
    user-select: none;
    min-width: 70px;
}

.hex-bytes {
    display: grid;
    grid-template-columns: repeat(16, 1fr);
    gap: 6px;
    color: #ce9178;
    /* Colore tipico dei numeri/stringhe */
    min-width: 350px;
}

.byte-cell {
    text-align: center;
    cursor: default;
}

.byte-cell:hover {
    background-color: #264f78;
    color: white;
}

.hex-ascii {
    min-width: 150px;
    border-left: 1px solid #444;
    padding-left: 10px;
    white-space: pre;
    color: #9cdcfe;
}

.ascii-char {
    display: inline-block;
    width: 1ch;
    text-align: center;
}

.ascii-char.control-char {
    color: #606060;
}

.ascii-char.highlight {
    background-color: #264f78;
    color: white;
    font-weight: bold;
}

/* Scrollbar stilizzata per il dark mode */
.hex-editor-container::-webkit-scrollbar {
    height: 8px;
    width: 8px;
}

.hex-editor-container::-webkit-scrollbar-track {
    background: #1e1e1e;
}

.hex-editor-container::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 4px;
}

.hex-editor-container::-webkit-scrollbar-thumb:hover {
    background: #555;
}
</style>