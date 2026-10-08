import { describe, expect, it } from 'vitest';
import {
  addMonthsISO,
  daysBetween,
  formatSwissDate,
  monthsBetween,
  parseSwissDate,
  parseSwissDateTime,
  todayISOInTimeZone,
} from './dates';

describe('parseSwissDate', () => {
  it('parses dd.MM.yyyy', () => {
    expect(parseSwissDate('23.10.2021')).toBe('2021-10-23');
  });

  it('parses single-digit day/month', () => {
    expect(parseSwissDate('1.7.2023')).toBe('2023-07-01');
  });

  it('trims surrounding whitespace', () => {
    expect(parseSwissDate('  05.03.2024 ')).toBe('2024-03-05');
  });

  it('returns null for empty/blank/invalid input', () => {
    expect(parseSwissDate('')).toBeNull();
    expect(parseSwissDate('   ')).toBeNull();
    expect(parseSwissDate(null)).toBeNull();
    expect(parseSwissDate(undefined)).toBeNull();
    expect(parseSwissDate('2021-10-23')).toBeNull();
    expect(parseSwissDate('32.01.2020')).toBeNull();
    expect(parseSwissDate('29.02.2021')).toBeNull(); // not a leap year
  });

  it('accepts a valid leap day', () => {
    expect(parseSwissDate('29.02.2024')).toBe('2024-02-29');
  });
});

describe('parseSwissDateTime', () => {
  it('parses dd.MM.yyyy HH:mm', () => {
    expect(parseSwissDateTime('17.09.2021 10:00')).toEqual({
      dateISO: '2021-09-17',
      time: '10:00',
    });
  });

  it('zero-pads the time', () => {
    expect(parseSwissDateTime('2.10.2025 9:05')).toEqual({
      dateISO: '2025-10-02',
      time: '09:05',
    });
  });

  it('rejects invalid time or date', () => {
    expect(parseSwissDateTime('17.09.2021 25:00')).toBeNull();
    expect(parseSwissDateTime('17.09.2021')).toBeNull();
    expect(parseSwissDateTime('')).toBeNull();
  });
});

describe('formatSwissDate', () => {
  it('formats ISO back to Swiss', () => {
    expect(formatSwissDate('2021-10-23')).toBe('23.10.2021');
    expect(formatSwissDate('')).toBe('');
    expect(formatSwissDate(null)).toBe('');
  });
});

describe('date math', () => {
  it('counts whole months', () => {
    expect(monthsBetween('2022-01-15', '2024-01-15')).toBe(24);
    expect(monthsBetween('2022-01-15', '2024-01-14')).toBe(23);
    expect(monthsBetween('2023-01-01', '2023-03-01')).toBe(2);
  });

  it('counts days', () => {
    expect(daysBetween('2024-01-01', '2024-01-31')).toBe(30);
    expect(daysBetween('2024-02-01', '2024-01-31')).toBe(-1);
  });

  it('adds months across year boundaries', () => {
    expect(addMonthsISO('2023-11-15', 12)).toBe('2024-11-15');
    expect(addMonthsISO('2024-01-31', 1)).toBe('2024-03-02'); // JS overflow
  });
});

describe('todayISOInTimeZone', () => {
  it('uses Europe/Zurich calendar date around a UTC midnight that is still the previous evening in Zurich', () => {
    // 2026-03-08 00:30 UTC is 2026-03-08 01:30 in Zurich (CET, UTC+1).
    expect(todayISOInTimeZone('Europe/Zurich', new Date('2026-03-08T00:30:00Z'))).toBe(
      '2026-03-08',
    );
    // 2026-03-07 23:30 UTC is 2026-03-08 00:30 in Zurich.
    expect(todayISOInTimeZone('Europe/Zurich', new Date('2026-03-07T23:30:00Z'))).toBe(
      '2026-03-08',
    );
  });
});
