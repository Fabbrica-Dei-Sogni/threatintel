import { injectable, inject } from 'tsyringe';
import { QdrantClient } from '@qdrant/js-client-rest';
import { Logger } from 'winston';
import { LOGGER_TOKEN } from '../../di/tokens';
import { AppConfigProvider } from '../AppConfigProvider';

@injectable()
export class QdrantClientService {
    private client: QdrantClient;
    private defaultCollectionName: string;

    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        private readonly config: AppConfigProvider
    ) {
        this.client = new QdrantClient({ url: this.config.qdrantUrl });
        this.defaultCollectionName = this.config.ragCollectionName;
    }

    /**
     * Inizializza una collection se non esiste.
     * @param collectionName Nome della collection
     * @param vectorSize La dimensione del vettore (es. 768 per nomic-embed-text)
     */
    public async initializeCollection(collectionName: string, vectorSize: number = 768) {
        try {
            const collections = await this.client.getCollections();
            const exists = collections.collections.some(c => c.name === collectionName);

            if (!exists) {
                this.logger.info(`[Qdrant] Creating collection: ${collectionName} (Size: ${vectorSize})`);
                await this.client.createCollection(collectionName, {
                    vectors: {
                        size: vectorSize,
                        distance: 'Cosine'
                    }
                });
            } else {
                // Verifica integrità (dimensioni)
                const info = await this.client.getCollection(collectionName);
                const currentSize = (info.config.params.vectors as any).size;
                
                if (currentSize !== vectorSize) {
                    this.logger.error(`[Qdrant] Collection ${collectionName} size mismatch! Expected ${vectorSize}, found ${currentSize}.`);
                } else {
                    this.logger.debug(`[Qdrant] Collection ${collectionName} verified (Size: ${currentSize}).`);
                }
            }
        } catch (error) {
            this.logger.error(`[Qdrant] Error initializing collection ${collectionName}: ${error}`);
            throw error;
        }
    }

    /**
     * Inserisce o aggiorna dei punti nel database vettoriale.
     * @param collectionName Nome della collection
     * @param points Array di punti (vettori + metadati)
     */
    public async upsertPoints(collectionName: string, points: Array<{ id: string | number, vector: number[], payload: any }>) {
        try {
            this.logger.debug(`[Qdrant] Upserting ${points.length} points to ${collectionName}`);
            await this.client.upsert(collectionName, {
                wait: true,
                points: points.map(p => ({
                    id: p.id,
                    vector: p.vector,
                    payload: p.payload
                }))
            });
        } catch (error) {
            this.logger.error(`[Qdrant] Error during upsert on ${collectionName}: ${error}`);
            throw error;
        }
    }

    /**
     * Ricerca per similarità vettoriale con supporto ai filtri.
     */
    public async search(collectionName: string, vector: number[], limit: number = 5, filter?: any) {
        try {
            this.logger.debug(`[Qdrant] Searching for similarity in ${collectionName}`);
            return await this.client.search(collectionName, {
                vector: vector,
                limit: limit,
                filter: filter,
                with_payload: true
            });
        } catch (error) {
            this.logger.error(`[Qdrant] Error during search on ${collectionName}: ${error}`);
            throw error;
        }
    }

    /**
     * Elimina un punto specifico.
     */
    public async deletePoint(collectionName: string, id: string | number) {
        try {
            await this.client.delete(collectionName, {
                points: [id]
            });
        } catch (error) {
            this.logger.error(`[Qdrant] Error during delete on ${collectionName}: ${error}`);
        }
    }
}
