import 'reflect-metadata';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { container } from './core/di/container';
import { ThreatLogService } from './core/services/ThreatLogService';
import ThreatLog from './core/models/ThreatLogSchema';

dotenv.config();

async function runTest() {
    console.log("Connessione a MongoDB...");
    await mongoose.connect(process.env.MONGO_URI!);
    
    const threatLogService = container.resolve(ThreatLogService);

    const ipList = ['10.20.30.1', '10.20.30.2', '10.20.30.3'];
    const now = new Date();

    // Pulizia dati precedenti
    await ThreatLog.deleteMany({ 'request.ip': { $in: ipList } });

    // Inserimento dati di test (5 log per ogni IP)
    const logs = [];
    for (const ip of ipList) {
        for (let i = 0; i < 5; i++) {
            logs.push({
                id: `test-dist-${ip}-${i}-${Date.now()}`,
                timestamp: new Date(now.getTime() - i * 60000), // 1 minuto di distanza
                request: {
                    ip,
                    method: 'POST',
                    url: '/api/v1/admin/login',
                    userAgent: 'Custom-Attacker-Agent/1.0'
                },
                fingerprint: {
                    hash: 'campaign-123-fixed-hash',
                    suspicious: true,
                    score: 25,
                    indicators: ['URL_PATTERN', 'UNCOMMON_METHOD']
                },
                protocol: 'http'
            });
        }
    }

    await ThreatLog.insertMany(logs);
    console.log(`Inseriti ${logs.length} log di test per gli IP: ${ipList.join(', ')}`);

    console.log("Esecuzione analisi distribuita...");
    
    // Test Distributed Attack
    const result: any = await threatLogService.getDistributedAttackDetail({
        ipList,
        minLogsForAttack: 1
    });

    console.log("\n=== RISULTATO ANALISI DISTRIBUITA ===");
    if (result) {
        console.log(`Cluster ID (Retrocompatibile): ${result._id}`);
        console.log(`Cluster isDistributed: ${result.isDistributed}`);
        console.log(`IP Coinvolti (${result.ipCount}): ${result.ips?.join(', ')}`);
        console.log(`Totale Log Aggregati: ${result.totaleLogs}`);
        console.log(`Danger Score Globale: ${result.dangerScore}`);
        console.log(`Intensità Cluster: ${result.intensityAttack}`);
        console.log(`RPS Cluster: ${result.rps}`);
        console.log(`Punteggio Medio: ${result.averageScore}`);
        
        // Verifica retrocompatibilità: il primo IP della lista deve essere l'_id
        if (result._id === ipList[0]) {
            console.log("\n✓ SUCCESS: L'ID del cluster corrisponde al primo IP della lista (retrocompatibilità confermata).");
        } else {
            console.log("\n✗ FAILURE: L'ID del cluster non corrisponde al primo IP della lista.");
        }
    } else {
        console.log("Nessun risultato trovato.");
    }

    // Pulizia finale (opzionale, commentata per ispezione manuale)
    // await ThreatLog.deleteMany({ 'request.ip': { $in: ipList } });

    await mongoose.disconnect();
}

runTest().catch((err) => {
    console.error("Errore durante il test:", err);
    process.exit(1);
});
