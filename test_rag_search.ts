
import "reflect-metadata";
import mongoose from "mongoose";
import { coreContainer } from "./core/di/container";
import { ASSISTANT_SERVICE_TOKEN, LOGGER_TOKEN, RAG_SYNC_SERVICE_TOKEN } from "./core/di/tokens";
import { AssistantService } from "./core/services/assistant/AssistantService";
import { RagSyncService } from "./core/services/assistant/RagSyncService";
import { Logger } from "winston";
import * as dotenv from "dotenv";

dotenv.config();

async function runSearch(query: string, type?: string) {
    const assistant = coreContainer.resolve<AssistantService>(ASSISTANT_SERVICE_TOKEN);
    const logger = coreContainer.resolve<Logger>(LOGGER_TOKEN);

    console.log(`\n--- SEARCHING: "${query}" (Type: ${type || 'all'}) ---`);
    
    try {
        const results = await assistant.search(query, { limit: 3, type: type as any });
        
        if (results.length === 0) {
            console.log("No results found.");
            return;
        }

        results.forEach((hit, index) => {
            console.log(`\n[Hit #${index + 1}] Score: ${hit.score.toFixed(4)}`);
            const params = hit.sourceRef?.params;
            const type = params?.type;
            
            console.log(`Type: ${type}`);
            
            if (type === 'log') {
                console.log(`ID: ${params.id}`);
            } else if (type === 'attack') {
                console.log(`IP: ${params.ip}`);
            } else if (type === 'campaign') {
                console.log(`Hash: ${params.hash}`);
            } else if (type === 'ip_details') {
                console.log(`IP: ${params.ip}`);
            }
            
            console.log(`Narrative: ${hit.text?.substring(0, 300)}...`);
        });
    } catch (error: any) {
        console.error(`Error during search: ${error.message}`);
    }
}

async function main() {
    console.log("Initializing RAG Search Test...");

    // 1. Connessione MongoDB
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/threatintel";
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected.");

    // 2. Inizializzazione RAG
    const ragSync = coreContainer.resolve<RagSyncService>(RAG_SYNC_SERVICE_TOKEN);
    await ragSync.initialize();
    
    const status = ragSync.getStatus();
    console.log("RAG Status:", status);

    if (!status.operational) {
        console.error("RAG system is NOT operational. Make sure Qdrant and Ollama are running.");
        await mongoose.disconnect();
        return;
    }
    
    // Esempi di ricerche
    const queries = [
        "Attacchi brute force ripetuti su protocollo SSH",
        "Attività sospette provenienti da range IP cinesi",
        "Campagne massive che utilizzano fingerprint HTTP comuni",
        "IP con alta reputazione negativa e molti log di attacco"
    ];

    for (const q of queries) {
        await runSearch(q);
    }

    await mongoose.disconnect();
}

main().catch(async (err) => {
    console.error(err);
    await mongoose.disconnect();
});
