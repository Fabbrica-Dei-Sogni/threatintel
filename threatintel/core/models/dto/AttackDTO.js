/**
 * AttackDTO - Modello di risposta aggregazione "attack"
 *
 * Questo oggetto rappresenta la forma finale del JSON restituito
 * dalla pipeline MongoDB definita. Puoi aggiornarlo ogni volta che 
 * aggiungi/togli campi dalla pipeline.
 */
const AttackDTO = {
    // ---------------------
    // Campi originali da "representative" (log rappresentativo)
    _id: "string", // ObjectId come stringa
    timestamp: "ISODate (string/number)",
    request: {
        ip: "string",
        url: "string",
        method: "string",
        headers: "object",
        body: "object",
        // …altri campi log, se presenti
    },
    response: {
        statusCode: 200,
        body: "object",
        // …
    },
    fingerprint: {
        score: 99,
        reasons: ["string"],
        riskLevel: "low|medium|high|critical",
        indicators: ["string"]
    },
    geoInfo: {
        // dettaglio geo o country, region, ...
    },
    // … altri campi originari del log se previsti
    // ---------------------

    // Campi AGGREGATI e AGGIUNTI dalla pipeline

    logsRaggruppati: [
        { /* shape come il modello di log, ma versione breve o completa */ }
    ],

    totaleLogs: 0,                          // integer, totale dei log
    firstSeen: "ISODate (string/number)",   // primo timestamp sodisfatto del gruppo
    lastSeen: "ISODate (string/number)",   // ultimo timestamp del gruppo

    durataAttacco: {
        ms: 0,
        minutes: 0,
        human: "string" // "30ms", "4 min", "1h 5m" ecc...
    },

    averageScore: 0.0,                      // float
    countRateLimit: 0,                      // integer, numero eventi ratelimit
    rateLimitList: [
        {
            // struttura analogica a quella degli eventi di ratelimit
            ip: "string",
            // ...
            timestamp: "ISODate (string/number)"
        }
    ],

    attackPatterns: [
        "string" // lista pattern aggregati dagli indicators
    ],

    rps: 0.0,                               // float, richieste per secondo
    rpsStyle: "sporadico|basso|moderato|alto|elevato", // categorizzazione testuale

    attackDurationMinutes: 0.0,             // durata in minuti (float)
    intensityAttack:
        "burst lampo|persistente basso|persistente medio|persistente alto|burst prolungato|scansione micro burst basso|scansione micro burst moderato|scansione micro burst intenso|estremo|basso impatto|altro", // etichetta testuale

    intensityWeight: 0.0,
    rpsNorm: 0.0,
    durNorm: 0.0,
    scoreNorm: 0.0,
    durDecay: 0.0,
    durNormPenalized: 0.0,

    dangerScore: 0.0,                       // punteggio "pericolosità" numerico
    dangerLevel: "Defcon 1|Defcon 2|Defcon 3|Defcon 4|Defcon 5",
};

module.exports = AttackDTO;
