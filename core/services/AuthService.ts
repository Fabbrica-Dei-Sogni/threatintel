import axios from 'axios';
import https from 'https';
import { inject, singleton } from 'tsyringe';
import { LOGGER_TOKEN } from '../di/tokens';
import { Logger } from 'winston';

const defaultDigitalAuthUri = 'https://localhost:3443/auth/api/v1';

@singleton()
export class AuthService {
    private instance = axios.create({
        httpsAgent: new https.Agent({
            rejectUnauthorized: process.env.AUTH_STRICT_SSL !== 'false'
        })
    });

    // Identificativo univoco di questa istanza dell'applicativo
    public readonly appId = process.env.APP_ID || process.env.HONEYPOT_INSTANCE_ID || 'threat-intel-01';

    constructor(@inject(LOGGER_TOKEN) private logger: Logger) { }

    private getUri() {
        return process.env.URI_DIGITAL_AUTH || defaultDigitalAuthUri;
    }

    public async verify(token: string): Promise<any> {
        this.logger.info(`[AuthService] Verifica token verso ${this.getUri()} per l'app ${this.appId}`);
        if (!token) {
            throw { message: 'Token mancante' };
        }

        try {
            const response = await this.instance.post(
                `${this.getUri()}/verify`,
                { appId: this.appId }, // Body della POST
                { headers: { 'Authorization': token } }
            );

            if (response.data.success && response.data.user) {
                this.logger.info(`[AuthService] Token OK. Utente: ${response.data.user.username}`);
                return response.data.user;
            } else {
                this.logger.warn(`[AuthService] Validazione fallita: success=${response.data.success}, user=${!!response.data.user}`);
                throw { message: response.data.message || 'Errore di validazione token' };
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message || 'Errore sconosciuto';
            this.logger.error(`[AuthService] Validazione fallita: ${msg}`);
            throw { message: msg, status: error.response?.status || 500 };
        }
    }

    public async login(data: any): Promise<any> {
        this.logger.info(`[AuthService] Proxy login verso ${this.getUri()}/login`);
        try {
            const response = await this.instance.post(`${this.getUri()}/login`, data);
            return response.data;
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message || 'Errore login';
            const status = error.response?.status || 500;
            this.logger.error(`[AuthService] Errore LOGIN dall'IdP [${status}]: ${JSON.stringify(error.response?.data || msg)}`);
            throw { message: msg, status };
        }
    }

    public async register(data: any): Promise<any> {
        this.logger.info(`[AuthService] Proxy register verso ${this.getUri()}/register con appId ${this.appId}`);
        try {
            data.appId = this.appId;

            // Il redirectUrl viene ora gestito interamente dal frontend
            // Il backend non deve più assumere il controllo di questa logica via .env

            const response = await this.instance.post(`${this.getUri()}/register`, data);
            return response.data;
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message || 'Errore registrazione';
            const status = error.response?.status || 500;
            this.logger.error(`[AuthService] Errore REGISTER dall'IdP [${status}]: ${JSON.stringify(error.response?.data || msg)}`);
            throw { message: msg, status };
        }
    }
}
