import axios from 'axios';
import https from 'https';
import { verify } from '../services/Authservice';

const instance = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

export async function verifyToken(req: any, res: any, next: any) {
    const token = req.headers['authorization'];

    try {
        await verify(token);
        next();
    } catch (error: any) {
        res.status(500).json(error);
    }
    if (!token) return res.status(401).json({ message: 'Token mancante' });
}

export default { verifyToken };
