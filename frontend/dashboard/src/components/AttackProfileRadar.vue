<script setup>
import { computed } from 'vue';
import { Chart as ChartJS, Title, Tooltip, Legend, RadialLinearScale, PointElement, LineElement } from 'chart.js';
import { Radar } from 'vue-chartjs';

// Devi registrare tutti questi elementi!
ChartJS.register(Title, Tooltip, Legend, RadialLinearScale, PointElement, LineElement);

// Importa il tuo componente Chart.js/Vue qui (es. RadarChart, Chart)
// Esempio con vue-chartjs (deve essere installato: npm install vue-chartjs chart.js)
// import { Radar } from 'vue-chartjs'; 
// import { Chart as ChartJS, Title, Tooltip, Legend, RadialLinearScale, PointElement, LineElement } from 'chart.js';

// ChartJS.register(Title, Tooltip, Legend, RadialLinearScale, PointElement, LineElement);

const props = defineProps({
    attackDetail: {
        type: Object,
        required: true
    }
});

// Valore di Normalizzazione per l'Asse 5 (countRateLimit)
// Siccome countRateLimit non ha un campo *Norm, devi definire un tetto massimo.
// Ad esempio, se 50 rate limit events sono considerati estremi, usiamo 50 come divisore.
const MAX_RATE_LIMIT_COUNT = 50;

// Aggiungi questa costante all'inizio dello script
const GAMMA_FACTOR = 0.5; // Fattore di allungamento per i valori piccoli (radice quadrata)

// Funzione di utilità per trasformare e scalare
const transformAndScale = (value) => {
    // 1. Applica la trasformazione a potenza (Gamma Correction)
    const transformedValue = Math.pow(value || 0, GAMMA_FACTOR);

    // 2. Scala da 0-1 a 0-100 per il grafico
    return transformedValue * 100;
};

const originalData = computed(() => {
    const attack = props.attackDetail;

    return [
        // Asse 1: Rischio Tecnico
        { label: 'Rischio Tecnico', rawValue: attack.averageScore, format: (v) => v ? v.toFixed(2) + ' score' : 'N/D' },

        // Asse 2: Complessità (Tecniche Uniche)
        { label: 'Complessità', rawValue: attack.uniqueTechCount, format: (v) => v ? v.toFixed(0) + ' tecniche' : 'N/D' },

        // Asse 3: Velocità (RPS)
        { label: 'Velocità (RPS)', rawValue: attack.rps, format: (v) => v ? v.toFixed(1) + ' RPS' : 'N/D' },

        // Asse 4: Persistenza (Durata)
        { label: 'Durata', rawValue: attack.attackDurationMinutes, format: (v) => v ? v.toFixed(0) + ' sec' : 'N/D' },
    ];
});

// Calcolo dei Dati per il Grafico
const chartData = computed(() => {
    const attack = props.attackDetail;

    // Normalizzazione dell'Asse 5 (CountRateLimit)
    const rateLimitNorm = Math.min(
        (attack.countRateLimit || 40) / MAX_RATE_LIMIT_COUNT,
        1.0
    );

    // Asse 2: Bassa Velocità/Stealth (Invertito)
    const rpsInvertedNorm = 1.0 - (attack.rpsNorm || 0);

    // Calcolo e Trasformazione di TUTTI i dati
    const dataValues = [
        transformAndScale(attack.scoreNorm),         // 1. Rischio Tecnico
        transformAndScale(attack.uniqueTechNorm),    // 3. Complessità
        transformAndScale(attack.rpsNorm),          // 2. Bassa Velocità (Invertito + Trasformato)
        transformAndScale(attack.attackDurationMinutes),  // 4. Persistenza
    ];

    return {
        labels: originalData.value.map(d => d.label), // Usa le etichette dell'array grezzo,
        datasets: [
            {
                label: `Profilo Attacco IP: ${attack.request.ip}`,
                data: dataValues,
                // Colori Verde brillante/Azzurro tipici di PES
                backgroundColor: 'rgba(0, 255, 128, 0.3)', // Verde acqua/lime trasparente
                borderColor: 'rgb(0, 255, 128)',           // Contorno Verde acceso
                pointBackgroundColor: 'rgb(0, 255, 128)',  // Punti Verde acceso
                pointBorderColor: '#000',                  // Bordo punti nero/scuro per contrasto
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(0, 255, 128)',
                borderWidth: 2,
                fill: true
            }
        ]
    };
});

// Opzioni del Grafico (importante per la scala da 0 a 100)
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        r: {
            angleLines: { color: '#666' },
            grid: { color: '#444' },
            pointLabels: { color: '#AAA', font: { size: 12 } },
            suggestedMin: 0,
            suggestedMax: 100, // Scala da 0 a 100%
            ticks: { display: false } // Nasconde i numeri sulla scala
        }
    },
    plugins: {
        legend: { display: false },
        tooltip: {
            callbacks: {
                // 3. MODIFICA DEL TOOLTIP CALLBACK
                label: (context) => {
                    const index = context.dataIndex;
                    // Accedi ai dati originali tramite l'indice e la computed property
                    const original = originalData.value[index];
                    const transformed = context.raw.toFixed(1); // Valore visualizzato sul grafico (0-100)

                    let output = `${original.label}: ${transformed}%`;

                    if (original.rawValue !== undefined) {
                        // Aggiungi il valore originale formattato
                        output += ` (${original.format(original.rawValue)})`;
                    }
                    return output;
                },
                title: (context) => context[0].dataset.label,
            },
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            titleColor: '#FFF',
            bodyColor: '#FFF',
        }
    }
};
</script>

<template>
    <div class="radar-chart-container">
        <Radar :data="chartData" :options="chartOptions" :height="400" :width="400" />
    </div>
</template>

<style scoped>
.radar-chart-container {
    height: 400px;
    /* Altezza fissa */
    width: 100%;
    max-width: 600px;
    margin: 20px auto;
    padding: 15px;
    background: #1e1e1e;
    /* Sfondo scuro */
    border-radius: 8px;
}

.chart-note {
    text-align: center;
    font-size: 0.8em;
    color: #888;
    margin-top: 10px;
}
</style>