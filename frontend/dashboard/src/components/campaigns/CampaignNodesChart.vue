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
        // 1. Trova le finestre di intersezione basandosi sui nodi filtrati (selezionati)
        // Se l'utente ha selezionato degli IP, calcoliamo le intersezioni SOLO tra quelli
        const intersections = filteredNodes.value
            .filter(other => other.ip !== node.ip)
            .map(other => {
                const start = Math.max(dayjs(node.firstSeen).valueOf(), dayjs(other.firstSeen).valueOf());
                const end = Math.min(dayjs(node.lastSeen).valueOf(), dayjs(other.lastSeen).valueOf());
                return start < end ? { start, end } : null;
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
                const activeOthers = filteredNodes.value
                    .filter(other => other.ip !== node.ip)
                    .filter(other => {
                        const start = dayjs(other.firstSeen).valueOf();
                        const end = dayjs(other.lastSeen).valueOf();
                        return t >= start && t <= end;
                    })
                    .map(other => other.ip);
                
                return { x: t, y: node.ip, activeOthers };
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

// Calcoliamo le finestre di correlazione globali per l'elenco sotto il grafico
const correlationHub = computed(() => {
    // Usiamo TUTTI i nodi della campagna per mostrare ogni possibile coordinazione nell'elenco
    if (props.nodes.length < 2) return [];

    // 1. Tutti i timestamps rilevanti
    const ts = new Set();
    props.nodes.forEach(n => {
        ts.add(dayjs(n.firstSeen).valueOf());
        ts.add(dayjs(n.lastSeen).valueOf());
    });
    const sortedTs = Array.from(ts).sort((a, b) => a - b);

    // 2. Per ogni intervallo, vediamo chi è attivo
    const windows = [];
    for (let i = 0; i < sortedTs.length - 1; i++) {
        const start = sortedTs[i];
        const end = sortedTs[i+1];
        const mid = (start + end) / 2;

        const activeIps = props.nodes
            .filter(n => {
                const nStart = dayjs(n.firstSeen).valueOf();
                const nEnd = dayjs(n.lastSeen).valueOf();
                return mid >= nStart && mid <= nEnd;
            })
            .map(n => n.ip);

        if (activeIps.length > 1) {
            windows.push({ start, end, ips: activeIps });
        }
    }

    // 3. Uniamo le finestre consecutive con gli stessi IP
    if (windows.length === 0) return [];
    
    const merged = [windows[0]];
    for (let i = 1; i < windows.length; i++) {
        const last = merged[merged.length - 1];
        const current = windows[i];
        
        const sameIps = last.ips.length === current.ips.length && 
                       last.ips.every(ip => current.ips.includes(ip));

        if (sameIps) {
            last.end = current.end;
        } else {
            merged.push(current);
        }
    }

    return merged;
});


const isWindowFocused = (windowIps) => {
    if (props.selectedIps.length === 0) return false;
    return props.selectedIps.length === windowIps.length && 
           windowIps.every(ip => props.selectedIps.includes(ip));
};

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
            
            <button v-if="correlationHub.length > 0" 
                    class="btn-toggle-hub" 
                    :class="{ active: props.showHub }"
                    @click="emit('update:showHub', !props.showHub)">
                <span class="hub-btn-icon">{{ props.showHub ? '➖' : '🔍' }}</span>
                {{ t('campaignDetail.correlationHub').toUpperCase() }}
                <span class="hub-count-badge">{{ correlationHub.length }}</span>
            </button>
        </div>
        <div class="chart-container">
            <Line :data="chartData" :options="chartOptions" />
        </div>

        <!-- HUB DI CORRELAZIONE (A scomparsa) -->
        <transition name="slide-fade">
            <div v-if="props.showHub && correlationHub.length > 0" class="correlation-hub">
                <div class="hub-header-mini">
                    <span class="hub-icon">📡</span>
                    <h5>{{ t('campaignDetail.correlationHub').toUpperCase() }}</h5>
                </div>
                <div class="hub-list">
                    <div v-for="(window, idx) in correlationHub" :key="idx" class="hub-item">
                        <div class="item-main">
                            <div class="item-time">
                                <span class="time-range">{{ dayjs(window.start).format('HH:mm:ss') }} - {{
                                    dayjs(window.end).format('HH:mm:ss') }}</span>
                                <span class="duration">{{ dayjs(window.end).diff(dayjs(window.start), 'minute') }} min</span>
                            </div>
                            <div class="item-ips">
                                <span v-for="ip in window.ips" :key="ip" class="ip-tag">{{ ip }}</span>
                            </div>
                        </div>
                        <div class="hub-actions">
                            <button class="btn-hub-action btn-apply" 
                                :class="{ active: isWindowFocused(window.ips) }"
                                @click="emit('apply-ips', window.ips)"
                                :title="t('campaignDetail.toggleTarget')">
                                🎯
                            </button>
                            <button class="btn-hub-action btn-investigate" @click="emit('investigate-ips', window.ips)"
                                :title="t('campaignDetail.investigate')">
                                🚀
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </transition>
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

.btn-toggle-hub {
    background: rgba(124, 77, 255, 0.1);
    border: 1px solid rgba(124, 77, 255, 0.3);
    color: #7C4DFF;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 0.65rem;
    font-family: 'JetBrains Mono', monospace;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
    letter-spacing: 1px;
}

.btn-toggle-hub:hover {
    background: rgba(124, 77, 255, 0.2);
    border-color: #7C4DFF;
    box-shadow: 0 0 10px rgba(124, 77, 255, 0.3);
}

.btn-toggle-hub.active {
    background: #7C4DFF;
    color: #fff;
    border-color: #7C4DFF;
}

.hub-count-badge {
    background: rgba(0, 0, 0, 0.3);
    padding: 0 6px;
    border-radius: 10px;
    font-size: 0.6rem;
    font-weight: bold;
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.chart-container {
    height: 300px;
    position: relative;
    margin-bottom: 20px;
}

/* HUB DI CORRELAZIONE Styles */
.correlation-hub {
    border-top: 1px solid rgba(0, 255, 65, 0.1);
    padding-top: 15px;
    margin-top: 15px;
}

.hub-header-mini {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
}

.hub-header-mini h5 {
    margin: 0;
    font-size: 0.7rem;
    letter-spacing: 1px;
    color: #7C4DFF;
}

/* Transitions */
.slide-fade-enter-active {
    transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
    transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
    transform: translateY(-10px);
    opacity: 0;
}

.hub-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 200px;
    overflow-y: auto;
    padding-right: 5px;
}

/* Scrollbar personalizzata per l'hub */
.hub-list::-webkit-scrollbar {
    width: 4px;
}

.hub-list::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
}

.hub-list::-webkit-scrollbar-thumb {
    background: rgba(124, 77, 255, 0.3);
    border-radius: 2px;
}

.hub-item {
    background: rgba(124, 77, 255, 0.05);
    border-left: 2px solid #7C4DFF;
    padding: 8px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 0 4px 4px 0;
    transition: all 0.2s ease;
}

.hub-item:hover {
    background: rgba(124, 77, 255, 0.1);
    border-left-width: 4px;
}

.item-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex: 1;
    margin-right: 12px;
}

.hub-actions {
    display: flex;
    gap: 6px;
}

.btn-hub-action {
    background: rgba(124, 77, 255, 0.15);
    border: 1px solid rgba(124, 77, 255, 0.3);
    color: #fff;
    width: 28px;
    height: 28px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.8rem;
}

.btn-hub-action:hover {
    background: #7C4DFF;
    box-shadow: 0 0 12px rgba(124, 77, 255, 0.4);
    transform: translateY(-2px);
}

.btn-hub-action.btn-apply {
    background: rgba(0, 255, 65, 0.1);
    border-color: rgba(0, 255, 65, 0.2);
}

.btn-hub-action.btn-apply:hover {
    background: #00FF41;
    border-color: #00FF41;
    color: #000;
    box-shadow: 0 0 12px rgba(0, 255, 65, 0.4);
}

.btn-hub-action.btn-apply.active {
    background: #00FF41;
    border-color: #00FF41;
    color: #000;
    box-shadow: 0 0 15px rgba(0, 255, 65, 0.6);
}

.item-time {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.time-range {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8rem;
    color: #fff;
}

.duration {
    font-size: 0.65rem;
    color: #888;
}

.item-ips {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    justify-content: flex-end;
    max-width: 60%;
}

.ip-tag {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    background: rgba(255, 255, 255, 0.05);
    padding: 2px 6px;
    border-radius: 3px;
    color: #7C4DFF;
    border: 1px solid rgba(124, 77, 255, 0.2);
}
</style>
