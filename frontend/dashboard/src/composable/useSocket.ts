import { onMounted, onUnmounted } from 'vue';
import { useSocketStore } from '../stores/socket';
import { useDashboardStore } from '../stores/dashboard';
import { useAttacksStore } from '../stores/attacks';
import { useJobStore } from '../stores/jobs';
import { ElNotification } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { SocketEvents } from '../models/SocketEvents';
import { useNewsStore } from '../stores/news';
import { translateFromIt } from '../utils/translator';

/**
 * useSocket - Composable per gestire gli eventi real-time globali.
 * Centralizza la logica di reazione ai messaggi del server.
 */
export function useSocket() {
    const socketStore = useSocketStore();
    const dashboardStore = useDashboardStore();
    //const attacksStore = useAttacksStore();
    const jobStore = useJobStore();
    const newsStore = useNewsStore();
    const { t, locale } = useI18n();

    const setupListeners = () => {
        if (!socketStore.socket) return;

        // A. Tactical Engine & Job Progress
        socketStore.socket.on(SocketEvents.SYSTEM_STATUS_UPDATE, (status: string) => {
            if (dashboardStore.state) {
                dashboardStore.state.engineStatus = status;
            }
        });

        socketStore.socket.on(SocketEvents.SYSTEM_JOB_PROGRESS, (data: any) => {
            // Aggiorna lo store dei job per il monitoraggio in tempo reale
            jobStore.updateJobStatus(data.id, {
                status: data.status,
                progress: data.progress,
                error: data.error,
                type: data.jobName
            });

            // Sincronizza anche con lo stato del dashboard se necessario
            if (dashboardStore.updateJobStatus) {
                dashboardStore.updateJobStatus(data);
            }

            // Notifica se un job è completato
            if (data.status === 'completed') {
                dashboardStore.state.lastSystemUpdate = Date.now();
                ElNotification({
                    title: t('maintenance.job_completed') || 'Job Completed',
                    message: `${data.jobName || 'Task'} ${t('maintenance.completed_successfully')}`,
                    type: 'success',
                    position: 'bottom-right',
                    duration: 5000
                });
            } else if (data.status === 'failed') {
                ElNotification({
                    title: t('maintenance.job_failed') || 'Job Failed',
                    message: `${data.jobName || 'Task'}: ${data.error || 'Unknown error'}`,
                    type: 'error',
                    position: 'bottom-right'
                });
            }
        });

        socketStore.socket.on(SocketEvents.INTEL_NEW_LOG, (log: any) => {
            if (dashboardStore.state.recentLogs) {
                const exists = dashboardStore.state.recentLogs.some((l: any) => l._id === log._id || l.id === log.id);
                if (!exists) {
                    dashboardStore.state.recentLogs.unshift(log);
                    if (dashboardStore.state.recentLogs.length > 20) {
                        dashboardStore.state.recentLogs.pop();
                    }
                }
            }
        });

        // C. Agentic News Stream
        socketStore.socket.on(SocketEvents.INTEL_AI_RESPONSE, async (data: any) => {
            if (data.answer) {
                try {
                    // Traducono la risposta AI nella lingua corrente del frontend
                    const translatedText = await translateFromIt(data.answer, locale.value);

                    newsStore.addHeadline({
                        text: translatedText,
                        icon: '🤖',
                        isLive: true
                    });
                } catch (err) {
                    console.error('[Socket] Translation failed for AI response:', err);
                }
            }
        });

        // B. Live Intel Stream
        //solo a scopo dimostrativo per poter gestire notifiche custom
        /*socketStore.socket.on(SocketEvents.INTEL_ATTACK_DETECTED, (attack: any) => {
            // Aggiungi alla lista dei recenti nella dashboard (se siamo in Home)
            if (dashboardStore.state.recentAttacks) {
                // Evitiamo duplicati se il polling è attivo
                const exists = dashboardStore.state.recentAttacks.some((a: any) => a._id === attack._id || a.id === attack.id);
                if (!exists) {
                    dashboardStore.state.recentAttacks.unshift(attack);
                    // Manteniamo la lista a una dimensione ragionevole
                    if (dashboardStore.state.recentAttacks.length > 20) {
                        dashboardStore.state.recentAttacks.pop();
                    }
                }
            }

            // Opzionale: Mini notifica per attacchi critici
            if (attack.dangerScore >= 80) {
                ElNotification({
                    title: 'CRITICAL THREAT',
                    message: `High risk attack detected from ${attack.request?.ip || 'unknown'}`,
                    type: 'warning',
                    position: 'top-right',
                    duration: 3000
                });
            }
        });*/
    };

    onMounted(() => {
        socketStore.connect();
        setupListeners();
    });

    // Nota: Non disconnettiamo obbligatoriamente onUnmounted perché vogliamo 
    // che la connessione persista tra le pagine per le notifiche globali.
    // La disconnessione avverrà alla chiusura del tab/browser.

    return {
        connected: socketStore.connected
    };
}
