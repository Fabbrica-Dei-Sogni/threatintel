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
    TimeScale
} from 'chart.js';
import { Line } from 'vue-chartjs';
import 'chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm';
import { useI18n } from 'vue-i18n';
import dayjs from 'dayjs';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    TimeScale,
    Title,
    Tooltip,
    Legend
);

const { t } = useI18n();

const props = defineProps({
    nodes: { type: Array, required: true },
    campaignRange: { type: Object, required: true },
    selectedIps: { type: Array, default: () => [] }
});

const chartData = computed(() => {
    // Filtriamo se ci sono IP selezionati, altrimenti mostriamo tutti
    const filteredNodes = props.selectedIps.length > 0 
        ? props.nodes.filter(n => props.selectedIps.includes(n.ip))
        : props.nodes;

    const sortedNodes = [...filteredNodes].sort((a, b) => new Date(a.firstSeen) - new Date(b.firstSeen));
    
    // Funzione per trovare intersezioni
    const getIntersections = (currentNode) => {
        return sortedNodes
            .filter(other => other.ip !== currentNode.ip)
            .filter(other => {
                const startA = dayjs(currentNode.firstSeen).valueOf();
                const endA = dayjs(currentNode.lastSeen).valueOf();
                const startB = dayjs(other.firstSeen).valueOf();
                const endB = dayjs(other.lastSeen).valueOf();
                return Math.max(startA, startB) < Math.min(endA, endB);
            })
            .map(other => other.ip);
    };

    const datasets = sortedNodes.map((node) => {
        const concurrentIps = getIntersections(node);
        const hasIntersections = concurrentIps.length > 0;
        const color = getScoreColor(node.averageScore);
        
        return {
            label: node.ip,
            data: [
                { x: dayjs(node.firstSeen).valueOf(), y: node.ip },
                { x: dayjs(node.lastSeen).valueOf(), y: node.ip }
            ],
            borderColor: color,
            borderWidth: hasIntersections ? 7 : 4,
            pointRadius: hasIntersections ? 8 : 6,
            pointHoverRadius: 12,
            pointBackgroundColor: color,
            pointBorderColor: hasIntersections ? '#fff' : 'transparent',
            pointBorderWidth: hasIntersections ? 2 : 0,
            segment: {
                borderColor: color,
                borderWidth: hasIntersections ? 8 : 5,
                borderCapStyle: 'round',
                // Se c'è intersezione, usiamo una linea più spessa e marcata
                borderDash: hasIntersections ? [] : [5, 5] // Tratteggio opzionale se vuoi distinguere i "solitari"
            },
            nodeData: {
                ...node,
                concurrentIps
            },
            fill: false,
            showLine: true
        };
    });

    return {
        labels: sortedNodes.map(n => n.ip),
        datasets
    };
});

function getScoreColor(score, alpha = 1) {
    if (score >= 80) return `rgba(255, 77, 77, ${alpha})`;
    if (score >= 50) return `rgba(255, 204, 0, ${alpha})`;
    return `rgba(0, 255, 65, ${alpha})`;
}

const chartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    interaction: {
        mode: 'nearest',
        axis: 'xy',
        intersect: false,
    },
    plugins: {
        legend: { display: false },
        tooltip: {
            backgroundColor: 'rgba(20, 20, 20, 0.95)',
            borderColor: '#00FF41',
            borderWidth: 1,
            padding: 12,
            titleFont: { family: 'JetBrains Mono', size: 13 },
            bodyFont: { family: 'JetBrains Mono', size: 12 },
            callbacks: {
                title: (items) => `NODE: ${items[0].dataset.label}`,
                label: (ctx) => {
                    const node = ctx.dataset.nodeData;
                    const lines = [
                        `LOGS: ${node.totaleLogs}`,
                        `SCORE: ${node.averageScore.toFixed(1)}`,
                        `DURATA: ${dayjs(node.lastSeen).diff(dayjs(node.firstSeen), 'minute')} min`
                    ];
                    
                    if (node.concurrentIps && node.concurrentIps.length > 0) {
                        lines.push('');
                        lines.push(`⚠️ ATTIVITÀ CONTEMPORANEA CON:`);
                        node.concurrentIps.forEach(ip => {
                            lines.push(`  - ${ip}`);
                        });
                    }
                    return lines;
                }
            }
        }
    },
    scales: {
        x: {
            type: 'time',
            time: {
                // Rimosso unit: 'minute' per permettere la scala automatica (giorni/ore/mesi)
                displayFormats: {
                    minute: 'HH:mm',
                    hour: 'HH:mm',
                    day: 'MMM DD',
                    month: 'MMM YYYY'
                }
            },
            min: dayjs(props.campaignRange.firstSeen).valueOf(),
            max: dayjs(props.campaignRange.lastSeen).valueOf(),
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#888', font: { size: 10 } }
        },
        y: {
            type: 'category',
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { 
                color: '#00FF41', 
                font: { family: 'JetBrains Mono', size: 10 } 
            }
        }
    }
}));
</script>

<template>
    <div class="campaign-chart-card">
        <div class="chart-header">
            <span class="cyber-icon">📊</span>
            <h4>{{ t('campaignDetail.timelineAnalysis').toUpperCase() }}</h4>
        </div>
        <div class="chart-container">
            <Line :data="chartData" :options="chartOptions" />
        </div>
    </div>
</template>

<style scoped>
.campaign-chart-card {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(0, 255, 65, 0.1);
    border-radius: 4px;
    padding: 15px;
    margin-bottom: 20px;
}
.chart-header { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
.chart-header h4 { margin: 0; font-size: 0.8rem; letter-spacing: 2px; color: #00FF41; }
.chart-container { height: 300px; position: relative; }
</style>
