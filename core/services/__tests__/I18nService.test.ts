import 'reflect-metadata';
import { container } from 'tsyringe';
import { I18nService } from '../I18nService';
import { LOGGER_TOKEN } from '../../di/tokens';
import { Logger } from 'winston';

describe('I18nService', () => {
    let i18nService: I18nService;
    let mockLogger: Partial<Logger>;

    beforeEach(() => {
        container.reset();
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };
        container.registerInstance(LOGGER_TOKEN, mockLogger as Logger);
        i18nService = container.resolve(I18nService);
    });

    it('should load locales correctly', () => {
        // Verifica che il servizio sia stato istanziato e abbia caricato i file
        expect(i18nService).toBeDefined();
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Caricati'));
    });

    it('should translate a simple key', () => {
        const translation = i18nService.t('reports.common.agencyName', 'it-IT');
        expect(translation).toBe('ThreatIntelligence Agency');
    });

    it('should translate a nested key', () => {
        const translation = i18nService.t('reports.attackDetail.summaryTitle', 'it-IT');
        expect(translation).toBe('1. Sintesi Esecutiva dell\'Attacco');
    });

    it('should fallback to default locale if key is missing in requested locale', () => {
        // Usiamo un locale che esiste ma forziamo una chiave che potrebbe non esserci (simulato)
        // In questo caso, essendo i file completi, testiamo il fallback su un locale inesistente
        const translation = i18nService.t('reports.common.agencyName', 'non-existent');
        expect(translation).toBe('ThreatIntelligence Agency');
    });

    it('should interpolate parameters', () => {
        const translation = i18nService.t('reports.attackDetail.timelineNote', 'it-IT', { count: 42 });
        expect(translation).toContain('42');
        expect(translation).toBe('Nota: L\'estratto mostra i primi 20 eventi di 42 totali.');
    });

    it('should return the key if translation is missing in both requested and default locale', () => {
        const translation = i18nService.t('missing.key', 'it-IT');
        expect(translation).toBe('missing.key');
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('missing.key'));
    });

    it('should handle different locales', () => {
        const it = i18nService.t('reports.common.generatedAt', 'it-IT');
        const en = i18nService.t('reports.common.generatedAt', 'en-US');
        const de = i18nService.t('reports.common.generatedAt', 'de-DE');
        
        expect(it).toBe('Data Documento');
        expect(en).toBe('Document Date');
        expect(de).toBe('Dokumentdatum');
    });
});
