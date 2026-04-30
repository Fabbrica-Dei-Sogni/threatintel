/**
 * ThreatIntel - Distributed Forensics Engine
 *
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE.md in the project root for license terms.
 */

import 'reflect-metadata';
import axios from 'axios';
import { AuthService } from '../AuthService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AuthService', () => {
    let service: AuthService;
    let mockLogger: any;
    const mockToken = 'mock-token';

    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };
        
        // Setup axios mock instance
        const mockInstance = {
            post: jest.fn()
        };
        (axios.create as jest.Mock).mockReturnValue(mockInstance);
        
        service = new AuthService(mockLogger);
        (service as any).instance = mockInstance;
    });

    describe('verify', () => {
        it('should return user if token is valid', async () => {
            const mockUser = { username: 'test' };
            (service as any).instance.post.mockResolvedValue({
                data: { success: true, user: mockUser }
            });

            const user = await service.verify(mockToken);
            expect(user).toEqual(mockUser);
        });

        it('should throw if token is missing', async () => {
            await expect(service.verify('')).rejects.toEqual({ message: 'Token mancante' });
        });

        it('should throw if validation fails (success=false)', async () => {
            (service as any).instance.post.mockResolvedValue({
                data: { success: false, message: 'Invalid token' }
            });

            await expect(service.verify(mockToken)).rejects.toEqual({ message: 'Invalid token', status: 500 });
        });

        it('should throw if axios request fails', async () => {
            (service as any).instance.post.mockRejectedValue({
                response: { status: 401, data: { message: 'Unauthorized' } }
            });

            await expect(service.verify(mockToken)).rejects.toEqual({ message: 'Unauthorized', status: 401 });
        });
    });

    describe('login', () => {
        it('should return response data on success', async () => {
            const mockData = { token: 'new-token' };
            (service as any).instance.post.mockResolvedValue({ data: mockData });

            const result = await service.login({ username: 'u', password: 'p' });
            expect(result).toEqual(mockData);
        });
    });

    describe('register', () => {
        it('should return response data on success', async () => {
            const mockData = { success: true };
            (service as any).instance.post.mockResolvedValue({ data: mockData });

            const result = await service.register({ username: 'u', email: 'e' });
            expect(result).toEqual(mockData);
        });
    });
});
