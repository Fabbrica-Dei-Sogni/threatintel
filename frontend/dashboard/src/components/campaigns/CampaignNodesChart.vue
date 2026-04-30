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

const emit = defineEmits(['toggle-ip', 'investigate-ips', 'apply-ips', 'update:showHub']);

const props = defineProps({
    nodes: { type: Array, required: true },
    campaignRange: { type: Object, required: true },
    selectedIps: { type: Array, default: () => [] },
    correlationHubs: { type: Array, default: () => [] },
    showHub: { type: Boolean, default: false }
});

const sortedAllNodes = computed(() => {
    // Ordine naturale della lista: Chart.js mette l'indice 0 in cima all'asse Y
    return [...props.nodes];
});

const filteredNodes = computed(() => {
    return props.selectedIps.length > 0 
        ? props.nodes.filter(n => props.selectedIps.includes(n.ip))
        : props.nodes;
});

const visibleRange = computed(() => {
    if (filteredNodes.value.length === 0) {
        return {
            min: dayjs(props.campaignRange.firstSeen).valueOf(),
            max: dayjs(props.campaignRange.lastSeen).valueOf()
        };
    }

    const minTs = Math.min(...filteredNodes.value.map(n => dayjs(n.firstSeen).valueOf()));
    const maxTs = Math.max(...filteredNodes.value.map(n => dayjs(n.lastSeen).valueOf()));
    
    // Aggiungiamo un buffer del 5% per non far toccare i bordi ai punti
    const diff = maxTs - minTs;
    const buffer = diff > 0 ? diff * 0.05 : 1000 * 60 * 5; // 5 min se durata zero
    
    return {
        min: minTs - buffer,
        max: maxTs + buffer
    };
});

const chartData = computed(() => {
    const sortedTimesForNode = (node) => {
        // 1. Usiamo gli hub del backend per trovare le intersezioni di questo nodo
        // Consideriamo un'intersezione valida se coinvolge il nodo corrente e almeno un altro nodo
        // che fa parte della selezione attiva (o di tutti se nulla è selezionato).
        const intersections = props.correlationHubs
            .filter(hub => hub.ips.includes(node.ip))
            .map(hub => {
                const othersInSelection = hub.ips.filter(ip => 
                    ip !== node.ip && 
                    (props.selectedIps.length === 0 || props.selectedIps.includes(ip))
                );
                return othersInSelection.length > 0 ? { start: hub.start, end: hub.end } : null;
            })
            .filter(i => i !== null);

        // 2. Colleziona i punti temporali critici
        const timePoints = new Set();
        timePoints.add(dayjs(node.firstSeen).valueOf());
        timePoints.add(dayjs(node.lastSeen).valueOf());
        intersections.forEach(i => {
            timePoints.add(i.start);
            timePoints.add(i.end);
        });
        
        return {
            sortedTimes: Array.from(timePoints).sort((a, b) => a - b),
            intersections
        };
    };

    const datasets = sortedAllNodes.value.map((node) => {
        const isSelected = props.selectedIps.length === 0 || props.selectedIps.includes(node.ip);
        const { sortedTimes, intersections } = sortedTimesForNode(node);
        const hasAnyIntersection = intersections.length > 0;
        
        const alpha = isSelected ? 1 : 0.15;
        const baseColor = getScoreColor(node.averageScore, alpha);
        const intersectColor = `rgba(124, 77, 255, ${alpha})`; 

        // Funzione helper per capire se un segmento [t1, t2] è un'intersezione
        const isIntersecting = (t1, t2) => {
            const mid = (t1 + t2) / 2;
            return intersections.some(i => mid >= i.start && mid <= i.end);
        };

        return {
            label: node.ip,
            // Per ogni punto, calcoliamo esattamente chi altro era attivo in quel momento
            data: sortedTimes.map(t => {
                // Troviamo gli IP contemporanei usando i dati del backend
                const othersSet = new Set();
                props.correlationHubs
                    .filter(hub => t >= hub.start && t <= hub.end && hub.ips.includes(node.ip))
                    .forEach(hub => {
                        hub.ips.forEach(ip => {
                            if (ip !== node.ip && (props.selectedIps.length === 0 || props.selectedIps.includes(ip))) {
                                othersSet.add(ip);
                            }
                        });
                    });
                
                return { x: t, y: node.ip, activeOthers: Array.from(othersSet) };
            }),
            borderColor: baseColor,
            borderWidth: isSelected ? 3 : 1.5,
            pointRadius: (ctx) => {
                const idx = ctx.dataIndex;
                if (idx === 0 || idx === sortedTimes.length - 1) {
                    return isSelected ? (hasAnyIntersection ? 6 : 5) : 2;
                }
                return 0;
            },
            pointHoverRadius: 10,
            pointBackgroundColor: baseColor,
            pointBorderColor: isSelected && hasAnyIntersection ? '#fff' : 'transparent',
            pointBorderWidth: isSelected && hasAnyIntersection ? 1.5 : 0,
            segment: {
                borderColor: (ctx) => {
                    const t1 = ctx.p0.parsed.x;
                    const t2 = ctx.p1.parsed.x;
                    return isIntersecting(t1, t2) ? intersectColor : baseColor;
                },
                borderWidth: (ctx) => {
                    const t1 = ctx.p0.parsed.x;
                    const t2 = ctx.p1.parsed.x;
                    if (isIntersecting(t1, t2)) return isSelected ? 5 : 3;
                    return isSelected ? 3 : 1.5;
                },
                borderCapStyle: 'round',
                borderDash: (ctx) => {
                    const t1 = ctx.p0.parsed.x;
                    const t2 = ctx.p1.parsed.x;
                    if (isIntersecting(t1, t2)) return [];
                    return isSelected ? [5, 5] : [2, 2];
                }
            },
            nodeData: node,
            fill: false,
            showLine: true
        };
    });

    return {
        labels: sortedAllNodes.value.map(n => n.ip),
        datasets
    };
});


function getScoreColor(score, alpha = 1) {
    if (score >= 80) return `rgba(255, 77, 77, ${alpha})`;
    if (score >= 50) return `rgba(255, 204, 0, ${alpha})`;
    return `rgba(0, 255, 65, ${alpha})`;
}

const chartOptions = computed(() => {
    // Stato locale per gestire il "dismiss" temporaneo del tooltip
    let dismissedDatasetIndex = -1;

    return {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        onClick: (event, elements, chart) => {
            if (elements.length > 0) {
                // Al click su un elemento, lo marchiamo come "da nascondere"
                dismissedDatasetIndex = elements[0].datasetIndex;
                if (chart.tooltip) {
                    chart.tooltip.opacity = 0;
                    chart.setActiveElements([]);
                    chart.update();
                }
            } else {
                dismissedDatasetIndex = -1;
            }
        },
        onHover: (event, elements, chart) => {
            if (elements.length === 0) {
                // Se usciamo dagli elementi, resettiamo il dismiss
                dismissedDatasetIndex = -1;
            } else if (elements[0].datasetIndex !== dismissedDatasetIndex) {
                // Se passiamo su un ALTRO elemento, resettiamo il dismiss
                dismissedDatasetIndex = -1;
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'xy',
            intersect: true, // Più ergonomico: appare solo se ci sei sopra
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: (ctx) => {
                    // Disabilita il tooltip se l'elemento è quello appena cliccato
                    const active = ctx.chart.getActiveElements();
                    if (active.length > 0 && active[0].datasetIndex === dismissedDatasetIndex) {
                        return false;
                    }
                    return true;
                },
                backgroundColor: 'rgba(20, 20, 20, 0.95)',
                borderColor: '#00FF41',
                borderWidth: 1,
                padding: 12,
                titleFont: { family: 'JetBrains Mono', size: 13 },
                bodyFont: { family: 'JetBrains Mono', size: 12 },
                callbacks: {
                    title: (items) => `NODE: ${items[0].dataset.label}`,
                    label: (ctx) => {
                        const point = ctx.raw;
                        const node = ctx.dataset.nodeData;
                        const lines = [
                            `LOGS: ${node.totaleLogs}`,
                            `SCORE: ${node.averageScore.toFixed(1)}`,
                            `DURATA: ${dayjs(node.lastSeen).diff(dayjs(node.firstSeen), 'minute')} min`
                        ];

                        if (point.activeOthers && point.activeOthers.length > 0) {
                            lines.push('');
                            lines.push(`⚠️ ATTIVITÀ CONTEMPORANEA con:`);
                            point.activeOthers.forEach(ip => {
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
                    displayFormats: {
                        minute: 'HH:mm',
                        hour: 'HH:mm',
                        day: 'MMM DD',
                        month: 'MMM YYYY'
                    }
                },
                min: visibleRange.value.min,
                max: visibleRange.value.max,
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#888', font: { size: 10 } }
            },
            y: {
                type: 'category',
                reverse: false, // Disattiviamo il reverse automatico per usare quello manuale delle labels
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: {
                    color: '#00FF41',
                    font: { family: 'JetBrains Mono', size: 10 }
                }
            }
        },
        elements: {
            point: {
                hitRadius: 15, // Aumenta l'area cliccabile per facilità d'uso
                hoverRadius: 10
            },
            line: {
                hitRadius: 10
            }
        }
    };
});
</script>

<template>
    <div class="campaign-chart-card">
        <div class="chart-header">
            <div class="header-left">
                <span class="cyber-icon">📊</span>
                <h4>{{ t('campaignDetail.timelineAnalysis').toUpperCase() }}</h4>
            </div>
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

.chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 10px;
}

.chart-header h4 {
    margin: 0;
    font-size: 0.8rem;
    letter-spacing: 2px;
    color: #00FF41;
}

.chart-container {
    height: 300px;
    position: relative;
}
</style>
