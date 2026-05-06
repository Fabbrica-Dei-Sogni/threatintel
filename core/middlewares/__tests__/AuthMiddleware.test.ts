/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import 'reflect-metadata';
import { AuthMiddleware } from '../AuthMiddleware';
import { Request, Response, NextFunction } from 'express';

describe('AuthMiddleware', () => {
    let middleware: AuthMiddleware;
    let mockAuthService: any;
    let mockI18n: any;
    let mockLogger: any;
    let mockConfigProvider: any;
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        mockAuthService = {
            verify: jest.fn()
        };
        mockI18n = {
            t: jest.fn().mockReturnValue('translated string')
        };
        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };
        mockConfigProvider = {
            allowAnonymous: false,
            anonymousRole: 'viewer'
        };
        middleware = new AuthMiddleware(mockAuthService, mockI18n, mockLogger, mockConfigProvider);
        
        req = {
            headers: {},
            method: 'GET'
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        next = jest.fn();
    });

    describe('isAuthenticated', () => {
        it('should call next for OPTIONS requests', async () => {
            req.method = 'OPTIONS';
            await middleware.isAuthenticated()(req as Request, res as Response, next);
            expect(next).toHaveBeenCalled();
        });

        it('should return 401 if token is missing and anonymous is disabled', async () => {
            mockConfigProvider.allowAnonymous = false;
            await middleware.isAuthenticated()(req as Request, res as Response, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });

        it('should set anonymous user if token is missing and anonymous is enabled', async () => {
            mockConfigProvider.allowAnonymous = true;
            mockConfigProvider.anonymousRole = 'viewer';
            await middleware.isAuthenticated()(req as Request, res as Response, next);
            expect((req as any).user.username).toBe('anonymous');
            expect(next).toHaveBeenCalled();
        });

        it('should set user if token is valid', async () => {
            const mockUser = { _id: '123', username: 'testuser' };
            mockAuthService.verify.mockResolvedValue(mockUser);
            req.headers!.authorization = 'Bearer valid-token';
            
            await middleware.isAuthenticated()(req as Request, res as Response, next);
            
            expect(mockAuthService.verify).toHaveBeenCalledWith('valid-token');
            expect((req as any).user).toEqual(mockUser);
            expect(next).toHaveBeenCalled();
        });

        it('should return 401 if token is invalid and anonymous is disabled', async () => {
            mockAuthService.verify.mockRejectedValue(new Error('Invalid token'));
            req.headers!.authorization = 'Bearer invalid-token';
            
            await middleware.isAuthenticated()(req as Request, res as Response, next);
            
            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('hasRole', () => {
        it('should call next if user has the role', () => {
            (req as any).user = { roles: [{ name: 'admin' }] };
            middleware.hasRole('admin')(req as Request, res as Response, next);
            expect(next).toHaveBeenCalled();
        });

        it('should return 403 if user does not have the role', () => {
            (req as any).user = { roles: [{ name: 'viewer' }] };
            middleware.hasRole('admin')(req as Request, res as Response, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 403 if user has no roles', () => {
            (req as any).user = { roles: [] };
            middleware.hasRole('admin')(req as Request, res as Response, next);
            expect(res.status).toHaveBeenCalledWith(403);
        });
    });

    describe('isIdentified', () => {
        it('should call next if user is real (not anonymous)', async () => {
            const mockUser = { _id: '123', username: 'realuser' };
            mockAuthService.verify.mockResolvedValue(mockUser);
            req.headers!.authorization = 'Bearer valid-token';

            await middleware.isIdentified()(req as Request, res as Response, next);
            expect(next).toHaveBeenCalled();
        });

        it('should return 403 if user is anonymous', async () => {
            mockConfigProvider.allowAnonymous = true;
            // No token provided -> anonymous
            await middleware.isIdentified()(req as Request, res as Response, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
    });
});
