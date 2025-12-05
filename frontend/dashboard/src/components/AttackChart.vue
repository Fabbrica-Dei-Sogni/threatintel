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
    { label: 'attackChart.severity', value: 'severity' },
    { label: 'attackChart.duration', value: 'duration' }
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

const getDefconColor = (score, alpha = 0.7) => {
    if (score <= 15) return `rgba(30, 136, 229, ${alpha})`;   // DEFCON 5 - Blu
    if (score <= 30) return `rgba(67, 160, 71, ${alpha})`;    // DEFCON 4 - Verde
    if (score <= 60) return `rgba(253, 216, 53, ${alpha})`;   // DEFCON 3 - Giallo
    if (score <= 85) return `rgba(229, 57, 53, ${alpha})`;    // DEFCON 2 - Rosso
    return `rgba(255, 255, 255, ${alpha})`;                   // DEFCON 1 - Bianco
};

const getSeverityData = (attacks) => {
    return attacks.map(atk => ({
        x: new Date(atk.lastSeen).getTime(), // Time axis
        y: atk.dangerScore,                  // Y axis Score
        r: 6 + Math.min(atk.totaleLogs / 10, 20), // Radius based on logs volume (clamped)
        // Additional data for tooltip
        ip: atk.request.ip,
        score: atk.dangerScore,
        logs: atk.totaleLogs
    }));
};

const getDurationData = (attacks) => {
    // Sort logic to ensure consistent lines
    const sorted = [...attacks].sort((a, b) => new Date(a.firstSeen) - new Date(b.firstSeen));
    const points = [];

    sorted.forEach(atk => {
        const color = getDefconColor(atk.dangerScore);
        const glowColor = getDefconColor(atk.dangerScore, 0.2); // Faint background
        // Calculate dynamic radius based on total logs
        // Minimum 4px, add log volume factor, max 15px
        const radius = 4 + Math.min(atk.totaleLogs / 20, 15);

        const commonData = {
            ip: atk.request.ip,
            score: atk.dangerScore,
            color: color,
            glowColor: glowColor,
            duration: atk.durataAttacco?.human || 'N/A',
            logs: atk.totaleLogs,
            dynamicRadius: radius
        };

        points.push({
            x: new Date(atk.firstSeen).getTime(),
            y: atk.dangerScore,
            ...commonData
        });
        points.push({
            x: new Date(atk.lastSeen).getTime(),
            y: atk.dangerScore,
            ...commonData
        });
        // No null points to avoid interaction errors
    });
    return points;
}

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

    // Dynamic coloring using helper
    const pointBackgroundColors = dataPoints.map(p => getDefconColor(p.y));
    const pointBorderColors = dataPoints.map(p => getDefconColor(p.y)); // Same color for border

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

// 3. Duration Chart Data (Line with segments)
const durationData = computed(() => {
    const points = getDurationData(props.attacks);

    // Dataset 1: Glow/Background (Thick line)
    const backgroundDataset = {
        label: t('attackChart.durationLabel'),
        data: points,
        pointRadius: 0, // No points for background
        pointHoverRadius: 0,
        fill: false,
        // Segment styling for thick background
        segment: {
            borderColor: ctx => {
                const i = ctx.p0DataIndex;
                // Even index = attack segment
                if (i % 2 === 0) {
                    return ctx.p0.raw ? ctx.p0.raw.glowColor : 'transparent';
                }
                return 'transparent';
            },
            borderWidth: ctx => {
                const i = ctx.p0DataIndex;
                if (i % 2 === 0) {
                    // Width = Diameter = 2 * Radius
                    return ctx.p0.raw ? ctx.p0.raw.dynamicRadius * 2 : 0;
                }
                return 0;
            }
        },
        order: 2 // Render behind
    };

    // Dataset 2: Spine/Foreground (Thin line + dots)
    const foregroundDataset = {
        label: t('attackChart.durationLabel'),
        data: points,
        borderWidth: 2, // Thinner connecting line
        pointRadius: (ctx) => ctx.raw ? ctx.raw.dynamicRadius : 3,
        pointHoverRadius: (ctx) => ctx.raw ? ctx.raw.dynamicRadius + 3 : 6,
        pointBackgroundColor: (ctx) => ctx.raw ? ctx.raw.color : '#888',
        pointBorderColor: '#2f2825',
        fill: false,
        segment: {
            borderColor: ctx => {
                const i = ctx.p0DataIndex;
                if (i % 2 === 0) {
                    return ctx.p0.raw ? ctx.p0.raw.color : '#888';
                }
                return 'transparent';
            }
        },
        order: 1 // Render on top
    };

    return {
        datasets: [backgroundDataset, foregroundDataset]
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

const durationOptions = computed(() => ({
    ...severityOptions.value, // Reuse time-scale options
    plugins: {
        ...severityOptions.value.plugins,
        tooltip: {
            ...severityOptions.value.plugins.tooltip,
            callbacks: {
                label: (ctx) => {
                    const raw = ctx.raw;
                    // Check if raw data exists
                    if (!raw) return '';
                    return `IP: ${raw.ip} | Score: ${raw.y} | Logs: ${raw.logs} | Time: ${raw.duration}`;
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
            <Scatter v-else-if="selectedMode === 'severity'" :data="severityData" :options="severityOptions" />
            <Line v-else :data="durationData" :options="durationOptions" />
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
