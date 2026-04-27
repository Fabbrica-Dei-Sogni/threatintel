<script setup>
import { computed, inject } from 'vue';
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
    },
    isMobile: {
        type: Boolean,
        default: false
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

    // Asse 3: Bassa Velocità/Stealth (Invertito per mostrare il rischio stealth)
    const rpsInvertedNorm = 1.0 - (attack.rpsNorm || 0);

    // Calcolo e Trasformazione di TUTTI i dati
    const dataValues = [
        transformAndScale(attack.scoreNorm),         // 1. Rischio Tecnico
        transformAndScale(attack.uniqueTechNorm),    // 3. Complessità
        transformAndScale(rpsInvertedNorm),          // 2. Bassa Velocità (Invertito per Stealth)
        transformAndScale(attack.durNorm),           // 4. Persistenza (Normalizzata)
    ];

    return {
        labels: originalData.value.map(d => d.label),
        datasets: [
            {
                label: attack.isDistributed 
                    ? `${t('attackDetail.distributedAttacker')}`
                    : `${t('components.radar.attackProfile')}: ${attack.request?.ip || 'N/A'}`,
                data: dataValues,
                // Colore Magma (Rosso Fuoco)
                backgroundColor: 'rgba(230, 33, 23, 0.2)', 
                borderColor: 'rgba(230, 33, 23, 1)',            
                pointBackgroundColor: '#ff4c4c',   
                pointBorderColor: '#000',                
                pointHoverBackgroundColor: '#fff',       
                pointHoverBorderColor: '#ff4c4c',  
                borderWidth: 2,
                pointRadius: 4,
                fill: true
            }
        ]
    };
});

// Opzioni del Grafico (computed per reattività a isMobile)
const chartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        r: {
            angleLines: { color: 'rgba(230, 33, 23, 0.2)' },           
            grid: { color: 'rgba(230, 33, 23, 0.1)' },                  
            pointLabels: {
                color: '#ff9999',                       
                font: { 
                    size: props.isMobile ? 10 : 13, 
                    weight: '800'
                }
            },
            suggestedMin: 0,
            suggestedMax: 100, 
            ticks: { display: false } 
        }
    },
    plugins: {
        legend: { display: false },
        tooltip: {
            callbacks: {
                label: (context) => {
                    const index = context.dataIndex;
                    const original = originalData.value[index];
                    const transformed = context.raw.toFixed(1);

                    let output = `${original.label}: ${transformed}%`;

                    if (original.rawValue !== undefined) {
                        output += ` (${original.format(original.rawValue)})`;
                    }
                    return output;
                },
                title: (context) => context[0].dataset.label,
            },
            backgroundColor: 'rgba(15, 10, 8, 0.95)',  
            titleColor: '#ff4c4c',                       
            bodyColor: '#f0e6d2',                        
            borderColor: 'rgba(230, 33, 23, 0.5)',                      
            borderWidth: 1
        }
    }
}));

</script>

<template>
    <div class="radar-chart-container">
        <Radar :data="chartData" :options="chartOptions" />
    </div>
</template>

<style scoped>
.radar-chart-container {
    width: 100%;
    height: 100%;
    padding: clamp(10px, 3vw, 30px);
    background: transparent;
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