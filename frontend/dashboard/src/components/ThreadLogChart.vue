<script setup>
import { computed } from 'vue';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'vue-chartjs';
import { useI18n } from 'vue-i18n';
import dayjs from 'dayjs';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const { t } = useI18n();

const props = defineProps({
    logs: {
        type: Array,
        required: true,
        default: () => []
    }
});

// Process logs to create chart data
// We want to show number of requests per time interval (e.g. per minute or per second depending on density)
// or just plot them linearly if "thread logs traces requests linearly in time" means we plot sequentially
// However, a line chart needs X (time) and Y (value).
// If we just want to show "peaks", maybe we can group by minute/hour or show 'Response Size' or 'Danger Score' over time.
// Given "peaks of network traffic", requests count per time bucket is usually best.
// But let's look at the logs data structure from previous turn. it has `timestamp`.
// Let's grouping by minute for "Traffic Peaks".

const chartData = computed(() => {
    if (!props.logs || props.logs.length === 0) {
        return { labels: [], datasets: [] };
    }

    // Sort logs by timestamp just in case
    const sortedLogs = [...props.logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Group by time bucket (e.g. minute) to show specific traffic intensity
    // Map: 'YYYY-MM-DD HH:mm' -> count
    const timeMap = new Map();

    sortedLogs.forEach(log => {
        // Round to minute for aggregation - adjusted to provide granular but smooth graph
        const key = dayjs(log.timestamp).format('HH:mm');
        timeMap.set(key, (timeMap.get(key) || 0) + 1);
    });

    const labels = Array.from(timeMap.keys());
    const dataValues = Array.from(timeMap.values());

    return {
        labels: labels,
        datasets: [
            {
                label: t('threatLogs.trafficPeaks') || 'Traffic Peaks',
                data: dataValues,
                borderColor: '#ff4c4c',            // Red from AttackProfileRadar
                backgroundColor: 'rgba(217, 48, 37, 0.25)', // Semi-transparent red
                pointBackgroundColor: '#ff4c4c',
                pointBorderColor: '#2f2825',       // Dark brown
                pointHoverBackgroundColor: '#f8eee0',
                pointHoverBorderColor: '#d93025',
                fill: true,
                tension: 0.4, // Smooth curve
                borderWidth: 2
            }
        ]
    };
});

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false // Hide legend if only one dataset
        },
        tooltip: {
            backgroundColor: 'rgba(47, 40, 37, 0.95)',
            titleColor: '#ff4c4c',
            bodyColor: '#f0e6d2',
            borderColor: '#ff4c4c',
            borderWidth: 1,
            callbacks: {
                label: (context) => `Requests: ${context.parsed.y}`
            }
        },
        title: {
            display: false,
            text: t('threatLogs.trafficOverTime') || 'Network Traffic Over Time',
            color: '#e6d4cf'
        }
    },
    scales: {
        x: {
            grid: {
                color: '#3a3736',
                display: true
            },
            ticks: {
                color: '#e6d4cf',
                maxTicksLimit: 10
            }
        },
        y: {
            grid: {
                color: '#3a3736',
                display: true
            },
            ticks: {
                color: '#e6d4cf',
                precision: 0
            },
            beginAtZero: true
        }
    }
};
</script>

<template>
    <div class="thread-log-chart-container">
        <h3>{{ t('threatLogs.trafficOverTime') || 'Traffic Analysis' }}</h3>
        <div class="chart-wrapper">
            <Line :data="chartData" :options="chartOptions" />
        </div>
    </div>
</template>

<style scoped>
.thread-log-chart-container {
    width: 100%;
    margin-bottom: 20px;
    background: linear-gradient(180deg, #2f2825, #2b1b17 50%, #271511);
    border-radius: 8px;
    padding: 15px;
    box-shadow: inset 0 0 20px #5a2a26, 0 4px 15px rgba(217, 48, 37, 0.3);
    border: 1px solid #5a2a26;
}

h3 {
    color: #e6d4cf;
    margin: 0 0 15px 0;
    font-size: 1.1rem;
    font-weight: 600;
}

.chart-wrapper {
    position: relative;
    height: 300px;
    width: 100%;
}
</style>
