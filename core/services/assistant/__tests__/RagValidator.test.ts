import { RagValidator } from '../RagValidator';

describe('RagValidator', () => {
    describe('validateSearchOptions', () => {
        it('should validate correctly with valid options', () => {
            const options = { limit: 10, scoreThreshold: 0.7, type: 'threat_log' as any };
            const result = RagValidator.validateSearchOptions(options);
            expect(result.valid).toBe(true);
        });

        it('should return error for invalid limit', () => {
            const result = RagValidator.validateSearchOptions({ limit: 0 });
            expect(result.valid).toBe(false);
            expect(result.error).toContain('compreso tra 1 e 50');

            const result2 = RagValidator.validateSearchOptions({ limit: 51 });
            expect(result2.valid).toBe(false);
            expect(result2.error).toContain('compreso tra 1 e 50');
        });

        it('should return error for invalid scoreThreshold', () => {
            const result = RagValidator.validateSearchOptions({ scoreThreshold: -0.1 });
            expect(result.valid).toBe(false);
            expect(result.error).toContain('compreso tra 0 e 1');

            const result2 = RagValidator.validateSearchOptions({ scoreThreshold: 1.1 });
            expect(result2.valid).toBe(false);
            expect(result2.error).toContain('compreso tra 0 e 1');
        });

        it('should return error for unsupported type', () => {
            const result = RagValidator.validateSearchOptions({ type: 'invalid_type' as any });
            expect(result.valid).toBe(false);
            expect(result.error).toContain('non supportato');
        });
    });

    describe('validateSourceRef', () => {
        it('should validate a valid log sourceRef', () => {
            const ref = { params: { type: 'log', id: '123' } };
            expect(RagValidator.validateSourceRef(ref).valid).toBe(true);
        });

        it('should validate a valid attack sourceRef', () => {
            const ref = { 
                params: { 
                    type: 'attack', 
                    ip: '1.1.1.1', 
                    minLogsForAttack: 5, 
                    timeConfig: { timeMode: 'ago' } 
                } 
            };
            expect(RagValidator.validateSourceRef(ref).valid).toBe(true);
        });

        it('should fail if params are missing', () => {
            const result = RagValidator.validateSourceRef({} as any);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('params è obbligatorio');
        });

        it('should fail for invalid type', () => {
            const result = RagValidator.validateSourceRef({ params: { type: 'unknown' } });
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Tipo di sorgente non valido');
        });

        it('should fail if required fields for type are missing (e.g. hash for campaign)', () => {
            const result = RagValidator.validateSourceRef({ params: { type: 'campaign' } });
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Hash campagna mancante');
        });
    });
});
