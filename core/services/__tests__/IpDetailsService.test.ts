/**
 * Test suite for IpDetailsService (TypeScript)
 */

import mongoose from 'mongoose';
import IpDetailsService from '../IpDetailsService';
import IpDetails from '../../models/IpDetailsSchema';
import AbuseIpDb from '../../models/AbuseIpDbSchema';
import AbuseReport from '../../models/AbuseReportSchema';
import axios from 'axios';

// Mock dependencies
jest.mock('axios');
jest.mock('whois', () => ({
    lookup: jest.fn((ip: any, cb: any) => cb(null, 'Mock WHOIS data')),
}));
jest.mock('ipinfo', () => jest.fn((ip: any, opts: any, cb: any) => cb(null, {
    ip: ip,
    city: 'Test City',
    region: 'Test Region',
    country: 'US'
})));
jest.mock('ip-range-check', () => jest.fn((ip: string, ranges: string[]) => {
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
            // Manually set excluded IPs on the singleton for test purposes
            (IpDetailsService as any).excludedIPs = ['127.0.0.1'];
            expect(IpDetailsService.isIPExcluded('127.0.0.1')).toBe(true);
        });

        test('should return false for non-excluded IP', () => {
            (IpDetailsService as any).excludedIPs = ['127.0.0.1'];
            expect(IpDetailsService.isIPExcluded('8.8.8.8')).toBe(false);
        });
    });

    describe('saveIpDetails', () => {
        test('should save new IP details', async () => {
            // Mock axios for AbuseIPDB check
            (axios.get as jest.Mock).mockResolvedValue({
                data: {
                    data: {
                        abuseConfidenceScore: 0,
                        countryCode: 'US',
                        isWhitelisted: true,
                        totalReports: 0,
                    },
                },
            });

            const ip = '1.2.3.4';
            const id = await IpDetailsService.saveIpDetails(ip);

            expect(id).toBeDefined();

            const saved = await IpDetails.findOne({ ip });
            expect(saved).toBeDefined();
            expect(saved?.ip).toBe(ip);
            // ipinfo is added by the mocked ipinfo module
            expect(saved?.ipinfo).toBeDefined();
        });
    });

    describe('getIpDetails', () => {
        test('should return details with abuse reports', async () => {
            const ip = '1.2.3.4';

            // Create Abuse IP DB entry
            const abuseIp = await AbuseIpDb.create({
                ip,
                abuseConfidenceScore: 100,
            });

            // Create IP Details linked to AbuseIpDb
            await IpDetails.create({
                ip,
                abuseipdbId: abuseIp._id,
            });

            // Create Abuse Report linked to AbuseIpDb
            await AbuseReport.create({
                abuseIpDbId: abuseIp._id,
                reportedAt: new Date(),
                categories: [18], // Brute-force
                reporterId: 123,
                comment: 'Test abuse report',
            });

            const result = await IpDetailsService.getIpDetails(ip);

            expect(result).toBeDefined();
            expect(result?.ipDetails.ip).toBe(ip);
            expect(result?.abuseReports).toHaveLength(1);
        });

        test('should return null for unknown IP', async () => {
            const result = await IpDetailsService.getIpDetails('9.9.9.9');
            expect(result).toBeNull();
        });
    });
});
