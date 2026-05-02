/**
 * Configurazione temporale standard per i filtri e le aggregazioni forensi.
 */
export interface TimeConfig {
    timeMode?: 'ago' | 'range';
    agoUnit?: string;
    agoValue?: number;
    startTime?: string;
    endTime?: string;
    // Supporto per formati legacy usati nei test o pipeline vecchie
    minutes?: number;
    hours?: number;
    days?: number;
}
