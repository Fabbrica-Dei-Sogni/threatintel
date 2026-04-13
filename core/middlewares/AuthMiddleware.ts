import { Request, Response, NextFunction } from 'express';
import { inject, singleton } from 'tsyringe';
import { AuthService } from '../services/AuthService';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';

@singleton()
export class AuthMiddleware {
    constructor(
        @inject(AuthService) private authService: AuthService,
        @inject(LOGGER_TOKEN) private logger: Logger
    ) {}

    // Ritorna il middleware per verificare se si è autenticati
    public isAuthenticated() {
        return async (req: Request, res: Response, next: NextFunction) => {
            // Permetti le richieste OPTIONS (CORS preflight) senza autenticazione
            if (req.method === 'OPTIONS') {
                return next();
            }

            let token = req.headers.authorization;
            if (token && token.startsWith('Bearer ')) {
                token = token.slice(7, token.length);
            }

            if (!token) {
                this.logger.warn('[AuthMiddleware] Accesso negato: token mancante');
                return res.status(401).json({ message: 'Accesso negato: token mancante' });
            }

            try {
                // Il verify interno lancia un'eccezione se fallisce
                const user = await this.authService.verify(token);
                (req as any).user = user; // Popola request
                next();
            } catch (error: any) {
                this.logger.warn(`[AuthMiddleware] Token non valido: ${error.message}`);
                return res.status(error.status || 401).json({ message: error.message || 'Token non valido' });
            }
        };
    }

    // Verifica se l'utente ha il ruolo richiesto
    public hasRole(roleName: string) {
        return (req: Request, res: Response, next: NextFunction) => {
            const user = (req as any).user;
            if (!user || !user.roles) {
                this.logger.warn('[AuthMiddleware] Forbidden: ruoli non trovati nell\'utente');
                return res.status(403).json({ message: 'Autorizzazione negata' });
            }

            const hasRole = user.roles.some((role: any) => role.name === roleName);
            if (hasRole) {
                next();
            } else {
                this.logger.warn(`[AuthMiddleware] Forbidden: richiesto ruolo ${roleName}`);
                return res.status(403).json({ message: 'Autorizzazione negata: permessi insufficienti' });
            }
        };
    }
}
