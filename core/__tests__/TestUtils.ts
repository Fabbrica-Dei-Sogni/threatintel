import { AppConfigProvider } from '../services/AppConfigProvider';

/**
 * Creates a mock AppConfigProvider for testing purposes.
 * @param overrides Optional partial overrides for the config provider
 */
export function createMockConfigProvider(overrides: Partial<AppConfigProvider> = {}): jest.Mocked<AppConfigProvider> {
    const mock = {
        port: '3000',
        mongoUri: 'mongodb://localhost:17017/test',
        appDomain: 'localhost',
        allowedOrigins: ['*'],
        commonEndpoints: [],
        authUri: 'https://localhost/auth',
        appId: 'test-app',
        authStrictSsl: false,
        allowAnonymous: true,
        anonymousRole: 'viewer',
        qdrantUrl: 'http://localhost:6333',
        ragEnabled: false,
        ragCollectionName: 'test_intelligence',
        ragLogsCollectionName: 'test_logs',
        ragAiSummaryEnabled: false,
        ragReindexThresholdDays: 7,
        ollamaUrl: 'http://localhost:11434',
        embeddingModel: 'test-embed',
        summaryModel: 'test-summary',
        ollamaEmbeddingTimeout: 30000,
        ollamaGenerateTimeout: 60000,
        ollamaNumPredict: 50,
        ollamaTemperature: 0.4,
        ollamaTopP: 0.9,
        excludedIps: ['127.0.0.1'],
        ipCacheMaxAgeHours: 24,
        abuseIpDbKey: 'test-key',
        ipInfoToken: 'test-token',
        nginxLogPrefix: 'test:',
        analyzeInterval: '5m',
        redisHost: 'localhost',
        redisPort: 6379,
        redisPassword: 'test-password',
        redisDb: 0,
        redisConnectTimeoutMs: 500,
        redisCommandTimeoutMs: 500,
        redisAutoConnectInTest: false,
        dangerWeightRpsNorm: 0.18,
        dangerWeightDurNorm: 0.12,
        dangerWeightScoreNorm: 0.50,
        dangerWeightUniqueTechNorm: 0.2,
        dangerWeightDistributed: 0.15,
        getDynamicConfig: jest.fn().mockResolvedValue(null),
        getNginxSuspiciousPatterns: jest.fn().mockResolvedValue([]),
        ...overrides
    } as any;

    return mock as jest.Mocked<AppConfigProvider>;
}
