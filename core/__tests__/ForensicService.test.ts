import 'reflect-metadata';
import { ForensicService } from '../services/forense/ForensicService';
import { ConfigService } from '../services/ConfigService';
import { Logger } from 'winston';

describe('ForensicService - Time Filter Surgical Fix', () => {
    let service: ForensicService;
    let mockLogger: jest.Mocked<Logger>;
    let mockConfigService: jest.Mocked<ConfigService>;

    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        } as any;

        mockConfigService = {
            getConfigValue: jest.fn().mockResolvedValue(null),
        } as any;

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
});
