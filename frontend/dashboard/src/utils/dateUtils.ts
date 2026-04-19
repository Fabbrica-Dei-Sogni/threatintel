import dayjs from 'dayjs';

/**
 * Formats a duration in seconds into a human-readable string.
 * Examples: "45s", "2m 15s", "3h 20m", "1d 4h"
 */
export function formatHumanDuration(seconds: number, t?: (key: string) => string): string {
  const s = t ? t('common.duration.seconds') : 's';
  const m = t ? t('common.duration.minutes') : 'm';
  const h = t ? t('common.duration.hours') : 'h';
  const d = t ? t('common.duration.days') : 'd';

  if (seconds < 0) return `0${s}`;
  if (seconds < 60) return `${Math.floor(seconds)}${s}`;
  
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return remainingSeconds > 0 ? `${minutes}${m} ${remainingSeconds}${s}` : `${minutes}${m}`;
  }
  
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    return remainingMinutes > 0 ? `${hours}${h} ${remainingMinutes}${m}` : `${hours}${h}`;
  }
  
  const days = Math.floor(seconds / 86400);
  const remainingHours = Math.floor((seconds % 86400) / 3600);
  return remainingHours > 0 ? `${days}${d} ${remainingHours}${h}` : `${days}${d}`;
}

/**
 * Formats a timestamp into a combined date and time string.
 * Example: "19/04 10:45:00"
 */
export function formatDateTime(date: string | Date | number): string {
  if (!date) return '-';
  const d = dayjs(date);
  const now = dayjs();
  if (d.year() !== now.year()) {
    return d.format('DD/MM/YYYY HH:mm:ss');
  }
  return d.format('DD/MM HH:mm:ss');
}

/**
 * Formats a timestamp into only a date string.
 * Example: "19/04" or "19/04/2026"
 */
export function formatDateOnly(date: string | Date | number): string {
  if (!date) return '-';
  const d = dayjs(date);
  const now = dayjs();
  return d.year() !== now.year() ? d.format('DD/MM/YYYY') : d.format('DD/MM');
}

/**
 * Formats a timestamp into only a time string.
 * Example: "10:45:00"
 */
export function formatTimeOnly(date: string | Date | number): string {
  if (!date) return '-';
  return dayjs(date).format('HH:mm:ss');
}

/**
 * Formats a timestamp into a full date and time string.
 * Example: "19/04/2026 10:45:00"
 */
export function formatFullDateTime(date: string | Date | number): string {
  if (!date) return '-';
  return dayjs(date).format('DD/MM/YYYY HH:mm:ss');
}
