<script setup>
import { ref, computed, watch } from 'vue';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    TimeScale
} from 'chart.js';
import { Line, Scatter } from 'vue-chartjs';
import 'chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm';
import { useI18n } from 'vue-i18n';
import dayjs from 'dayjs';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    TimeScale,
    Title,
    Tooltip,
    Legend,
    Filler
);

const { t } = useI18n();

const props = defineProps({
    attacks: {
        type: Array,
        required: true,
        default: () => []
    }
});

// Visualization Modes
const modes = [
    { label: 'attackChart.frequency', value: 'frequency' },
    { label: 'attackChart.severity', value: 'severity' }
];
const selectedMode = ref('frequency');

// Helper for aggregation
const getAggregation = (attacks) => {
    // Sort by time
    const sorted = [...attacks].sort((a, b) => new Date(a.lastSeen) - new Date(b.lastSeen));
    if (sorted.length === 0) return { labels: [], values: [] };

    // Determine bucket size based on total range
    const first = dayjs(sorted[0].lastSeen);
    const last = dayjs(sorted[sorted.length - 1].lastSeen);
    const diffHours = last.diff(first, 'hour');

    // Default bucket: 'minute' if short range, 'hour' if medium, 'day' if long
    let bucketFormat = 'HH:mm';
    if (diffHours > 48) bucketFormat = 'YYYY-MM-DD';
    else if (diffHours > 12) bucketFormat = 'HH:00';

    const map = new Map();
    sorted.forEach(atk => {
        const key = dayjs(atk.lastSeen).format(bucketFormat);
        map.set(key, (map.get(key) || 0) + 1);
    });

    return {
        labels: Array.from(map.keys()),
        values: Array.from(map.values())
    };
};

const getSeverityData = (attacks) => {
    return attacks.map(atk => ({
        x: new Date(atk.lastSeen).getTime(), // Time axis
        y: atk.dangerScore,                  // Y axis Score
        r: 6 + Math.min(atk.totaleLogs / 10, 10), // Radius based on logs volume (clamped)
        // Additional data for tooltip
        ip: atk.request.ip,
        score: atk.dangerScore
    }));
};

// --- CHART DATA COMPUTED PROPERTIES ---

// 1. Frequency Chart Data (Line)
const frequencyData = computed(() => {
    const agg = getAggregation(props.attacks);
    return {
        labels: agg.labels,
        datasets: [{
            label: t('attackChart.frequencyLabel') || 'Attacks Count',
            data: agg.values,
            borderColor: '#ff4c4c',
            backgroundColor: 'rgba(217, 48, 37, 0.25)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#ff4c4c',
            pointRadius: 4
        }]
    };
});

// 2. Severity Chart Data (Scatter/Bubble)
const severityData = computed(() => {
    const dataPoints = getSeverityData(props.attacks);

    // Dynamic coloring based on Score
    const pointBackgroundColors = dataPoints.map(p => {
        if (p.y >= 80) return 'rgba(217, 48, 37, 0.7)'; // High - Red
        if (p.y >= 50) return 'rgba(255, 153, 0, 0.7)'; // Med - Orange
        return 'rgba(76, 175, 80, 0.7)';                // Low - Green
    });

    const pointBorderColors = dataPoints.map(p => {
        if (p.y >= 80) return '#ff4c4c';
        if (p.y >= 50) return '#ffcc00';
        return '#4caf50';
    });

    return {
        datasets: [{
            label: t('attackChart.severityLabel') || 'Attack Severity',
            data: dataPoints,
            backgroundColor: pointBackgroundColors,
            borderColor: pointBorderColors,
            borderWidth: 1
        }]
    };
});


// --- CHART OPTIONS ---

const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        title: { display: false },
        tooltip: {
            backgroundColor: 'rgba(47, 40, 37, 0.95)',
            titleColor: '#ff4c4c',
            bodyColor: '#e6d4cf',
            borderColor: '#5a2a26',
            borderWidth: 1
        }
    },
    scales: {
        x: {
            grid: { color: '#3a3736' },
            ticks: { color: '#e6d4cf' }
        },
        y: {
            grid: { color: '#3a3736' },
            ticks: { color: '#e6d4cf' },
            beginAtZero: true
        }
    }
};

const severityOptions = computed(() => ({
    ...commonOptions,
    scales: {
        x: {
            type: 'time',
            time: {
                unit: 'hour', // Auto-adjusts usually, can be explicit
                displayFormats: {
                    hour: 'HH:mm',
                    day: 'MMM DD'
                }
            },
            grid: { color: '#3a3736' },
            ticks: { color: '#e6d4cf' }
        },
        y: {
            ...commonOptions.scales.y,
            max: 100,
            title: { display: true, text: 'Danger Score', color: '#888' }
        }
    },
    plugins: {
        ...commonOptions.plugins,
        tooltip: {
            ...commonOptions.plugins.tooltip,
            callbacks: {
                label: (ctx) => {
                    const raw = ctx.raw;
                    return `IP: ${raw.ip} | Score: ${raw.y}`;
                }
            }
        }
    }
}));


</script>

<template>
    <div class="attack-chart-container">
        <div class="chart-header">
            <h3>{{ t('attackChart.title') || 'Attacks Analysis' }}</h3>
            <div class="controls">
                <el-select v-model="selectedMode" size="small" style="width: 140px;">
                    <el-option v-for="m in modes" :key="m.value" :label="t(m.label)" :value="m.value" />
                </el-select>
            </div>
        </div>

        <div class="chart-wrapper">
            <Line v-if="selectedMode === 'frequency'" :data="frequencyData" :options="commonOptions" />
            <Scatter v-else :data="severityData" :options="severityOptions" />
        </div>
    </div>
</template>

<style scoped>
.attack-chart-container {
    width: 100%;
    margin-bottom: 20px;
    background: linear-gradient(180deg, #2f2825, #2b1b17 50%, #271511);
    border-radius: 8px;
    padding: 15px;
    box-shadow: inset 0 0 20px #5a2a26, 0 4px 15px rgba(217, 48, 37, 0.3);
    border: 1px solid #5a2a26;
}

.chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

h3 {
    color: #e6d4cf;
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
}

.chart-wrapper {
    position: relative;
    height: 300px;
    width: 100%;
}
</style>
