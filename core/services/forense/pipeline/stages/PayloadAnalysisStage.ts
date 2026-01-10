import { PipelineStage } from '../PipelineStage';

/**
 * Stage di Analisi Payload
 * 
 * Questo stage ispeziona il contenuto delle richieste (URL e Body) alla ricerca di 
 * Indicatori di Compromissione (IoC) noti o pattern sospetti.
 * 
 * Obiettivo: Rilevare tentativi di injection, file inclusion, o esecuzione comandi
 * indipendentemente dalla frequenza delle chiamate.
 */
export class PayloadAnalysisStage implements PipelineStage {
    constructor(private readonly suspiciousPatterns: string[]) { }

    generate(): any[] {
        // Fallback default patterns se la config è vuota
        const defaultPatterns = ['/etc/passwd', '/bin/sh', 'cmd.exe', 'whoami', 'wget ', 'curl ', 'chmod ', 'eval\\(', 'union select', 'alert\\('];
        const patternsToUse = this.suspiciousPatterns.length > 0 ? this.suspiciousPatterns : defaultPatterns;
        const regexPattern = '(' + patternsToUse.join('|') + ')';

        return [
            {
                $addFields: {
                    payloadAnalysis: {
                        $let: {
                            vars: {
                                // 1. Preparazione del Contenuto
                                // Creiamo un array di stringhe "searchable" concatenando URL e Body per ogni log.
                                // Questo ci permette di cercare pattern in entrambi i punti in una sola passata.
                                allContent: {
                                    $map: {
                                        input: '$logsRaggruppati',
                                        as: 'log',
                                        in: {
                                            $concat: [
                                                { $ifNull: ['$$log.request.url', ''] },
                                                ' ', // Spazio separatore
                                                {
                                                    // Gestiamo il body solo se è una stringa (evita errori su JSON object)
                                                    $cond: [
                                                        { $eq: [{ $type: '$$log.request.body' }, 'string'] },
                                                        { $ifNull: ['$$log.request.body', ''] },
                                                        ''
                                                    ]
                                                }
                                            ]
                                        }
                                    }
                                }
                            },
                            in: {
                                // 2. Filtraggio High Risk
                                // Restituisce solo le stringhe che matchano la regex di pericolo.
                                highRiskMatches: {
                                    $filter: {
                                        input: '$$allContent',
                                        as: 'content',
                                        cond: {
                                            $regexMatch: {
                                                input: { $toLower: '$$content' }, // Case-insensitive
                                                regex: regexPattern
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    // 3. Scoring
                    // Se troviamo ALMENO UN match ad alto rischio, assegniamo 30 punti.
                    payloadRiskScore: {
                        $cond: [
                            { $gt: [{ $size: '$payloadAnalysis.highRiskMatches' }, 0] },
                            30, // +30 points if RCE/LFI/XSS patterns found
                            0
                        ]
                    }
                }
            }
        ];
    }
}
