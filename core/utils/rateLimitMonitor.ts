/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */
import { container } from '../di/container';
import { RedisService } from '../services/RedisService';
import { REDIS_SERVICE_TOKEN } from '../di/tokens';

export default class RateLimitMonitor {
    private static getRedisService(): RedisService {
        return container.resolve<RedisService>(REDIS_SERVICE_TOKEN);
    }

    static async getStats(): Promise<any> {
        const redisService = this.getRedisService();
        if (!redisService.isReady()) {
            return { error: 'Redis not available' };
        }

        const client = redisService.getClient()!;
        try {
            const stats: any = {
                timestamp: new Date().toISOString(),
                blacklistedIPs: (await client.scard('blacklisted-ips')) || 0,
                activeRateLimits: 0,
                violationStats: {}
            };

            // Conta chiavi attive di rate limiting
            const keys: string[] = await client.keys('*');
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
        const redisService = this.getRedisService();
        if (!redisService.isReady()) return false;

        const client = redisService.getClient()!;
        try {
            await client.del('blacklisted-ips');
            const blacklistKeys: string[] = await client.keys('blacklist:*');
            if (blacklistKeys.length > 0) {
                await client.del(...blacklistKeys);
            }
            return true;
        } catch (error) {
            console.error('Error clearing blacklist:', error);
            return false;
        }
    }
}
