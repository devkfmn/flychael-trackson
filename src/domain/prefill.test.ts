import { describe, expect, it } from 'vitest';
import { computePrefill, type PrefillFlight } from './prefill';
import type { DefaultSetup } from '../types';

function f(
  dateISO: string,
  time: string,
  paragliderId: string,
  harnessId: string | null,
  takeoff: string,
  landing: string,
): PrefillFlight {
  return { dateISO, time, paragliderId, harnessId, takeoff, landing };
}

const homeDefaults: DefaultSetup = {
  paragliderId: 'w-home',
  harnessId: 'h-home',
  takeoff: 'Home',
  landing: 'Valley',
};

const noDefaults: DefaultSetup = {
  paragliderId: null,
  harnessId: null,
  takeoff: null,
  landing: null,
};

describe('computePrefill', () => {
  it('reuses the previous flight from the same day', () => {
    const flights = [
      f('2024-07-10', '10:00', 'w-a', 'h-a', 'SiteA', 'LandA'),
      f('2024-07-10', '12:30', 'w-b', 'h-b', 'SiteB', 'LandB'),
    ];
    const r = computePrefill(flights, '2024-07-10', homeDefaults);
    expect(r.primarySource).toBe('same-day');
    expect(r.paragliderId.value).toBe('w-b');
    expect(r.takeoff.value).toBe('SiteB');
  });

  it('uses the last flying day for the first flight of a new day', () => {
    const flights = [
      f('2024-07-05', '11:00', 'w-home', 'h-home', 'Home', 'Valley'),
      f('2024-07-10', '11:00', 'w-trip', 'h-trip', 'Alps', 'AlpVal'),
    ];
    const r = computePrefill(flights, '2024-07-12', homeDefaults);
    expect(r.primarySource).toBe('last-flying-day');
    expect(r.paragliderId.value).toBe('w-trip');
    expect(r.tripModeActive).toBe(false);
  });

  it('activates trip mode when two consecutive flying days use non-default gear/sites', () => {
    const flights = [
      f('2024-07-08', '11:00', 'w-trip', 'h-trip', 'Alps', 'AlpVal'),
      f('2024-07-10', '11:00', 'w-trip', 'h-trip', 'Alps', 'AlpVal'),
    ];
    const r = computePrefill(flights, '2024-07-12', homeDefaults);
    expect(r.tripModeActive).toBe(true);
    expect(r.primarySource).toBe('trip');
    expect(r.takeoff.value).toBe('Alps');
  });

  it('falls back to user defaults when there is no history', () => {
    const r = computePrefill([], '2024-07-12', homeDefaults);
    expect(r.primarySource).toBe('default');
    expect(r.paragliderId.value).toBe('w-home');
    expect(r.landing.value).toBe('Valley');
  });

  it('reports no suggestion when there is no history and no defaults', () => {
    const r = computePrefill([], '2024-07-12', noDefaults);
    expect(r.primarySource).toBe('none');
    expect(r.paragliderId.value).toBeNull();
    expect(r.tripModeActive).toBe(false);
  });

  it('fills individual fields from defaults when the source lacks them', () => {
    const flights = [
      f('2024-07-10', '10:00', 'w-x', null, 'SiteX', 'LandX'),
    ];
    const r = computePrefill(flights, '2024-07-10', homeDefaults);
    expect(r.paragliderId.source).toBe('same-day');
    expect(r.paragliderId.value).toBe('w-x');
    expect(r.harnessId.source).toBe('default');
    expect(r.harnessId.value).toBe('h-home');
  });

  it('does not trip when the second-to-last day matches defaults', () => {
    const flights = [
      f('2024-07-05', '11:00', 'w-home', 'h-home', 'Home', 'Valley'),
      f('2024-07-10', '11:00', 'w-trip', 'h-trip', 'Alps', 'AlpVal'),
    ];
    const r = computePrefill(flights, '2024-07-11', homeDefaults);
    expect(r.tripModeActive).toBe(false);
    expect(r.primarySource).toBe('last-flying-day');
  });
});
