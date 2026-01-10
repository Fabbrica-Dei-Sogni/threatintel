import { PipelineStage } from '../PipelineStage';

/**
 * Stage di Analisi Fingerprint
 * 
 * Questo stage cerca di identificare la "firma" dello strumento utilizzato dall'attaccante.
 * Spesso gli attaccanti (specialmente botnet e scanner automatici) non cambiano lo User-Agent 
 * o usano tool noti con firme riconoscibili.
 */
export class FingerprintAnalysisStage implements PipelineStage {
    constructor(private readonly suspiciousSignatures: string[]) { }

    generate(): any[] {
        // Fallback default signatures
        const defaultSignatures = ['curl', 'wget', 'python', 'masscan', 'zgrab', 'nmap', 'sqlmap', 'nikto', 'gobuster'];
        const signaturesToUse = this.suspiciousSignatures.length > 0 ? this.suspiciousSignatures : defaultSignatures;
        const regexPattern = '(' + signaturesToUse.join('|') + ')';

        return [
            {
                $addFields: {
                    fingerprintAnalysis: {
                        $let: {
                            vars: {
                                // 1. Estrazione User-Agents Unici
                                // Utilizziamo $map per estrarre tutti gli UA e $setUnion per rimuovere i duplicati.
                                // Un attaccante umano potrebbe avere 1-2 UA, una botnet coordinata male potrebbe averne molti,
                                // o uno scanner specifico ne avrà esattamente 1.
                                uniqueUserAgents: {
                                    $setUnion: [
                                        {
                                            $map: {
                                                input: '$logsRaggruppati',
                                                as: 'log',
                                                in: { $ifNull: ['$$log.request.headers.user-agent', 'unknown'] }
                                            }
                                        },
                                        [] // $setUnion richiede array di arrays
                                    ]
                                }
                            },
                            in: {
                                userAgentCount: { $size: '$$uniqueUserAgents' },
                                userAgents: '$$uniqueUserAgents',
                                // 2. Rilevamento Tool Noti
                                // Controlliamo se tra gli UA unici ce n'è qualcuno che matcha tool di hacking famosi.
                                isTool: {
                                    $gt: [
                                        {
                                            $size: {
                                                $filter: {
                                                    input: '$$uniqueUserAgents',
                                                    as: 'ua',
                                                    cond: {
                                                        $regexMatch: {
                                                            input: { $toLower: '$$ua' },
                                                            regex: regexPattern
                                                        }
                                                    }
                                                }
                                            }
                                        },
                                        0
                                    ]
                                }
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    // 3. Scoring
                    // Assegna 20 punti se viene identificato un tool di scansione automatico.
                    toolRiskScore: {
                        $cond: ['$fingerprintAnalysis.isTool', 20, 0]
                    }
                }
            }
        ];
    }
}
