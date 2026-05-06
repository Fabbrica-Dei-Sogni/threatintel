import 'reflect-metadata';
import { ForensicPipelineService } from '../ForensicPipelineService';
import * as Tokens from '../../../di/tokens';
import { setupContainer } from '../../../di/registry';
import { getComponent, container } from '../../../di/container';

describe('ForensicPipelineService', () => {
    let service: ForensicPipelineService;
    let mockLogger: any;
    let mockConfigService: any;

    beforeEach(() => {
        // Initialize DI
        setupContainer(container);
        container.clearInstances();

        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };

        mockConfigService = {
            getConfigValue: jest.fn().mockImplementation(async (key) => {
                if (key === 'DANGER_WEIGHT') return JSON.stringify({ RPSNORM: 0.18 });
                if (key === 'TOLLERANCE_WEIGHTS') return JSON.stringify({ RPSTOL: 10 });
                return null;
            })
        };

        // Register mocks using Tokens
        container.registerInstance(Tokens.LOGGER_TOKEN, mockLogger);
        container.registerInstance(Tokens.CONFIG_SERVICE_TOKEN, mockConfigService);
    });

    describe('buildStandardPipeline', () => {
        it('should build a complete pipeline with all stages', async () => {
            service = getComponent(Tokens.FORENSIC_PIPELINE_TOKEN);
            const mongoFilters = { 'request.ip': '1.1.1.1' };
            const minLogsForAttack = 5;
            const timeConfig = { hours: 24 };

            const pipeline = await service.buildStandardPipeline(mongoFilters, minLogsForAttack, timeConfig);

            // Verify order and presence of stages
            // 0: TimeFilter
            // 1: MatchFilter
            // 2: Grouping
            // 3: AttackStats
            // 4: Scoring
            // 5: SequenceAnalysis
            // 6: PayloadAnalysis
            // 7: FingerprintAnalysis
            
            expect(pipeline.length).toBeGreaterThan(0);
            
            // Checking for specific stages by their operations
            expect(pipeline.some(s => s.$match && s.$match.timestamp)).toBe(true); // TimeFilter
            expect(pipeline.some(s => s.$match && s.$match['request.ip'])).toBe(true); // MatchFilter
            expect(pipeline.some(s => s.$group && s.$group._id === '$request.ip')).toBe(true); // Grouping
            expect(pipeline.some(s => s.$addFields && s.$addFields.dangerScore)).toBe(true); // Scoring
        });

        it('should handle missing config values by using defaults', async () => {
            mockConfigService.getConfigValue.mockResolvedValue(null);
            service = getComponent(Tokens.FORENSIC_PIPELINE_TOKEN);
            
            const pipeline = await service.buildStandardPipeline({}, 10);
            expect(pipeline.length).toBeGreaterThan(0);
            // Verify it still generated a valid pipeline (at least grouping and scoring)
            expect(pipeline.some(s => s.$group)).toBe(true);
            expect(pipeline.some(s => s.$addFields && s.$addFields.dangerScore)).toBe(true);
        });
    });

    describe('Initialization', () => {
        it('should handle config loading errors gracefully', async () => {
            mockConfigService.getConfigValue.mockRejectedValue(new Error('DB Error'));
            
            // Re-resolve service to trigger constructor logic if I weren't already
            // But _initFromDB is called in constructor
            getComponent(Tokens.FORENSIC_PIPELINE_TOKEN);
            
            // Wait for initialization (it's a private promise, but we can wait a bit or check logger)
            await new Promise(resolve => setTimeout(resolve, 100));
            
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Errore caricamento configurazioni'));
        });
    });
});
