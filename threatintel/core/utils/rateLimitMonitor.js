const { redisClient } = require('../middleware/rateLimitMiddleware');

class RateLimitMonitor {
    static async getStats() {
        if (!redisClient) {
            return { error: 'Redis not available' };
        }

        try {
            const stats = {
                timestamp: new Date().toISOString(),
                blacklistedIPs: await redisClient.scard('blacklisted-ips') || 0,
                activeRateLimits: 0,
                violationStats: {}
            };

            // Conta chiavi attive di rate limiting
            const keys = await redisClient.keys('*');
            stats.activeRateLimits = keys.filter(k =>
                k.startsWith('ddos:') ||
                k.startsWith('critical:') ||
                k.startsWith('trap:') ||
                k.startsWith('app:')
            ).length;

            return stats;
        } catch (error) {
            return { error: error.message };
        }
    }

    static async clearBlacklist() {
        if (!redisClient) return false;

        try {
            await redisClient.del('blacklisted-ips');
            const blacklistKeys = await redisClient.keys('blacklist:*');
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

module.exports = RateLimitMonitor;
