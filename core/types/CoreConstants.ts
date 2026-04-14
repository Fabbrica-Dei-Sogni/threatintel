/**
 * CoreConstants.ts
 * Centralized constants, enums and types for the ThreatIntel core.
 */

export enum ProtocolType {
    SSH = 'ssh',
    HTTPS = 'https',
    HTTP = 'http',
    COWRIE = 'cowrie'
}

export enum ThreatIndicator {
    URL_PATTERN = 'URL_PATTERN',
    BODY_PATTERN = 'BODY_PATTERN',
    QUERY_PATTERN = 'QUERY_PATTERN',
    BOT_USER_AGENT = 'BOT_USER_AGENT',
    MISSING_USER_AGENT = 'MISSING_USER_AGENT',
    SUSPICIOUS_REFERER = 'SUSPICIOUS_REFERER',
    SSH_FAILED_PASSWORD = 'SSH_FAILED_PASSWORD',
    SSH_INVALID_USER = 'SSH_INVALID_USER',
    COWRIE_COMMAND = 'COWRIE_COMMAND',
    JNDI_PAYLOAD = 'JNDI_PAYLOAD',
    ALT_PORT = 'ALT_PORT',
    SHORT_USER_AGENT = 'SHORT_USER_AGENT',
    UNCOMMON_METHOD = 'UNCOMMON_METHOD'
}

export enum LogHeaderKey {
    SSH_EVENT = 'ssh-event',
    SSH_USER = 'ssh-user',
    RAW_LOG = 'raw-log',
    X_SOURCE = 'x-source',
    X_SERVER_PORT = 'x-server-port'
}

export enum ConfigKey {
    SUSPICIOUS_PATTERNS = 'SUSPICIOUS_PATTERNS',
    BOT_PATTERNS = 'BOT_PATTERNS',
    SUSPICIOUS_REFERERS = 'SUSPICIOUS_REFERERS',
    SUSPICIOUS_SCORES = 'SUSPICIOUS_SCORES',
    DANGER_WEIGHT = 'DANGER_WEIGHT',
    TOLLERANCE_WEIGHTS = 'TOLLERANCE_WEIGHTS',
    SSH_FAILED_PASSWORD = 'SSH_FAILED_PASSWORD',
    SSH_INVALID_USER = 'SSH_INVALID_USER'
}

export default {
    ProtocolType,
    ThreatIndicator,
    LogHeaderKey,
    ConfigKey
};
