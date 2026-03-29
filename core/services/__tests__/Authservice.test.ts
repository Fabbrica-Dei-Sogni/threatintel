/**
 * Test suite for Authservice (TypeScript)
 */

import * as Authservice from '../Authservice';
import axios from 'axios';

// Mock axios.create and its post method
jest.mock('axios', () => {
    const mockPost = jest.fn();
    return {
        create: jest.fn(() => ({ post: mockPost })),
        post: mockPost,
    };
});

describe('Authservice', () => {
    let mockAxiosInstance: any;

    beforeEach(() => {
        jest.clearAllMocks();
        // Retrieve the mocked instance
        mockAxiosInstance = (axios as any).create();
    });

    describe('verify', () => {
        test('should return true for valid token', async () => {
            mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });
            const result = await Authservice.verify('valid-token');
            expect(result).toBe(true);
        });

        test('should throw error for missing token', async () => {
            await expect(Authservice.verify(null as any)).rejects.toEqual({ message: 'Token mancante' });
        });

        test('should throw error for invalid token', async () => {
            mockAxiosInstance.post.mockResolvedValue({ data: { success: false, message: 'Invalid token' } });
            await expect(Authservice.verify('invalid-token')).rejects.toEqual({ message: 'Invalid token' });
        });

        test('should handle API errors with response data', async () => {
            mockAxiosInstance.post.mockRejectedValue({ response: { data: { message: 'API Error' } } });
            await expect(Authservice.verify('error-token')).rejects.toEqual({ message: 'API Error' });
        });

        test('should handle API errors without response data but with message', async () => {
            mockAxiosInstance.post.mockRejectedValue(new Error('Network Error'));
            await expect(Authservice.verify('error-token')).rejects.toEqual({ message: 'Network Error' });
        });

        test('should handle completely unknown errors', async () => {
            mockAxiosInstance.post.mockRejectedValue({});
            await expect(Authservice.verify('error-token')).rejects.toEqual({ message: 'Errore sconosciuto' });
        });

        test('should log error when verify fails', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            mockAxiosInstance.post.mockRejectedValue(new Error('Log Error'));
            try { await Authservice.verify('log-token'); } catch (e) {}
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Log Error'));
            consoleSpy.mockRestore();
        });

        test('should handle axios error without response and without message', async () => {
            mockAxiosInstance.post.mockRejectedValue({});
            await expect(Authservice.verify('token')).rejects.toEqual({ message: 'Errore sconosciuto' });
        });
    });

    describe('checkRole', () => {
        test('should call next if user has role', () => {
            const req = { user: { roles: ['admin', 'user'] } } as any;
            const res = {} as any;
            const next = jest.fn();
            const middleware = Authservice.checkRole('admin');
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        test('should return 403 if user does not have role', () => {
            const req = { user: { roles: ['user'] } } as any;
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            } as any;
            const next = jest.fn();
            const middleware = Authservice.checkRole('admin');
            middleware(req, res, next);
            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Autorizzazione negata' });
        });

        test('should handle missing user object in request', () => {
            const req = {} as any;
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            } as any;
            const next = jest.fn();
            const middleware = Authservice.checkRole('any');
            
            expect(() => middleware(req, res, next)).toThrow();
        });
    });
});
