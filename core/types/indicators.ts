/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
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
