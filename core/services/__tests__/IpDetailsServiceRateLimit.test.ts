/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */


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

        // Mock RagSync
        const mockRagSync = {
            syncIpDetails: jest.fn().mockResolvedValue(true)
        };

        // Create service instance manually with mocked logger and ragSync
        ipDetailsService = new IpDetailsService(mockLogger as Logger, mockRagSync as any);
    });

    test('should handle 429 Rate Limit error from ipinfo (err arg) by returning the error object', async () => {
        const error = {
            status: 429,
            error: 'Rate limit exceeded'
        };

        mockIpInfo.mockImplementation((ip: any, opts: any, cb: any) => {
            cb(error, null);
        });

        const ip = '1.1.1.1';
        const data = await ipDetailsService.enrichIpData(ip);

        expect(data.ipinfo).toEqual(error);
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringMatching(/Rate limit superato per ipinfo/));
    });

    test('should handle 429 Rate Limit error from ipinfo (data arg) by returning the error object', async () => {
        const errorData = {
            status: 429,
            error: 'Rate limit exceeded'
        };

        mockIpInfo.mockImplementation((ip: any, opts: any, cb: any) => {
            cb(null, errorData);
        });

        const ip = '1.1.1.2';
        const data = await ipDetailsService.enrichIpData(ip);

        expect(data.ipinfo).toEqual(errorData);
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringMatching(/Rate limit superato per ipinfo/));
    });

    test('should retry enrichment in findOrCreate if ipinfo contains Rate Limit error', async () => {
        const ip = '2.2.2.2';
        const errorDetails = {
            status: 429,
            error: 'Rate limit exceeded'
        };

        await IpDetails.create({
            ip,
            ipinfo: errorDetails,
            firstSeenAt: new Date(),
            lastSeenAt: new Date(),
            enrichedAt: null
        });

        mockIpInfo.mockImplementation((ip: any, opts: any, cb: any) => {
            cb(null, {
                ip: ip,
                city: 'New City',
                country: 'NC'
            });
        });

        await ipDetailsService.findOrCreate(ip);

        const updated = await IpDetails.findOne({ ip });
        expect(updated).toBeDefined();
        expect((updated?.ipinfo as any).city).toBe('New City');
    });

    test('should retry enrichment in findOrCreate if ipinfo is null (legacy support)', async () => {
        const ip = '4.4.4.4';
        await IpDetails.create({
            ip,
            ipinfo: null,
            firstSeenAt: new Date(),
            lastSeenAt: new Date(),
            enrichedAt: null
        });

        mockIpInfo.mockImplementation((ip: any, opts: any, cb: any) => {
            cb(null, {
                ip: ip,
                city: 'Legacy City',
                country: 'LC'
            });
        });

        await ipDetailsService.findOrCreate(ip);

        const updated = await IpDetails.findOne({ ip });
        expect(updated).toBeDefined();
        expect((updated?.ipinfo as any).city).toBe('Legacy City');
    });

    test('should NOT retry enrichment if ipinfo is already present and valid', async () => {
        const ip = '3.3.3.3';
        await IpDetails.create({
            ip,
            ipinfo: { city: 'Old City' },
            firstSeenAt: new Date(),
            lastSeenAt: new Date()
        });

        mockIpInfo.mockImplementation((ip: any, opts: any, cb: any) => {
            cb(null, { city: 'New City Attempt' });
        });

        await ipDetailsService.findOrCreate(ip);

        expect(mockIpInfo).not.toHaveBeenCalled();

        const notUpdated = await IpDetails.findOne({ ip });
        expect((notUpdated?.ipinfo as any).city).toBe('Old City');
    });
});
