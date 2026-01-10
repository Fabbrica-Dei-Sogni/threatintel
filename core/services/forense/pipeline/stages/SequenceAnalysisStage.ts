import { PipelineStage } from '../PipelineStage';

/**
 * Stage di Analisi Sequenziale
 * 
 * Questo stage analizza l'ordine temporale degli eventi per identificare pattern comportamentali
 * che non emergono dai semplici contatori (come RPS).
 * 
 * Esempi di pattern rilevati:
 * - "Brute Force Success": Una serie di tentativi falliti (401/403) seguiti immediatamente da un successo (200).
 * - "Lateral Movement" (Placeholder): Pattern tipici di movimento laterale dopo un accesso iniziale.
 */
export class SequenceAnalysisStage implements PipelineStage {
    generate(): any[] {
        return [
            // 1. Ordinamento Temporale
            // Poiché l'array 'logsRaggruppati' potrebbe non essere strettamente ordinato temporalmente
            // dopo il raggruppamento (anche se MongoDB spesso preserva l'ordine), forziamo un sort.
            // Utilizziamo $function (Server-Side JS) per un sort efficiente in-memory dell'array annidato.
            {
                $addFields: {
                    logsSorted: {
                        $function: {
                            body: function (logs: any[]) {
                                if (!logs) return [];
                                // Sort classico JS basato sul timestamp
                                return logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                            },
                            args: ["$logsRaggruppati"],
                            lang: "js"
                        }
                    }
                }
            },
            // 2. Analisi della Sequenza con $reduce
            // $reduce ci permette di iterare sull'array ordinato mantenendo uno "stato" (value)
            // che si aggiorna passo dopo passo. È simile a array.reduce() in JS.
            {
                $addFields: {
                    sequenceAnalysis: {
                        $reduce: {
                            input: '$logsSorted',
                            initialValue: {
                                lastCode: 0,              // Stato codice risposta precedente
                                bruteForceSuccess: false, // Flag se abbiamo rilevato il pattern
                                lateralMovement: false    // Flag placeholder per pattern futuri
                            },
                            in: {
                                // Aggiorniamo 'lastCode' con il codice corrente per l'iterazione successiva
                                lastCode: { $toInt: { $ifNull: ['$$this.response.statusCode', 0] } },

                                // Logica di rilevamento pattern
                                bruteForceSuccess: {
                                    $or: [
                                        '$$value.bruteForceSuccess', // Mantiene true se già rilevato in precedenza
                                        {
                                            $and: [
                                                // Se il PRECEDENTE era un errore (401 o 403)
                                                { $in: ['$$value.lastCode', [401, 403]] },
                                                // E l'ATTUALE è un successo (200)
                                                { $eq: [{ $toInt: { $ifNull: ['$$this.response.statusCode', 0] } }, 200] }
                                            ]
                                        }
                                    ]
                                },
                                lateralMovement: '$$value.lateralMovement'
                            }
                        }
                    }
                }
            },
            // 3. Calcolo Punteggio di Rischio Sequenziale
            {
                $addFields: {
                    sequenceRiskScore: {
                        // Assegna 50 punti secchi se il pattern "Brute Force Success" è confermato.
                        // Questo è molto più gravoso di un semplice alto RPS.
                        $cond: ['$sequenceAnalysis.bruteForceSuccess', 50, 0]
                    }
                }
            },
            // 4. Pulizia
            // Rimuoviamo il campo temporaneo di log ordinati per non appesantire il documento finale
            {
                $project: {
                    logsSorted: 0
                }
            }
        ];
    }
}
