/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */

import { redisClient } from '../rateLimitMiddleware';

export default class RateLimitMonitor {
    static async getStats(): Promise<any> {
        if (!redisClient) {
            return { error: 'Redis not available' };
        }

        try {
            const stats: any = {
                timestamp: new Date().toISOString(),
                blacklistedIPs: (await redisClient.scard('blacklisted-ips')) || 0,
                activeRateLimits: 0,
                violationStats: {}
            };

            // Conta chiavi attive di rate limiting
            const keys: string[] = await redisClient.keys('*');
            stats.activeRateLimits = keys.filter(k =>
                k.startsWith('ddos:') ||
                k.startsWith('critical:') ||
                k.startsWith('trap:') ||
                k.startsWith('app:')
            ).length;

            return stats;
        } catch (error: any) {
            return { error: error.message };
        }
    }

    static async clearBlacklist(): Promise<boolean> {
        if (!redisClient) return false;

        try {
            await redisClient.del('blacklisted-ips');
            const blacklistKeys: string[] = await redisClient.keys('blacklist:*');
            if (blacklistKeys.length > 0) {
                await redisClient.del(...blacklistKeys);
            }
            return true;
        } catch (error) {
            console.error('Error clearing blacklist:', error);
            return false;
        }
    }
}
