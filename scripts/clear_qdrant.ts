import 'reflect-metadata';
import { container } from 'tsyringe';
import { QdrantClientService } from '../core/services/assistant/QdrantClientService';
import { AppConfigProvider } from '../core/services/AppConfigProvider';
import { Logger } from 'winston';
import { LOGGER_TOKEN } from '../core/di/tokens';
import * as winston from 'winston';

async function clearQdrant() {
    // Setup logger minimale per lo script
    const logger = winston.createLogger({
        level: 'info',
        format: winston.format.simple(),
        transports: [new winston.transports.Console()]
    });

    container.register(LOGGER_TOKEN, { useValue: logger });

    const config = container.resolve(AppConfigProvider);
    const qdrant = container.resolve(QdrantClientService);

    const collections = [
        config.ragCollectionName,
        config.ragLogsCollectionName
    ];

    console.log('--- QDRANT CLEANUP TOOL ---');
    for (const coll of collections) {
        if (!coll) continue;
        console.log(`Deleting collection: ${coll}...`);
        const success = await qdrant.deleteCollection(coll);
        if (success) {
            console.log(`Successfully deleted ${coll}`);
        } else {
            console.log(`Failed to delete ${coll} (it might not exist)`);
        }
    }
    console.log('Cleanup finished.');
    process.exit(0);
}

clearQdrant().catch(err => {
    console.error('Error during cleanup:', err);
    process.exit(1);
});
