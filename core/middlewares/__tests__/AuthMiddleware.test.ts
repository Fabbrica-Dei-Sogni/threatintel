import 'reflect-metadata';
import { AuthMiddleware } from '../AuthMiddleware';
import { Request, Response, NextFunction } from 'express';

describe('AuthMiddleware', () => {
    let middleware: AuthMiddleware;
    let mockAuthService: any;
    let mockI18n: any;
    let mockLogger: any;
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
        middleware = new AuthMiddleware(mockAuthService, mockI18n, mockLogger);
        
        req = {
            headers: {},
            method: 'GET'
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        next = jest.fn();
        
        process.env.ALLOW_ANONYMOUS = 'false';
    });

    describe('isAuthenticated', () => {
        it('should call next for OPTIONS requests', async () => {
            req.method = 'OPTIONS';
            await middleware.isAuthenticated()(req as Request, res as Response, next);
            expect(next).toHaveBeenCalled();
        });

        it('should return 401 if token is missing and anonymous is disabled', async () => {
            await middleware.isAuthenticated()(req as Request, res as Response, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });

        it('should set anonymous user if token is missing and anonymous is enabled', async () => {
            process.env.ALLOW_ANONYMOUS = 'true';
            process.env.ANONYMOUS_ROLE = 'viewer';
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
            process.env.ALLOW_ANONYMOUS = 'true';
            // No token provided -> anonymous
            await middleware.isIdentified()(req as Request, res as Response, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
    });
});
