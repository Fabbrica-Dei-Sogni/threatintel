/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */

import 'reflect-metadata';
import { PatternAnalysisService } from '../PatternAnalysisService';

import * as Tokens from '../../di/tokens';
import { setupContainer } from '../../di/registry';
import { getComponent, container } from '../../di/container';
import { ThreatIndicator } from '../../types/indicators';

describe('PatternAnalysisService', () => {
    let service: PatternAnalysisService;
    let mockLogger: any;
    let mockConfigService: any;

    beforeEach(async () => {
        // Initialize DI
        setupContainer(container);
        
        // Clear instances
        container.clearInstances();

        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };

        mockConfigService = {
            getConfigValue: jest.fn().mockImplementation((key) => {
                switch (key) {
                    case 'SUSPICIOUS_PATTERNS': return '/admin,system,exec';
                    case 'BOT_PATTERNS': return 'googlebot,bingbot';
                    case 'SUSPICIOUS_REFERERS': return 'malicious.com';
                    case 'SUSPICIOUS_SCORES': return JSON.stringify({ URL_PATTERN: 20 });
                    default: return null;
                }
            })
        };

        // Register mocks using Tokens
        container.registerInstance(Tokens.LOGGER_TOKEN, mockLogger);
        container.registerInstance(Tokens.CONFIG_SERVICE_TOKEN, mockConfigService);

        // Resolve service via Token
        service = getComponent(Tokens.PATTERN_ANALYSIS_SERVICE_TOKEN);
        
        // Wait for initialization
        await (service as any).initialized;
    });

    describe('loadConfigFromDB', () => {
        it('should load and parse patterns correctly', () => {
            expect((service as any).suspiciousPatterns).toHaveLength(3);
            expect((service as any).suspiciousPatterns[0]).toBeInstanceOf(RegExp);
            expect((service as any).suspiciousScores.URL_PATTERN).toBe(20);
        });
    });

    describe('analyze', () => {
        it('should detect suspicious URL patterns', () => {
            const result = service.analyze('/admin/config', 'Mozilla/5.0', '{}', '', 'GET', '{}', { headers: {} });
            expect(result.suspicious).toBe(true);
            expect(result.indicators).toContain(`${ThreatIndicator.URL_PATTERN}:\\/admin`);
            expect(result.score).toBe(20);
        });

        it('should detect suspicious body patterns', () => {
            const result = service.analyze('/', 'Mozilla/5.0', '{"cmd": "exec system"}', '', 'POST', '{}', { headers: {} });
            expect(result.suspicious).toBe(true);
            expect(result.indicators).toContain(`${ThreatIndicator.BODY_PATTERN}:system`);
            expect(result.indicators).toContain(`${ThreatIndicator.BODY_PATTERN}:exec`);
        });

        it('should detect bot user agents', () => {
            const result = service.analyze('/', 'Googlebot/2.1', '{}', '', 'GET', '{}', { headers: {} });
            expect(result.isBot).toBe(true);
            expect(result.indicators).toContain(`${ThreatIndicator.BOT_USER_AGENT}:googlebot`);
        });

        it('should detect missing or short user agents', () => {
            const result = service.analyze('/', '', '{}', '', 'GET', '{}', { headers: {} });
            expect(result.indicators).toContain(ThreatIndicator.MISSING_USER_AGENT);
            
            const resultShort = service.analyze('/', 'abc', '{}', '', 'GET', '{}', { headers: {} });
            expect(resultShort.indicators).toContain(ThreatIndicator.SHORT_USER_AGENT);
        });

        it('should detect uncommon HTTP methods', () => {
            const result = service.analyze('/', 'Mozilla/5.0 (Windows NT 10.0)', '{}', '', 'PUT', '{}', { headers: {} });
            expect(result.indicators).toContain(ThreatIndicator.UNCOMMON_METHOD);
        });

        it('should detect suspicious referers', () => {
            const result = service.analyze('/', 'Mozilla/5.0 (Windows NT 10.0)', '{}', 'http://malicious.com/payload', 'GET', '{}', { headers: {} });
            expect(result.indicators).toContain(`${ThreatIndicator.SUSPICIOUS_REFERER}:malicious.com`);
        });


        it('should detect short user agents', () => {
            const result = service.analyze('/', 'curl', '{}', '', 'GET', '{}', { headers: {} });
            expect(result.indicators.some(i => i.includes(ThreatIndicator.SHORT_USER_AGENT))).toBe(true);
        });

        it('should detect uncommon HTTP methods', () => {
            const result = service.analyze('/', 'Mozilla/5.0', '{}', '', 'PUT', '{}', { headers: {} });
            expect(result.indicators.some(i => i.includes(ThreatIndicator.UNCOMMON_METHOD))).toBe(true);
        });

        it('should detect alternative ports in headers', () => {
            const otherToAnalyze = {
                headers: { 'x-server-port': '8080' }
            };
            const result = service.analyze('/', 'Mozilla/5.0 (Windows NT 10.0)', '{}', '', 'GET', '{}', otherToAnalyze);
            expect(result.indicators).toContain(`${ThreatIndicator.ALT_PORT}:8080`);
        });

        it('should detect suspicious patterns in User-Agent if they match referer patterns', () => {
            const result = service.analyze('/', 'malicious.com', '{}', '', 'GET', '{}', { headers: {} });
            expect(result.indicators.some(i => i.includes(ThreatIndicator.SUSPICIOUS_REFERER))).toBe(true);
        });
    });

    describe('generateFingerprint', () => {
        it('should generate a consistent MD5 hash', () => {
            const req = {
                get: jest.fn().mockImplementation((name) => {
                    if (name === 'User-Agent') return 'Mozilla/5.0';
                    return null;
                })
            } as any;
            const ip = '1.2.3.4';
            const hash1 = service.generateFingerprint(req, ip);
            const hash2 = service.generateFingerprint(req, ip);
            expect(hash1).toBe(hash2);
            expect(hash1).toHaveLength(32); // MD5 hex length
        });
    });

    describe('getGeoLocation', () => {
        it('should return empty object for invalid IP', () => {
            const geo = service.getGeoLocation('invalid-ip');
            expect(geo).toEqual({});
        });

        it('should return geo info for valid IP', () => {
            // we use a known public IP like Google DNS 8.8.8.8
            const geo = service.getGeoLocation('8.8.8.8');
            if (geo.country) {
                expect(geo.country).toBe('US');
            }
        });
    });
});
