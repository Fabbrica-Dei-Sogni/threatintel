import 'reflect-metadata';
import { ForensicPipelineService } from '../services/forense/ForensicPipelineService';
import { ConfigService } from '../services/ConfigService';

// Mock Logger
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
} as any;

// Mock ConfigService
const mockConfigService = {
    getConfigValue: jest.fn(),
} as any;

describe('Forensic Pipeline Service Test', () => {
    let newService: ForensicPipelineService;

    beforeEach(async () => {
        // Enforce implicit defaults or specific values to avoid .env pollution
        process.env.DANGER_WEIGHT_RPSNORM = '0.18';
        process.env.DANGER_WEIGHT_DURNORM = '0.12';
        process.env.DANGER_WEIGHT_SCORENORM = '0.50';
        process.env.DANGER_WEIGHT_UNIQUETECHNORM = '0.20';

        // Mock config values
        mockConfigService.getConfigValue.mockImplementation((key: string) => {
            if (key === 'DANGER_WEIGHT') return Promise.resolve(null);
            if (key === 'TOLLERANCE_WEIGHTS') return Promise.resolve(null);
            return Promise.resolve(null);
        });

        newService = new ForensicPipelineService(mockLogger, mockConfigService);
        await (newService as any).initialized;
    });

    afterEach(() => {
        delete process.env.DANGER_WEIGHT_RPSNORM;
        delete process.env.DANGER_WEIGHT_DURNORM;
        delete process.env.DANGER_WEIGHT_SCORENORM;
        delete process.env.DANGER_WEIGHT_UNIQUETECHNORM;
    });

    it('should build a standard pipeline correctly', async () => {
        const filters = { 'headers.host': 'example.com' };
        const minLogs = 10;
        const timeConfig = { minutes: 10 };

        const pipeline = await newService.buildStandardPipeline(filters, minLogs, timeConfig);

        expect(Array.isArray(pipeline)).toBe(true);
        expect(pipeline.length).toBeGreaterThan(0);

        // Check for specific stages presence by basic signature
        const stages = pipeline.map(s => Object.keys(s)[0]);
        // Typical flow: Match (Time) -> Match (Filters) -> Group -> Lookup -> Match -> ReplaceRoot -> AddFields (Stats) -> AddFields (Scoring)

        expect(pipeline[0]).toHaveProperty('$match'); // Time filter
        expect(pipeline[1]).toHaveProperty('$match'); // Regular filter

        // Find Group Stage
        const groupStage = pipeline.find(s => s.$group);
        expect(groupStage).toBeDefined();

        // Find ReplaceRoot
        const replaceRootIndex = pipeline.findIndex(s => s.$replaceRoot);
        expect(replaceRootIndex).toBeGreaterThan(-1);

        // Verify GroupingStage optimization: durataAttacco should NOT be in ReplaceRoot
        const replaceRootObj = pipeline[replaceRootIndex].$replaceRoot.newRoot;
        // In $replaceRoot with mergeObjects, we look for explicit keys in the second object of mergeObjects
        const addedFields = replaceRootObj.$mergeObjects[1];
        expect(addedFields).not.toHaveProperty('durataAttacco');
        expect(addedFields).not.toHaveProperty('averageScore');
        expect(addedFields).toHaveProperty('sumScore'); // We kept this

        // Verify AttackStatsStage optimization
        // AttackStatsStage is usually after ReplaceRoot
        const statsStages = pipeline.slice(replaceRootIndex + 1);

        // Find the stage that calculates attackDurationMinutes
        const statsStage = statsStages.find(s => s.$addFields && s.$addFields.attackDurationMinutes);
        expect(statsStage).toBeDefined();
        expect(statsStage!.$addFields).toHaveProperty('rps');
        expect(statsStage!.$addFields).toHaveProperty('averageScore');

        // Find ScoringStage
        // It should rely on previous fields
        const scoringStageIndex = statsStages.findIndex(s => s.$addFields && s.$addFields.intensityAttack);
        const scoringStage = statsStages[scoringStageIndex];

        // Check intensityAttack uses simplified logic (not inline divide)
        const intensitySwitch = scoringStage!.$addFields.intensityAttack.$switch;
        const firstBranch = intensitySwitch.branches[0];
        // The condition should reference $attackDurationMinutes directly
        // Structure: { $and: [ { $lt: ['$attackDurationMinutes', 5] }, ... ] }
        const cond = firstBranch.case.$and[0];
        // We expect cond.$lt to be ['$attackDurationMinutes', 5]
        const ltArg = cond.$lt;
        expect(ltArg[0]).toBe('$attackDurationMinutes');
    });
});
