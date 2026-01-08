
import 'reflect-metadata';
import mongoose from 'mongoose';
import { IpDetailsService } from '../IpDetailsService';
import IpDetails from '../../models/IpDetailsSchema';
import AbuseIpDb from '../../models/AbuseIpDbSchema';
import AbuseReport from '../../models/AbuseReportSchema';
import { Logger } from 'winston';

// Mock dependencies
const mockIpInfo = jest.fn();
jest.mock('ipinfo', () => (ip: any, opts: any, cb: any) => mockIpInfo(ip, opts, cb));

jest.mock('axios');
jest.mock('whois', () => ({
    lookup: jest.fn((ip: any, cb: any) => cb(null, 'Mock WHOIS data')),
}));
jest.mock('ip-range-check', () => jest.fn(() => false));

describe('IpDetailsService Rate Limit & Retry', () => {
    let ipDetailsService: IpDetailsService;
    let mockLogger: any;

    beforeAll(async () => {
        const uri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/test_ratelimit';
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
        mockIpInfo.mockClear();

        // Mock logger
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };

        // Create service instance manually with mocked logger
        ipDetailsService = new IpDetailsService(mockLogger as Logger);
    });

    test('should handle 429 Rate Limit error from ipinfo (err arg) by returning the error object', async () => {
        // Setup mock to return 429 error
        const error = {
            status: 429,
            error: {
                title: "Rate limit exceeded",
                message: "You've hit the daily limit..."
            }
        };

        mockIpInfo.mockImplementation((ip: any, opts: any, cb: any) => {
            cb(error, null);
        });

        const ip = '1.1.1.1';
        const data = await ipDetailsService.enrichIpData(ip);

        // Expectation changed: should return the error object, not null
        expect(data.ipinfo).toEqual(error);
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringMatching(/Salvo l'errore per riprovare in futuro/));
    });

    test('should handle 429 Rate Limit error from ipinfo (data arg) by returning the error object', async () => {
        // Setup mock to return 429 error in DATA
        const errorData = {
            status: 429,
            error: {
                title: "Rate limit exceeded",
                message: "You've hit the daily limit..."
            }
        };

        mockIpInfo.mockImplementation((ip: any, opts: any, cb: any) => {
            cb(null, errorData);
        });

        const ip = '1.1.1.2';
        const data = await ipDetailsService.enrichIpData(ip);

        // Expectation changed: should return the error object, not null
        expect(data.ipinfo).toEqual(errorData);
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringMatching(/Salvo l'errore per riprovare in futuro/));
    });

    test('should retry enrichment in findOrCreate if ipinfo contains Rate Limit error', async () => {
        const ip = '2.2.2.2';

        // 1. Create an entry with ERROR ipinfo (simulating previous rate limit saving error)
        const errorDetails = {
            status: 429,
            error: {
                title: "Rate limit exceeded"
            }
        };

        await IpDetails.create({
            ip,
            ipinfo: errorDetails,
            firstSeenAt: new Date(),
            lastSeenAt: new Date()
        });

        // 2. Setup mock to return valid data this time
        mockIpInfo.mockImplementation((ip: any, opts: any, cb: any) => {
            cb(null, {
                ip: ip,
                city: 'New City',
                country: 'NC'
            });
        });

        // 3. Call findOrCreate
        await ipDetailsService.findOrCreate(ip);

        // 4. Verify that ipinfo was updated
        const updated = await IpDetails.findOne({ ip });
        expect(updated).toBeDefined();
        // It should have replaced the error object with the valid data
        expect((updated?.ipinfo as any).city).toBe('New City');
    });

    test('should retry enrichment in findOrCreate if ipinfo is null (legacy support)', async () => {
        const ip = '4.4.4.4';

        // 1. Create an entry with NULL ipinfo 
        await IpDetails.create({
            ip,
            ipinfo: null,
            firstSeenAt: new Date(),
            lastSeenAt: new Date()
        });

        // 2. Setup mock to return valid data
        mockIpInfo.mockImplementation((ip: any, opts: any, cb: any) => {
            cb(null, {
                ip: ip,
                city: 'Legacy City',
                country: 'LC'
            });
        });

        // 3. Call findOrCreate
        await ipDetailsService.findOrCreate(ip);

        // 4. Verify that ipinfo was updated
        const updated = await IpDetails.findOne({ ip });
        expect(updated).toBeDefined();
        expect((updated?.ipinfo as any).city).toBe('Legacy City');
    });

    test('should NOT retry enrichment if ipinfo is already present and valid', async () => {
        const ip = '3.3.3.3';

        // 1. Create an entry WITH valid ipinfo
        await IpDetails.create({
            ip,
            ipinfo: { city: 'Old City' },
            firstSeenAt: new Date(),
            lastSeenAt: new Date()
        });

        // 2. Setup mock (should not be called for enrichment)
        mockIpInfo.mockImplementation((ip: any, opts: any, cb: any) => {
            cb(null, { city: 'New City Attempt' });
        });

        // 3. Call findOrCreate
        await ipDetailsService.findOrCreate(ip);

        // 4. Verify that ipinfo was NOT updated
        expect(mockIpInfo).not.toHaveBeenCalled();

        const notUpdated = await IpDetails.findOne({ ip });
        expect((notUpdated?.ipinfo as any).city).toBe('Old City');
    });
});
