<!--
  ThreatIntel - Reference Implementation Dashboard
  
  This frontend application is provided as a reference implementation of the 
  ThreatIntel Distributed Forensics Engine. 
  
  Copyright (C) 2026 Alessandro Modica. All rights reserved.
  
  Use of this frontend for educational, research, and non-commercial purposes 
  is permitted. Production or commercial use of this specific dashboard 
  interface requires a valid commercial license from the author.
  
  See root LICENSE.md for core engine licensing details.
-->
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
                borderColor: '#FFB300',            // Amber
                backgroundColor: 'rgba(255, 179, 0, 0.2)', // Semi-transparent amber
                pointBackgroundColor: '#FFD700',   // Gold
                pointBorderColor: '#0A0605',       // Obsidian
                pointHoverBackgroundColor: '#FFFFFF',
                pointHoverBorderColor: '#FFD700',
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
            backgroundColor: 'rgba(26, 20, 10, 0.95)',
            titleColor: '#FFB300',
            bodyColor: '#F4EBD0',
            borderColor: '#FFB300',
            borderWidth: 1,
            callbacks: {
                label: (context) => `Requests: ${context.parsed.y}`
            }
        },
        title: {
            display: false,
            text: t('threatLogs.trafficOverTime') || 'Network Traffic Over Time',
            color: '#FFB300'
        }
    },
    scales: {
        x: {
            grid: {
                color: 'rgba(255, 179, 0, 0.1)',
                display: true
            },
            ticks: {
                color: '#BBA685',
                maxTicksLimit: 10
            }
        },
        y: {
            grid: {
                color: 'rgba(255, 179, 0, 0.1)',
                display: true
            },
            ticks: {
                color: '#BBA685',
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
    max-width: 100%;          /* Prevent escape from parent */
    box-sizing: border-box;   /* Include padding in width calc */
    overflow: hidden;         /* Hard clamp */
    margin-bottom: 20px;
    background: rgba(26, 20, 10, 0.4);
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 179, 0, 0.15);
}

h3 {
    color: #FFB300;
    margin: 0 0 15px 0;
}

.chart-wrapper {
    position: relative;
    height: 300px;
    width: 100%;
    overflow: hidden;         /* Canvas boundary */
}
</style>
