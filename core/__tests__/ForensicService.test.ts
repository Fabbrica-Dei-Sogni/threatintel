import 'reflect-metadata';
import { container } from 'tsyringe';
import { ForensicService } from '../services/forense/ForensicService';
import { ConfigService } from '../services/ConfigService';
import { Logger } from 'winston';
import { LOGGER_TOKEN } from '../di/tokens';

describe('ForensicService - Time Filter Surgical Fix', () => {
    let service: ForensicService;
    let mockLogger: jest.Mocked<Logger>;
    let mockConfigService: jest.Mocked<ConfigService>;

    beforeEach(() => {
        container.clearInstances();
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        } as any;

        mockConfigService = {
            getConfigValue: jest.fn().mockResolvedValue(null),
        } as any;

        // Register for container.resolve
        container.registerInstance(LOGGER_TOKEN, mockLogger);
        container.registerInstance(ConfigService, mockConfigService);

        service = new ForensicService(mockLogger, mockConfigService);
    });

    it('should handle months time filter (30 days approx)', async () => {
        const timeConfig = { months: 2 };
        const pipeline = await service.buildAttackGroupsBasePipeline({}, 10, timeConfig);

        const matchStage = pipeline[0];
        const actualDate = matchStage.$match.timestamp.$gte;
        const expectedDate = new Date(Date.now() - (2 * 30 * 24 * 60 * 60 * 1000));

        // Allow 1000ms variance
        expect(Math.abs(actualDate.getTime() - expectedDate.getTime())).toBeLessThan(1000);
    });

    it('should parse string dates correctly for interval', async () => {
        const timeConfig = {
            fromDate: '2025-01-01',
            toDate: '2025-01-01'
        };
        const pipeline = await service.buildAttackGroupsBasePipeline({}, 10, timeConfig);
        const matchStage = pipeline[0];
        const fromDate = matchStage.$match.timestamp.$gte;
        const toDate = matchStage.$match.timestamp.$lte;

        expect(fromDate instanceof Date).toBe(true);
        expect(toDate instanceof Date).toBe(true);

        expect(fromDate.getFullYear()).toBe(2025);
        expect(toDate.getHours()).toBe(23); // Verify end of day setting
    });

    it('should behave normally for Date objects', async () => {
        const d1 = new Date('2025-02-01');
        const d2 = new Date('2025-02-02');
        const timeConfig = {
            fromDate: d1,
            toDate: d2
        };
        const pipeline = await service.buildAttackGroupsBasePipeline({}, 10, timeConfig);
        const matchStage = pipeline[0];
        // Logic sets hours for toDate even if it's a Date object if the helper logic flows that way?
        // Ah, in my code surgical fix:
        // timeAgo = parseDate(timeConfig.fromDate); -> returns d1
        // const toDateParsed = parseDate(timeConfig.toDate); -> returns d2
        // if (toDateParsed) { toDateParsed.setHours(...) }
        // So yes, it modifies the Date object in place or returns it. Ideally minimal side effects but strict 'surgical' implies just making it work.
        // Let's verify it sets end of day.
        expect(matchStage.$match.timestamp.$lte.getHours()).toBe(23);
    });
    it('should handle years time filter (365 days approx)', async () => {
        const timeConfig = { years: 1 };
        const pipeline = await service.buildAttackGroupsBasePipeline({}, 10, timeConfig);

        const matchStage = pipeline[0];
        const actualDate = matchStage.$match.timestamp.$gte;
        const expectedDate = new Date(Date.now() - (1 * 365 * 24 * 60 * 60 * 1000));

        // Allow 1000ms variance
        expect(Math.abs(actualDate.getTime() - expectedDate.getTime())).toBeLessThan(1000);
    });

    describe('_initFromDB', () => {
        it('should load weights from JSON string', async () => {
            mockConfigService.getConfigValue.mockImplementation(async (key) => {
                if (key === 'DANGER_WEIGHT') return JSON.stringify({ RPSNORM: 0.5 });
                return null;
            });
            await (service as any)._initFromDB();
            expect((service as any).dangerWeights.RPSNORM).toBe(0.5);
        });

        it('should fallback to key:value parsing for weights', async () => {
            mockConfigService.getConfigValue.mockImplementation(async (key) => {
                if (key === 'DANGER_WEIGHT') return 'RPSNORM:0.7,SCORENORM:0.3';
                return null;
            });
            await (service as any)._initFromDB();
            expect((service as any).dangerWeights.RPSNORM).toBe(0.7);
            expect((service as any).dangerWeights.SCORENORM).toBe(0.3);
        });
    });

    describe('buildAttackGroupsBasePipeline complex cases', () => {
        it('should handle minutes, hours, days time filter', async () => {
            const configs = [
                { minutes: 30, expectedMs: 30 * 60 * 1000 },
                { hours: 2, expectedMs: 2 * 60 * 60 * 1000 },
                { days: 3, expectedMs: 3 * 24 * 60 * 60 * 1000 }
            ];

            for (const config of configs) {
                const pipeline = await service.buildAttackGroupsBasePipeline({}, 10, config);
                const actualDate = pipeline[0].$match.timestamp.$gte;
                const expectedDate = new Date(Date.now() - config.expectedMs);
                expect(Math.abs(actualDate.getTime() - expectedDate.getTime())).toBeLessThan(1000);
            }
        });

    });

    describe('buildAttackGroupsBasePipeline', () => {
        it('should handle custom time configuration', async () => {
            const timeConfig = { days: 1 };
            const pipeline = await service.buildAttackGroupsBasePipeline({}, 1, timeConfig);
            expect(pipeline[0].$match.timestamp).toBeDefined();
        });

        it('should handle from/to object filter', async () => {
            const timeConfig = {
                from: { days: 2 },
                to: { hours: 1 }
            };
            const pipeline = await service.buildAttackGroupsBasePipeline({}, 10, timeConfig);
            const matchStage = pipeline[0];
            const gte = matchStage.$match.timestamp.$gte;
            const lte = matchStage.$match.timestamp.$lte;

            expect(Math.abs(gte.getTime() - (Date.now() - 2 * 24 * 60 * 60 * 1000))).toBeLessThan(1000);
            expect(Math.abs(lte.getTime() - (Date.now() - 1 * 60 * 60 * 1000))).toBeLessThan(1000);
        });

        it('should handle partial from object filter', async () => {
            const configs = [
                { from: { minutes: 5 }, expected: 5 * 60 * 1000 },
                { from: { hours: 1 }, expected: 1 * 60 * 60 * 1000 },
                { from: { days: 1 }, expected: 1 * 24 * 60 * 60 * 1000 }
            ];
            for (const cfg of configs) {
                const pipeline = await service.buildAttackGroupsBasePipeline({}, 10, cfg);
                expect(pipeline[0].$match.timestamp.$gte).toBeDefined();
            }
        });

        it('should handle partial to object filter', async () => {
            const configs = [
                { to: { minutes: 5 } },
                { to: { hours: 1 } },
                { to: { days: 1 } }
            ];
            for (const cfg of configs) {
                const pipeline = await service.buildAttackGroupsBasePipeline({}, 10, cfg);
                expect(pipeline[0].$match.timestamp.$lte).toBeDefined();
            }
        });

        it('should handle from object with all units', async () => {
            await service.buildAttackGroupsBasePipeline({}, 10, { from: { minutes: 1 } });
            await service.buildAttackGroupsBasePipeline({}, 10, { from: { hours: 1 } });
            await service.buildAttackGroupsBasePipeline({}, 10, { from: { days: 1 } });
            expect(mockLogger.info).toHaveBeenCalled();
        });

        it('should handle to object with all units', async () => {
            await service.buildAttackGroupsBasePipeline({}, 10, { to: { minutes: 1 } });
            await service.buildAttackGroupsBasePipeline({}, 10, { to: { hours: 1 } });
            await service.buildAttackGroupsBasePipeline({}, 10, { to: { days: 1 } });
            expect(mockLogger.info).toHaveBeenCalled();
        });

        it('should handle fromDate without toDate', async () => {
            const pipeline = await service.buildAttackGroupsBasePipeline({}, 10, { fromDate: '2025-01-01' });
            expect(pipeline[0].$match.timestamp.$gte).toBeDefined();
            expect(pipeline[0].$match.timestamp.$lte).toBeUndefined();
        });

        it('should handle toDate without fromDate', async () => {
            const pipeline = await service.buildAttackGroupsBasePipeline({}, 10, { toDate: '2025-01-01' });
            expect(pipeline[0].$match.timestamp.$lte).toBeDefined();
            expect(pipeline[0].$match.timestamp.$gte).toBeUndefined();
        });

        it('should include $match stage if filters or timeConfig are present', async () => {
            const pipeline = await service.buildAttackGroupsBasePipeline({ test: 1 }, 10, { minutes: 5 });
            // Should have two $match stages: one for time, one for filters
            expect(pipeline[0].$match).toBeDefined();
            expect(pipeline[1].$match).toBeDefined();
        });
    });
});
