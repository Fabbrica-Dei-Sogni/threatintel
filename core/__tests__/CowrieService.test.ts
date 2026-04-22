import 'reflect-metadata';
import { CowrieService } from '../services/CowrieService';
import { IpDetailsService } from '../services/IpDetailsService';
import CowrieSession from '../models/CowrieSessionSchema';
import CowrieEvent from '../models/CowrieEventSchema';
import CowrieAuth from '../models/CowrieAuthSchema';
import CowrieInput from '../models/CowrieInputSchema';
import CowrieTtyLog from '../models/CowrieTtyLogSchema';

// Mocks
jest.mock('../models/CowrieSessionSchema');
jest.mock('../models/CowrieEventSchema');
jest.mock('../models/CowrieAuthSchema');
jest.mock('../models/CowrieInputSchema');
jest.mock('../models/CowrieTtyLogSchema');

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
        it('should return paginated sessions with eventCount using aggregate', async () => {
            const mockAggregateResult = [{
                sessions: [
                    { session: 'abc', src_ip: '10.0.0.1', eventCount: 5 }
                ],
                totalCount: 1
            }];

            const aggregateMock = jest.fn().mockReturnValue({
                allowDiskUse: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(mockAggregateResult)
            });
            (CowrieSession.aggregate as jest.Mock).mockReturnValue(aggregateMock());

            const result = await cowrieService.getSessions(1, 10, { eventCount: -1 }, { src_ip: '10.0.0.1' });

            expect(result).toEqual({
                sessions: mockAggregateResult[0].sessions,
                totalCount: 1
            });
            expect(CowrieSession.aggregate).toHaveBeenCalled();
            
            // Verify pipeline contains match and addFields for eventCount
            const pipeline = (CowrieSession.aggregate as jest.Mock).mock.calls[0][0];
            expect(pipeline).toContainEqual(expect.objectContaining({ $match: expect.any(Object) }));
            expect(pipeline).toContainEqual(expect.objectContaining({ $addFields: expect.objectContaining({ eventCount: expect.any(Object) }) }));
        });

        it('should return empty array if aggregate returns nothing', async () => {
            (CowrieSession.aggregate as jest.Mock).mockReturnValue({
                allowDiskUse: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([])
            });

            const result = await cowrieService.getSessions(1, 10);

            expect(result).toEqual({
                sessions: [],
                totalCount: 0
            });
        });
    });

    describe('getSessions()', () => {
        // ... (previous tests)
    });

    describe('countSessions()', () => {
        it('should return total count of documents with filter', async () => {
            (CowrieSession.countDocuments as jest.Mock).mockResolvedValue(42);
            const result = await cowrieService.countSessions({ src_ip: '1.2.3.4' });
            expect(result).toBe(42);
            expect(CowrieSession.countDocuments).toHaveBeenCalledWith(expect.objectContaining({
                src_ip: { $regex: '1\\.2\\.3\\.4', $options: 'i' }
            }));
        });
    });

    describe('getSessionDetails()', () => {
        it('should return session details by id', async () => {
            const mockSession = { session: 'xyz', src_ip: '1.1.1.1' };
            const leanMock = jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockSession)
            });
            const populateMock = jest.fn().mockReturnValue({
                lean: leanMock
            });
            (CowrieSession.findOne as jest.Mock).mockReturnValue({ populate: populateMock });

            // Mock per getSessionEvents (ritorniamo 1 evento per evitare il blocco scanner)
            const eventLeanMock = jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue([{ eventid: 'cowrie.session.connect' }])
            });
            (CowrieEvent.find as jest.Mock).mockReturnValue({ lean: eventLeanMock });
            (CowrieAuth.find as jest.Mock).mockReturnValue({ lean: eventLeanMock });
            (CowrieInput.find as jest.Mock).mockReturnValue({ lean: eventLeanMock });
            (CowrieTtyLog.find as jest.Mock).mockReturnValue({ lean: eventLeanMock });

            const result = await cowrieService.getSessionDetails('xyz');
            expect(result).toEqual(mockSession);
            expect(CowrieSession.findOne).toHaveBeenCalledWith({ session: 'xyz' });
        });
    });

    describe('getSessionEvents()', () => {
        it('should return events ordered chronologically', async () => {
            const mockEvents = [
                { _id: '1', eventid: 'cowrie.login.failed', time: 100 },
                { _id: '2', eventid: 'cowrie.command.input', time: 105 }
            ];

            const execMock = jest.fn().mockResolvedValue(mockEvents);
            const leanMock = jest.fn().mockReturnValue({ exec: execMock });
            (CowrieEvent.find as jest.Mock).mockReturnValue({ lean: leanMock });
            (CowrieAuth.find as jest.Mock).mockReturnValue({ lean: leanMock });
            (CowrieInput.find as jest.Mock).mockReturnValue({ lean: leanMock });
            (CowrieTtyLog.find as jest.Mock).mockReturnValue({ lean: leanMock });

            const result = await cowrieService.getSessionEvents('sess-hash-123');

            expect(CowrieEvent.find).toHaveBeenCalledWith({ session: 'sess-hash-123' });
            expect(result).toEqual([...mockEvents, ...mockEvents, ...mockEvents, ...mockEvents]);
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
