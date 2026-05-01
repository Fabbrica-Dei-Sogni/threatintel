import { injectable, inject } from 'tsyringe';
import { QdrantClient } from '@qdrant/js-client-rest';
import { Logger } from 'winston';
import { LOGGER_TOKEN } from '../../di/tokens';
import { AppConfigProvider } from '../AppConfigProvider';

@injectable()
export class QdrantClientService {
    private client: QdrantClient;
    private collectionName: string;

    constructor(
        @inject(LOGGER_TOKEN) private readonly logger: Logger,
        private readonly config: AppConfigProvider
    ) {
        this.client = new QdrantClient({ url: this.config.qdrantUrl });
        this.collectionName = this.config.ragCollectionName;
    }

    /**
     * Inizializza la collection se non esiste.
     * @param vectorSize La dimensione del vettore (es. 768 per nomic-embed-text)
     */
    public async initializeCollection(vectorSize: number = 768) {
        try {
            const collections = await this.client.getCollections();
            const exists = collections.collections.some(c => c.name === this.collectionName);

            if (!exists) {
                this.logger.info(`[Qdrant] Creating collection: ${this.collectionName} (Size: ${vectorSize})`);
                await this.client.createCollection(this.collectionName, {
                    vectors: {
                        size: vectorSize,
                        distance: 'Cosine'
                    }
                });
            } else {
                this.logger.debug(`[Qdrant] Collection ${this.collectionName} already exists.`);
            }
        } catch (error) {
            this.logger.error(`[Qdrant] Error initializing collection: ${error}`);
            throw error;
        }
    }

    /**
     * Inserisce o aggiorna dei punti nel database vettoriale.
     * @param points Array di punti (vettori + metadati)
     */
    public async upsertPoints(points: Array<{ id: string | number, vector: number[], payload: any }>) {
        try {
            this.logger.debug(`[Qdrant] Upserting ${points.length} points to ${this.collectionName}`);
            await this.client.upsert(this.collectionName, {
                wait: true,
                points: points.map(p => ({
                    id: p.id,
                    vector: p.vector,
                    payload: p.payload
                }))
            });
        } catch (error) {
            this.logger.error(`[Qdrant] Error during upsert: ${error}`);
            throw error;
        }
    }

    /**
     * Ricerca per similarità vettoriale.
     * @param vector Il vettore della query
     * @param limit Numero massimo di risultati
     * @returns Risultati della ricerca
     */
    public async search(vector: number[], limit: number = 5) {
        try {
            this.logger.debug(`[Qdrant] Searching for similarity in ${this.collectionName}`);
            return await this.client.search(this.collectionName, {
                vector: vector,
                limit: limit,
                with_payload: true
            });
        } catch (error) {
            this.logger.error(`[Qdrant] Error during search: ${error}`);
            throw error;
        }
    }

    /**
     * Elimina un punto specifico.
     * @param id ID del punto
     */
    public async deletePoint(id: string | number) {
        try {
            await this.client.delete(this.collectionName, {
                points: [id]
            });
        } catch (error) {
            this.logger.error(`[Qdrant] Error during delete: ${error}`);
        }
    }
}
