import { Request, Response, NextFunction } from 'express';
import { inject, singleton } from 'tsyringe';
import { AuthService } from '../services/AuthService';
import { I18nService } from '../services/I18nService';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';

@singleton()
export class AuthMiddleware {
    constructor(
        @inject(AuthService) private authService: AuthService,
        @inject(I18nService) private i18n: I18nService,
        @inject(LOGGER_TOKEN) private logger: Logger
    ) {}
    
    private getLocale(req: Request): string {
        return (req.headers['x-locale'] as string) || 
               (req.headers['accept-language']?.split(',')[0]?.split(';')[0]) || 
               'it-IT';
    }

    // Ritorna il middleware per verificare se si è autenticati
    public isAuthenticated() {
        return async (req: Request, res: Response, next: NextFunction) => {
            // Permetti le richieste OPTIONS (CORS preflight) senza autenticazione
            if (req.method === 'OPTIONS') {
                return next();
            }

            const allowAnonymous = process.env.ALLOW_ANONYMOUS === 'true';
            const anonymousRole = process.env.ANONYMOUS_ROLE || 'viewer';

            const setAnonymousUser = () => {
                (req as any).user = {
                    _id: 'anonymous',
                    username: 'anonymous',
                    roles: [{ name: anonymousRole }]
                };
                this.logger.info(`[AuthMiddleware] Accesso anonimo concesso (Ruolo: ${anonymousRole})`);
                next();
            }

            let token = req.headers.authorization;
            if (token && token.startsWith('Bearer ')) {
                token = token.slice(7, token.length);
            }

            if (!token) {
                if (allowAnonymous) {
                    return setAnonymousUser();
                }

                const locale = this.getLocale(req);
                const message = this.i18n.t('errors.auth.tokenMissing', locale);
                this.logger.warn(`[AuthMiddleware] Accesso negato: ${message}`);
                return res.status(401).json({ message });
            }

            try {
                // Il verify interno lancia un'eccezione se fallisce
                const user = await this.authService.verify(token);
                (req as any).user = user; // Popola request
                next();
            } catch (error: any) {
                if (allowAnonymous) {
                    this.logger.warn(`[AuthMiddleware] Fallback su anonimo a causa di errore auth: ${error.message || 'Errore sconosciuto'}`);
                    return setAnonymousUser();
                }

                const locale = this.getLocale(req);
                const defaultMsg = this.i18n.t('errors.auth.tokenInvalid', locale);
                const message = error.message || defaultMsg;
                this.logger.warn(`[AuthMiddleware] Token non valido: ${message}`);
                return res.status(error.status || 401).json({ message });
            }
        };
    }

    // Verifica se l'utente ha il ruolo richiesto
    public hasRole(roleName: string) {
        return (req: Request, res: Response, next: NextFunction) => {
            const user = (req as any).user;
            const locale = this.getLocale(req);

            if (!user || !user.roles) {
                const message = this.i18n.t('errors.auth.forbidden', locale);
                this.logger.warn(`[AuthMiddleware] Forbidden: ${message}`);
                return res.status(403).json({ message });
            }

            const hasRole = user.roles.some((role: any) => role.name === roleName);
            if (hasRole) {
                next();
            } else {
                const message = this.i18n.t('errors.auth.insufficientPermissions', locale);
                this.logger.warn(`[AuthMiddleware] Forbidden: richiesto ruolo ${roleName}. ${message}`);
                return res.status(403).json({ message });
            }
        };
    }
}
