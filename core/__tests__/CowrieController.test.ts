import 'reflect-metadata';
import { CowrieController } from '../controllers/CowrieController';
import { CowrieService } from '../services/CowrieService';
import { Request, Response } from 'express';
import { Logger } from 'winston';

describe('CowrieController', () => {
    let cowrieController: CowrieController;
    let mockCowrieService: jest.Mocked<CowrieService>;
    let mockLogger: jest.Mocked<Logger>;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let responseJson: jest.Mock;
    let responseStatus: jest.Mock;

    beforeEach(() => {
        mockCowrieService = {
            getSessions: jest.fn(),
            countSessions: jest.fn(),
            getSessionDetails: jest.fn(),
            getSessionEvents: jest.fn()
        } as any;

        mockLogger = {
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn()
        } as any;

        cowrieController = new CowrieController(mockCowrieService, mockLogger);

        responseJson = jest.fn();
        responseStatus = jest.fn().mockReturnValue({ json: responseJson });
        mockResponse = {
            status: responseStatus
        };
    });

    describe('getSessions()', () => {
        it('should return 200 and sessions data', async () => {
            mockRequest = {
                query: {
                    page: '1',
                    pageSize: '20',
                    sort: JSON.stringify({ eventCount: -1 }),
                    filters: JSON.stringify({ src_ip: '10.0.0.1' })
                }
            };

            const mockSessions = [{ session: 'abc', eventCount: 5 }];
            mockCowrieService.getSessions.mockResolvedValue({ sessions: mockSessions, totalCount: 1 });
            mockCowrieService.countSessions.mockResolvedValue(1);

            await cowrieController.getSessions(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(200);
            expect(responseJson).toHaveBeenCalledWith({
                sessions: mockSessions,
                total: 1,
                page: 1,
                pageSize: 20
            });
            expect(mockCowrieService.getSessions).toHaveBeenCalledWith(1, 20, { eventCount: -1 }, { src_ip: '10.0.0.1' });
        });

        it('should handle invalid JSON in query params gracefully', async () => {
            mockRequest = {
                query: {
                    sort: 'invalid-json',
                    filters: 'invalid-json'
                }
            };

            mockCowrieService.getSessions.mockResolvedValue({ sessions: [], totalCount: 0 });
            mockCowrieService.countSessions.mockResolvedValue(0);

            await cowrieController.getSessions(mockRequest as Request, mockResponse as Response);

            expect(mockLogger.warn).toHaveBeenCalledTimes(2);
            expect(responseStatus).toHaveBeenCalledWith(200);
        });

        it('should return 500 if service throws error', async () => {
            mockRequest = { query: {} };
            mockCowrieService.getSessions.mockRejectedValue(new Error('DB Error'));

            await cowrieController.getSessions(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(500);
            expect(responseJson).toHaveBeenCalledWith({ error: 'Failed to fetch telnet sessions.' });
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('getSessionDetails()', () => {
        it('should return 200 and session details', async () => {
            mockRequest = { params: { id: 'abc' } };
            const mockSession = { session: 'abc' };
            mockCowrieService.getSessionDetails.mockResolvedValue(mockSession as any);

            await cowrieController.getSessionDetails(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(200);
            expect(responseJson).toHaveBeenCalledWith(mockSession);
        });

        it('should return 404 if session not found', async () => {
            mockRequest = { params: { id: 'not-found' } };
            mockCowrieService.getSessionDetails.mockResolvedValue(null);

            await cowrieController.getSessionDetails(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(404);
        });
    });

    describe('getSessionEvents()', () => {
        it('should return 200 and events', async () => {
            mockRequest = { params: { id: 'abc' } };
            const mockEvents = [{ eventid: 'login' }];
            mockCowrieService.getSessionEvents.mockResolvedValue(mockEvents as any);

            await cowrieController.getSessionEvents(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(200);
            expect(responseJson).toHaveBeenCalledWith(mockEvents);
        });
    });
});
