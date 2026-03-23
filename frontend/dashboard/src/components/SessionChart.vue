<script setup>
import { ref, computed } from 'vue';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
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
    TimeScale,
    Title,
    Tooltip,
    Legend,
    Filler
);

const { t } = useI18n();

const props = defineProps({
    sessions: {
        type: Array,
        required: true,
        default: () => []
    }
});

// Visualization Modes
const modes = [
    { label: 'sessionChart.frequency', value: 'frequency' },
    { label: 'sessionChart.activity', value: 'activity' }
];
const selectedMode = ref('frequency');

// Frequency data calculation
const frequencyData = computed(() => {
    if (props.sessions.length === 0) return { labels: [], datasets: [] };
    
    // Sort by starttime
    const sorted = [...props.sessions].sort((a, b) => new Date(a.starttime) - new Date(b.starttime));
    
    const first = dayjs(sorted[0].starttime);
    const last = dayjs(sorted[sorted.length - 1].starttime);
    const diffHours = last.diff(first, 'hour');

    // Dynamic bucket format
    let bucketFormat = 'HH:mm';
    if (diffHours > 48) bucketFormat = 'YYYY-MM-DD';
    else if (diffHours > 12) bucketFormat = 'HH:00';

    const map = new Map();
    sorted.forEach(s => {
        const key = dayjs(s.starttime).format(bucketFormat);
        map.set(key, (map.get(key) || 0) + 1);
    });

    return {
        labels: Array.from(map.keys()),
        datasets: [{
            label: t('sessionChart.frequencyLabel'),
            data: Array.from(map.values()),
            borderColor: '#ff4c4c',
            backgroundColor: 'rgba(255, 76, 76, 0.2)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#ff4c4c',
            pointRadius: 4
        }]
    };
});

// Activity data calculation (Scatter plot)
const activityData = computed(() => {
    const dataPoints = props.sessions.map(s => ({
        x: new Date(s.starttime).getTime(),
        y: s.eventCount || 0,
        ip: s.src_ip,
        duration: dayjs(s.endtime).diff(dayjs(s.starttime), 'second') + 's'
    }));

    return {
        datasets: [{
            label: t('sessionChart.activityLabel'),
            data: dataPoints,
            backgroundColor: 'rgba(255, 140, 140, 0.7)',
            borderColor: 'rgba(255, 76, 76, 1)',
            borderWidth: 1,
            pointRadius: (ctx) => {
                const val = ctx.raw ? ctx.raw.y : 0;
                return 4 + Math.min(val / 5, 12); // Radius based on event count
            }
        }]
    };
});

// --- CHART OPTIONS ---

const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    color: '#f0e6d2',
    plugins: {
        legend: { display: false },
        tooltip: {
            backgroundColor: 'rgba(30, 27, 26, 0.95)',
            titleColor: '#ff4c4c',
            bodyColor: '#f0e6d2',
            borderColor: '#ff4c4c',
            borderWidth: 1,
            padding: 10
        }
    },
    scales: {
        x: {
            grid: { color: 'rgba(255, 76, 76, 0.05)' },
            ticks: { color: '#f0e6d2' }
        },
        y: {
            grid: { color: 'rgba(255, 76, 76, 0.05)' },
            ticks: { color: '#f0e6d2' },
            beginAtZero: true
        }
    }
};

const activityOptions = computed(() => ({
    ...commonOptions,
    scales: {
        x: {
            type: 'time',
            time: {
                unit: 'hour',
                displayFormats: {
                    hour: 'HH:mm',
                    day: 'MMM DD'
                }
            },
            grid: { color: 'rgba(255, 76, 76, 0.05)' },
            ticks: { color: '#f0e6d2' }
        },
        y: {
            ...commonOptions.scales.y,
            title: { 
                display: true, 
                text: t('sessionChart.activityLabel'),
                color: '#6b7280',
                font: { size: 12 }
            }
        }
    },
    plugins: {
        ...commonOptions.plugins,
        tooltip: {
            ...commonOptions.plugins.tooltip,
            callbacks: {
                label: (ctx) => {
                    const raw = ctx.raw;
                    return `${t('sessionChart.ip')}: ${raw.ip} | ${t('sessionChart.events')}: ${raw.y} | ${t('sessionChart.duration')}: ${raw.duration}`;
                }
            }
        }
    }
}));

</script>

<template>
    <div class="session-chart-container glass-card">
        <div class="chart-header">
            <div class="title-with-icon">
                <span class="icon">📈</span>
                <h3>{{ t('sessionChart.title') }}</h3>
            </div>
            <div class="controls">
                <el-select v-model="selectedMode" size="small" style="width: 180px;">
                    <el-option v-for="m in modes" :key="m.value" :label="t(m.label)" :value="m.value" />
                </el-select>
            </div>
        </div>

        <div class="chart-wrapper">
            <Line v-if="selectedMode === 'frequency'" :data="frequencyData" :options="commonOptions" />
            <Scatter v-else :data="activityData" :options="activityOptions" />
        </div>
        
        <div v-if="sessions.length === 0" class="no-data-overlay">
            {{ t('common.noDataFound') }}
        </div>
    </div>
</template>

<style scoped>
.session-chart-container {
    width: 100%;
    margin-bottom: 25px;
    padding: 20px;
    position: relative;
    overflow: hidden;
}

.chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.title-with-icon {
    display: flex;
    align-items: center;
    gap: 10px;
}

.icon {
    font-size: 1.2rem;
}

h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #e2e8f0;
    letter-spacing: 0.5px;
}

.chart-wrapper {
    position: relative;
    height: 320px;
    width: 100%;
}

.no-data-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #94a3b8;
    font-style: italic;
    background: rgba(15, 23, 42, 0.6);
    padding: 10px 20px;
    border-radius: 20px;
    pointer-events: none;
}

/* Custom transitions for chart mode switching */
.fade-enter-active, .fade-leave-active {
    transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
    opacity: 0;
}
</style>
