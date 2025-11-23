/**
 * Test suite for ForensicService (TypeScript)
 */

import ForensicService from '../ForensicService';
import ConfigService from '../../ConfigService';

// Mock ConfigService
jest.mock('../../ConfigService', () => ({
    getConfigValue: jest.fn(),
}));

describe('ForensicService', () => {
    beforeAll(async () => {
        // No DB connection needed; ConfigService is mocked.
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initialization', () => {
        test('should load weights from config', async () => {
            // Mock config values
            (ConfigService.getConfigValue as jest.Mock)
                .mockResolvedValueOnce('{"RPSNORM":0.5}') // danger weight
                .mockResolvedValueOnce('{"RPSTOL":20}'); // tolerance weights

            // Call private init (exposed for test via any)
            await (ForensicService as any)._initFromDB();

            expect((ForensicService as any).dangerWeights).toEqual({ RPSNORM: 0.5 });
            expect((ForensicService as any).tolleranceWeights).toEqual({ RPSTOL: 20 });
        });

        test('should handle config errors gracefully', async () => {
            (ConfigService.getConfigValue as jest.Mock).mockRejectedValue(new Error('DB Error'));
            await expect((ForensicService as any)._initFromDB()).resolves.not.toThrow();
        });
    });

    describe('buildAttackGroupsBasePipeline', () => {
        test('should build pipeline with time filters', async () => {
            const pipeline = await ForensicService.buildAttackGroupsBasePipeline({}, 10, { minutes: 60 });
            expect(pipeline).toBeInstanceOf(Array);
            const matchStage = pipeline.find((stage: any) => stage.$match && stage.$match.timestamp);
            expect(matchStage).toBeDefined();
        });

        test('should build pipeline with mongo filters', async () => {
            const pipeline = await ForensicService.buildAttackGroupsBasePipeline({ 'request.ip': '1.2.3.4' }, 10);
            const matchStage = pipeline.find((stage: any) => stage.$match && stage.$match['request.ip']);
            expect(matchStage).toBeDefined();
        });
    });
});
