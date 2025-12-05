<script setup>
import { computed } from 'vue';
import { Chart as ChartJS, Title, Tooltip, Legend, RadialLinearScale, PointElement, LineElement, Filler } from 'chart.js';
import { Radar } from 'vue-chartjs';
import { useI18n } from 'vue-i18n';

// Registrazione dei componenti Chart.js (incluso Filler per il riempimento!)
ChartJS.register(Title, Tooltip, Legend, RadialLinearScale, PointElement, LineElement, Filler);

// i18n
const { t } = useI18n();

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
        { label: t('components.radar.threatIndex'), rawValue: attack.averageScore, format: (v) => v ? v.toFixed(2) + ` ${t('components.radar.score')}` : t('components.radar.notAvailable') },

        // Asse 2: Complessità (Tecniche Uniche)
        { label: t('components.radar.breadth'), rawValue: attack.uniqueTechCount, format: (v) => v ? v.toFixed(0) + ` ${t('components.radar.techniques')}` : t('components.radar.notAvailable') },

        // Asse 3: Velocità (RPS)
        { label: t('components.radar.speed'), rawValue: attack.rps, format: (v) => v ? v.toFixed(1) + ` ${t('components.radar.rps')}` : t('components.radar.notAvailable') },

        // Asse 4: Persistenza (Durata)
        { label: t('components.radar.duration'), rawValue: attack.attackDurationMinutes, format: (v) => v ? v.toFixed(0) + ` ${t('components.radar.minutes')}` : t('components.radar.notAvailable') },
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
                label: `${t('components.radar.attackProfile')}: ${attack.request.ip}`,
                data: dataValues,
                // Colori coordinati con AttackDetail.css (rosso-bruciato)
                backgroundColor: 'rgba(217, 48, 37, 0.25)', // Rosso brillante semi-trasparente (#d93025)
                borderColor: 'rgb(255, 76, 76)',            // Contorno rosso acceso (#ff4c4c)
                pointBackgroundColor: 'rgb(255, 76, 76)',   // Punti rosso acceso
                pointBorderColor: '#2f2825',                // Bordo punti marrone scuro (dal CSS)
                pointHoverBackgroundColor: '#f8eee0',       // Hover color crema chiaro
                pointHoverBorderColor: 'rgb(217, 48, 37)',  // Hover border rosso brillante
                borderWidth: 3,
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
            angleLines: { color: '#553c37' },           // Linee angolari marroni scure
            grid: { color: '#3a3736' },                  // Griglia marrone scuro (dal CSS)
            pointLabels: {
                color: '#e6d4cf',                        // Etichette color crema (dal CSS)
                font: { size: 13, weight: '600' }
            },
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
            backgroundColor: 'rgba(47, 40, 37, 0.95)',  // Sfondo tooltip marrone scuro (#2f2825)
            titleColor: '#ff4c4c',                       // Titolo rosso acceso
            bodyColor: '#f0e6d2',                        // Testo color crema
            borderColor: '#ff4c4c',                      // Bordo rosso
            borderWidth: 1
        }
    }
};
</script>

<template>
    <div class="radar-chart-container">
        <Radar :data="chartData" :options="chartOptions" />
    </div>
</template>

<style scoped>
.radar-chart-container {
    /* Dimensioni dinamiche basate sul parent */
    width: 100%;
    height: 100%;
    min-height: 250px;

    /* Padding minimale per mobile */
    padding: 10px;
    margin: 0;

    /* Styling coordinato con AttackDetail.css */
    background: linear-gradient(180deg, #2f2825, #2b1b17 50%, #271511);
    border-radius: 8px;
    box-shadow: inset 0 0 20px #5a2a26, 0 4px 15px rgba(217, 48, 37, 0.3);

    /* Mantiene aspect ratio */
    display: flex;
    justify-content: center;
    align-items: center;
}

.chart-note {
    text-align: center;
    font-size: 0.8em;
    color: #888;
    margin-top: 10px;
}
</style>