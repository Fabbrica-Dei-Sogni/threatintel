/**
 * Test suite for ForensicService
 */

const mongoose = require('mongoose');
const ForensicService = require('../ForensicService');
const ConfigService = require('../../ConfigService');

// Mock ConfigService
jest.mock('../../ConfigService', () => ({
    getConfigValue: jest.fn()
}));

describe('ForensicService', () => {
    beforeAll(async () => {
        // No DB connection needed for this service logic mostly, 
        // but it does init from DB via ConfigService which is mocked.
        // However, buildAttackGroupsBasePipeline returns a pipeline (array).
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initialization', () => {
        test('should load weights from config', async () => {
            ConfigService.getConfigValue
                .mockResolvedValueOnce('{"RPSNORM": 0.5}') // DANGER_WEIGHT
                .mockResolvedValueOnce('{"RPSTOL": 20}');  // TOLLERANCE_WEIGHTS

            // Re-init manually or create new instance if possible?
            // ForensicService is a singleton instance.
            // We can call _initFromDB manually.
            await ForensicService._initFromDB();

            expect(ForensicService.dangerWeights).toEqual({ RPSNORM: 0.5 });
            expect(ForensicService.tolleranceWeights).toEqual({ RPSTOL: 20 });
        });

        test('should handle config errors gracefully', async () => {
            ConfigService.getConfigValue.mockRejectedValue(new Error('DB Error'));
            await ForensicService._initFromDB();
            // Should not throw
        });
    });

    describe('buildAttackGroupsBasePipeline', () => {
        test('should build pipeline with time filters', async () => {
            const pipeline = await ForensicService.buildAttackGroupsBasePipeline(
                {},
                10,
                { minutes: 60 }
            );

            expect(pipeline).toBeInstanceOf(Array);
            // Check if match stage is present
            const matchStage = pipeline.find(stage => stage.$match && stage.$match.timestamp);
            expect(matchStage).toBeDefined();
        });

        test('should build pipeline with mongo filters', async () => {
            const pipeline = await ForensicService.buildAttackGroupsBasePipeline(
                { 'request.ip': '1.2.3.4' },
                10
            );

            const matchStage = pipeline.find(stage => stage.$match && stage.$match['request.ip']);
            expect(matchStage).toBeDefined();
        });
    });
});
