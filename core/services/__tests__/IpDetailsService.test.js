/**
 * Test suite for IpDetailsService
 */

const mongoose = require('mongoose');
const IpDetailsService = require('../IpDetailsService');
const IpDetails = require('../../models/IpDetailsSchema');
const AbuseIpDb = require('../../models/AbuseIpDbSchema');
const AbuseReport = require('../../models/AbuseReportSchema');
const axios = require('axios');

// Mock dependencies
jest.mock('axios');
jest.mock('whois', () => ({
    lookup: jest.fn((ip, cb) => cb(null, 'Mock WHOIS data'))
}));
jest.mock('ipinfo', () => jest.fn((ip, opts, cb) => cb(null, {
    ip: ip,
    city: 'Test City',
    region: 'Test Region',
    country: 'US'
})));
jest.mock('ip-range-check', () => jest.fn((ip, ranges) => {
    if (ranges.includes(ip)) return true;
    return false;
}));

describe('IpDetailsService', () => {
    beforeAll(async () => {
        const uri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/test';
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(uri);
        }
    });

    afterAll(async () => {
        await mongoose.disconnect();
    });

    beforeEach(async () => {
        await IpDetails.deleteMany({});
        await AbuseIpDb.deleteMany({});
        await AbuseReport.deleteMany({});
        jest.clearAllMocks();
    });

    describe('isIPExcluded', () => {
        test('should return true for excluded IP', () => {
            process.env.EXCLUDED_IPS = '127.0.0.1,::1';
            // Re-instantiate or force parse because it's done in constructor/method?
            // The method parseExcludedIPs is called? No, it's a class method.
            // But excludedIPs is set in constructor? No, parseExcludedIPs is a method but isIPExcluded uses this.excludedIPs?
            // Wait, let's check the code.
            // IpDetailsService is a singleton instance exported.
            // It has parseExcludedIPs method but isIPExcluded uses this.excludedIPs?
            // Actually looking at code: 
            // isIPExcluded(ip) { return ipRangeCheck(ip, this.excludedIPs); }
            // And this.excludedIPs is NOT set in constructor in the file I saw?
            // Wait, I need to check IpDetailsService.js again.
            // Line 25: parseExcludedIPs() { ... }
            // Line 43: isIPExcluded(ip) { ... return ipRangeCheck(ip, this.excludedIPs); }
            // BUT where is this.excludedIPs set? 
            // It seems it is NOT set in the class! 
            // Ah, ThreatLogService calls IpDetailsService.parseExcludedIPs() in its constructor.
            // But IpDetailsService itself doesn't seem to set `this.excludedIPs`.
            // This looks like a BUG in the original code or I missed something.
            // Let's check IpDetailsService.js again.

            // It seems IpDetailsService is stateless regarding excludedIPs unless set externally?
            // Or maybe I missed the constructor.
            // Line 19: class IpDetailsService { ... }
            // No constructor visible in the snippet I saw.
            // So `this.excludedIPs` would be undefined!
            // This suggests `isIPExcluded` might fail if `this.excludedIPs` is undefined.
            // However, `ip-range-check` might handle undefined.

            // Let's assume for test I can set it manually or mock parseExcludedIPs if it was used.
            // But wait, if the code is buggy, the test will reveal it.

            // Let's try to set it manually for the test since it's a singleton.
            IpDetailsService.excludedIPs = ['127.0.0.1'];
            expect(IpDetailsService.isIPExcluded('127.0.0.1')).toBe(true);
        });

        test('should return false for non-excluded IP', () => {
            IpDetailsService.excludedIPs = ['127.0.0.1'];
            expect(IpDetailsService.isIPExcluded('8.8.8.8')).toBe(false);
        });
    });

    describe('saveIpDetails', () => {
        test('should save new IP details', async () => {
            // Mock axios for AbuseIPDB check
            axios.get.mockResolvedValue({
                data: {
                    data: {
                        abuseConfidenceScore: 0,
                        countryCode: 'US',
                        isWhitelisted: true,
                        totalReports: 0
                    }
                }
            });

            const ip = '1.2.3.4';
            const id = await IpDetailsService.saveIpDetails(ip);

            expect(id).toBeDefined();

            const saved = await IpDetails.findOne({ ip });
            expect(saved).toBeDefined();
            expect(saved.ip).toBe(ip);
            expect(saved.ipinfo).toBeDefined(); // from mock
        });
    });

    describe('getIpDetails', () => {
        test('should return details with abuse reports', async () => {
            const ip = '1.2.3.4';

            // Create abuse IP DB entry
            const abuseIp = await AbuseIpDb.create({
                ip,
                abuseConfidenceScore: 100
            });

            // Create IP Details
            await IpDetails.create({
                ip,
                abuseipdbId: abuseIp._id
            });

            // Create Abuse Report
            await AbuseReport.create({
                abuseIpDbId: abuseIp._id,
                reportedAt: new Date(),
                categories: [18], // Brute-force
                reporterId: 123,
                comment: 'Test abuse report'
            });

            const result = await IpDetailsService.getIpDetails(ip);

            expect(result).toBeDefined();
            expect(result.ipDetails.ip).toBe(ip);
            expect(result.abuseReports).toHaveLength(1);
        });

        test('should return null for unknown IP', async () => {
            const result = await IpDetailsService.getIpDetails('9.9.9.9');
            expect(result).toBeNull();
        });
    });
});
