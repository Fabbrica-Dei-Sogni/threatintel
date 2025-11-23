import axios from 'axios';
import https from 'https';
import { Request, Response, NextFunction } from 'express';

// Import JS models (will be converted later)
const Role = require('../models/auth/role');
const User = require('../models/auth/user');
const { uriDigitalAuth } = require('../config');

const instance = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    })
});

export async function verify(token: string): Promise<boolean> {

    console.log(`Verifica del token di autenticazione verso lo issuer Digital Auth... ${uriDigitalAuth}`);
    if (!token) {
        throw { message: 'Token mancante' };
    }

    try {

        const response = await instance.post(
            `${uriDigitalAuth}/verify`,
            {}, // Puoi passare un body vuoto se non hai dati nel corpo della richiesta
            {
                headers: {
                    'Authorization': token
                }
            }
        );

        if (response.data.success) {
            console.log("Verifica token ok!");
            return response.data.success;
        } else {
            console.error(`Validazione token fallita: ${response.data.message}`);
            throw { message: response.data.message };
        }
    } catch (error: any) {
        const msg = error.response?.data?.message || error.message || 'Errore sconosciuto';
        console.error(`Errore durante la verifica token : ${msg}`);
        throw error.response?.data || { message: msg };
    }
}

/**
 * Callback per verificare il ruolo dell'utente attraverso il modulo digital-auth
 * @param {*} role 
 * @returns 
 */
// Middleware per verificare i ruoli dell'utente
export function checkRole(role: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        // Verifica se l'utente ha il ruolo richiesto
        if ((req as any).user.roles.includes(role)) {
            next();
        } else {
            res.status(403).json({ message: 'Autorizzazione negata' });
        }
    };
}
