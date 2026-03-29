import 'reflect-metadata';
import { verifyToken } from '../common.auth';
import { verify } from '../../services/Authservice';

jest.mock('../../services/Authservice');

describe('common.auth.verifyToken', () => {
    let req: any;
    let res: any;
    let next: any;

    beforeEach(() => {
        req = {
            headers: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    it('should call next() if token is valid', async () => {
        req.headers['authorization'] = 'valid-token';
        (verify as jest.Mock).mockResolvedValue(true);

        await verifyToken(req, res, next);

        expect(verify).toHaveBeenCalledWith('valid-token');
        expect(next).toHaveBeenCalled();
    });

    it('should return 401 if token is missing', async () => {
        await verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Token mancante' });
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 500 if token verification fails', async () => {
        req.headers['authorization'] = 'invalid-token';
        (verify as jest.Mock).mockRejectedValue(new Error('Invalid token'));

        await verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(next).not.toHaveBeenCalled();
    });
});
