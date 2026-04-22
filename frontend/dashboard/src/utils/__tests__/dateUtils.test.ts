import { describe, it, expect } from 'vitest';
import { formatHumanDuration, formatDateTime, formatDateOnly } from '../dateUtils';

describe('dateUtils', () => {
  describe('formatHumanDuration', () => {
    it('should format seconds correctly', () => {
      expect(formatHumanDuration(45)).toBe('45s');
    });

    it('should format minutes and seconds correctly', () => {
      expect(formatHumanDuration(125)).toBe('2m 5s');
    });

    it('should format hours and minutes correctly', () => {
      expect(formatHumanDuration(3660)).toBe('1h 1m');
    });

    it('should format days and hours correctly', () => {
      expect(formatHumanDuration(90000)).toBe('1d 1h');
    });

    it('should return 0s for negative values', () => {
      expect(formatHumanDuration(-10)).toBe('0s');
    });
  });

  describe('formatDateTime', () => {
    it('should return - if date is missing', () => {
      expect(formatDateTime('')).toBe('-');
    });

    it('should format date correctly', () => {
      // Nota: usiamo date fisse per evitare problemi di anno corrente nei test se necessario, 
      // ma dateUtils gestisce l'anno corrente dinamicamente.
      const date = new Date(2026, 3, 22, 10, 30, 0); // 22 Aprile 2026
      const formatted = formatDateTime(date);
      expect(formatted).toContain('22/04');
      expect(formatted).toContain('10:30:00');
    });
  });

  describe('formatDateOnly', () => {
    it('should return - if date is missing', () => {
      expect(formatDateOnly('')).toBe('-');
    });
  });
});
