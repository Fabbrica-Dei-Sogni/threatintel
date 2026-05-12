import mongoose from 'mongoose';
import { singleton, inject } from 'tsyringe';
import { logger } from '../../logger';
import { AppConfigProvider } from './AppConfigProvider';

@singleton()
export class DatabaseService {
    private isConnected: boolean = false;

    constructor(
        private readonly config: AppConfigProvider
    ) {}

    /**
     * Inizializza la connessione a MongoDB
     */
    async connect(): Promise<void> {
        if (this.isConnected) {
            return;
        }

        const uri = this.config.mongoUri;
        
        try {
            logger.info(`[DatabaseService] Tentativo di connessione a MongoDB...`);
            
            // Impostazioni ottimali per la connessione
            const options = {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            };

            await mongoose.connect(uri, options);
            this.isConnected = true;
            logger.info('[DatabaseService] ✅ Connesso a MongoDB con successo.');

            mongoose.connection.on('error', (err) => {
                logger.error('[DatabaseService] ❌ Errore connessione MongoDB:', err);
                this.isConnected = false;
            });

            mongoose.connection.on('disconnected', () => {
                logger.warn('[DatabaseService] ⚠️  Scollegato da MongoDB.');
                this.isConnected = false;
            });

        } catch (error) {
            logger.error('[DatabaseService] ❌ Impossibile connettersi a MongoDB:', error);
            throw error;
        }
    }

    /**
     * Chiude la connessione a MongoDB
     */
    async disconnect(): Promise<void> {
        if (!this.isConnected) {
            return;
        }

        try {
            await mongoose.disconnect();
            this.isConnected = false;
            logger.info('[DatabaseService] Connessione MongoDB chiusa.');
        } catch (error) {
            logger.error('[DatabaseService] Errore durante la disconnessione da MongoDB:', error);
        }
    }

    /**
     * Verifica se il database è connesso
     */
    get status(): boolean {
        return this.isConnected && mongoose.connection.readyState === 1;
    }
}
