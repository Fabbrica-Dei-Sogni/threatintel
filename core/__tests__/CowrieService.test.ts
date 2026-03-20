import 'reflect-metadata';
import { CowrieService } from '../services/CowrieService';
import { IpDetailsService } from '../services/IpDetailsService';
import CowrieSession from '../models/CowrieSessionSchema';
import CowrieEvent from '../models/CowrieEventSchema';

// Mocks
jest.mock('../models/CowrieSessionSchema');
jest.mock('../models/CowrieEventSchema');
jest.mock('winston', () => ({
    Logger: jest.fn().mockImplementation(() => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    }))
}));

describe('CowrieService', () => {
    let cowrieService: CowrieService;
    let mockLogger: any;
    let mockIpDetailsService: jest.Mocked<IpDetailsService>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };

        mockIpDetailsService = {
            saveIpDetails: jest.fn(),
            isIPExcluded: jest.fn().mockReturnValue(false)
        } as unknown as jest.Mocked<IpDetailsService>;

        cowrieService = new CowrieService(mockLogger, mockIpDetailsService);
    });

    afterEach(() => {
        // Pulizia degli intervalli
        jest.useRealTimers();
    });

    describe('getSessions()', () => {
        it('should return paginated sessions', async () => {
            const mockSessions = [{ session: 'abc', src_ip: '10.0.0.1' }];
            const totalCount = 1;

            (CowrieSession.countDocuments as jest.Mock).mockResolvedValue(totalCount);
            
            const populateMock = jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockSessions)
            });
            const limitMock = jest.fn().mockReturnValue({ populate: populateMock });
            const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
            const sortMock = jest.fn().mockReturnValue({ skip: skipMock });
            (CowrieSession.find as jest.Mock).mockReturnValue({ sort: sortMock });

            const result = await cowrieService.getSessions(1, 10);

            expect(result).toEqual({
                data: mockSessions,
                page: 1,
                limit: 10,
                total: 1,
                totalPages: 1
            });
            expect(CowrieSession.find).toHaveBeenCalled();
        });
    });

    describe('getSessionEvents()', () => {
        it('should return events ordered chronologically', async () => {
            const mockEvents = [
                { _id: '1', eventid: 'cowrie.login.failed', time: 100 },
                { _id: '2', eventid: 'cowrie.command.input', time: 105 }
            ];

            const execMock = jest.fn().mockResolvedValue(mockEvents);
            const sortMock = jest.fn().mockReturnValue({ exec: execMock });
            (CowrieEvent.find as jest.Mock).mockReturnValue({ sort: sortMock });

            const result = await cowrieService.getSessionEvents('sess-hash-123');

            expect(CowrieEvent.find).toHaveBeenCalledWith({ session: 'sess-hash-123' });
            expect(result).toEqual(mockEvents);
        });
    });

    describe('enrichSessions() Background Job', () => {
        it('should process unenriched sessions and call IpDetailsService', async () => {
            const mockUnenrichedSession = {
                session: 'def',
                src_ip: '8.8.8.8',
                ipDetailsId: null,
                save: jest.fn()
            };

            const limitMock = jest.fn().mockResolvedValue([mockUnenrichedSession]);
            (CowrieSession.find as jest.Mock).mockReturnValue({ limit: limitMock });
            
            mockIpDetailsService.saveIpDetails.mockResolvedValue('mongo-obj-id-123' as any);
            mockIpDetailsService.isIPExcluded.mockReturnValue(false);

            // Access private method for testing purpose
            await (cowrieService as any).enrichSessions();

            expect(CowrieSession.find).toHaveBeenCalledWith({
                src_ip: { $exists: true, $ne: null },
                ipDetailsId: null
            });
            expect(mockIpDetailsService.isIPExcluded).toHaveBeenCalledWith('8.8.8.8');
            expect(mockIpDetailsService.saveIpDetails).toHaveBeenCalledWith('8.8.8.8');
            expect(mockUnenrichedSession.ipDetailsId).toBe('mongo-obj-id-123');
            expect(mockUnenrichedSession.save).toHaveBeenCalled();
        });

        it('should skip excluded IPs (like localhost)', async () => {
            const mockPrivateSession = {
                session: 'ghi',
                src_ip: '127.0.0.1',
                ipDetailsId: null,
                save: jest.fn()
            };

            const limitMock = jest.fn().mockResolvedValue([mockPrivateSession]);
            (CowrieSession.find as jest.Mock).mockReturnValue({ limit: limitMock });
            
            mockIpDetailsService.isIPExcluded.mockReturnValue(true);

            await (cowrieService as any).enrichSessions();

            expect(mockIpDetailsService.isIPExcluded).toHaveBeenCalledWith('127.0.0.1');
            expect(mockIpDetailsService.saveIpDetails).not.toHaveBeenCalled();
            expect(mockPrivateSession.save).not.toHaveBeenCalled();
        });
    });
});
