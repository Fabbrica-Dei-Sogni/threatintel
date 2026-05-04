/**
 * ThreatIntel - Reference Implementation Dashboard
 * 
 * This file is part of the reference frontend implementation of the 
 * ThreatIntel Distributed Forensics Engine.
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Production or commercial use of this specific interface requires 
 * a valid commercial license from the author.
 */

import { describe, it, expect } from 'vitest';
import { 
    formatHumanDuration, 
    formatDateTime, 
    formatDateOnly, 
    formatTimeOnly, 
    formatFullDateTime 
} from '../dateUtils';
import dayjs from 'dayjs';

describe('dateUtils', () => {
  describe('formatHumanDuration', () => {
    it('should format seconds correctly', () => {
      expect(formatHumanDuration(45)).toBe('45s');
      expect(formatHumanDuration(-5)).toBe('0s');
    });

    it('should format minutes and seconds correctly', () => {
      expect(formatHumanDuration(60)).toBe('1m');
      expect(formatHumanDuration(75)).toBe('1m 15s');
      expect(formatHumanDuration(3599)).toBe('59m 59s');
    });

    it('should format hours and minutes correctly', () => {
      expect(formatHumanDuration(3600)).toBe('1h');
      expect(formatHumanDuration(3660)).toBe('1h 1m');
      expect(formatHumanDuration(86399)).toBe('23h 59m');
    });

    it('should format days and hours correctly', () => {
      expect(formatHumanDuration(86400)).toBe('1d');
      expect(formatHumanDuration(90000)).toBe('1d 1h');
    });

    it('should use translation function if provided', () => {
      const t = (key: string) => key === 'common.duration.seconds' ? ' sec' : '';
      expect(formatHumanDuration(10, t as any)).toBe('10 sec');
    });
  });

  describe('formatDateTime', () => {
    it('should return - for empty date', () => {
        expect(formatDateTime('')).toBe('-');
    });

    it('should format current year date without year', () => {
        const now = dayjs();
        const date = now.set('month', 0).set('date', 1); // Jan 1st current year
        const result = formatDateTime(date.toDate());
        expect(result).toContain('01/01');
        expect(result).not.toContain(now.year().toString());
    });

    it('should format different year date with year', () => {
        const pastDate = dayjs().subtract(2, 'year');
        const result = formatDateTime(pastDate.toDate());
        expect(result).toContain(pastDate.year().toString());
    });
  });

  describe('formatDateOnly', () => {
    it('should return - for empty date', () => {
        expect(formatDateOnly('')).toBe('-');
    });

    it('should format date with or without year', () => {
        const now = dayjs();
        expect(formatDateOnly(now.toDate())).toBe(now.format('DD/MM'));
        
        const pastDate = dayjs().subtract(2, 'year');
        expect(formatDateOnly(pastDate.toDate())).toBe(pastDate.format('DD/MM/YYYY'));
    });
  });

  describe('formatTimeOnly', () => {
    it('should return - for empty date', () => {
        expect(formatTimeOnly('')).toBe('-');
    });

    it('should format time correctly', () => {
        const date = new Date(2023, 0, 1, 10, 45, 0);
        expect(formatTimeOnly(date)).toBe('10:45:00');
    });
  });

  describe('formatFullDateTime', () => {
    it('should return - for empty date', () => {
        expect(formatFullDateTime('')).toBe('-');
    });

    it('should format full date time correctly', () => {
        const date = new Date(2023, 0, 1, 10, 45, 0);
        expect(formatFullDateTime(date)).toBe('01/01/2023 10:45:00');
    });
  });
});
