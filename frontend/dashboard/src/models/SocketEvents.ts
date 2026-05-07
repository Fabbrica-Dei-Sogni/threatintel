/**
 * Definizione centralizzata di tutti i canali/eventi Socket.io.
 * Utilizzare questo enum sia su Backend che su Frontend per garantire coerenza.
 */
export enum SocketEvents {
    // Eventi di Intelligence (Real-time data)
    INTEL_NEW_LOG = 'intel:new_log',
    INTEL_ATTACK_DETECTED = 'intel:attack_detected',
    INTEL_CAMPAIGN_UPDATE = 'intel:campaign_update',
    INTEL_AI_RESPONSE = 'intel:ai_response',

    // Eventi di Sistema (Status & Jobs)
    SYSTEM_STATUS_UPDATE = 'system:status_update',
    SYSTEM_JOB_PROGRESS = 'system:job_progress',

    // Eventi di Debug & Utility
    PING_CHECK = 'ping:check',
    PONG_CHECK = 'pong:check'
}
