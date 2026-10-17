import { describe, expect, it } from 'vitest';
import {
  computePrefill,
  resolvePrefillGearField,
  type PrefillFlight,
} from './prefill';
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

  it('treats empty strings as missing and falls back to defaults', () => {
    const flights = [
      f('2024-07-10', '10:00', '', '', '', 'LandX'),
    ];
    const r = computePrefill(flights, '2024-07-10', homeDefaults);
    expect(r.primarySource).toBe('same-day');
    expect(r.paragliderId).toEqual({ value: 'w-home', source: 'default' });
    expect(r.harnessId).toEqual({ value: 'h-home', source: 'default' });
    expect(r.takeoff).toEqual({ value: 'Home', source: 'default' });
    expect(r.landing).toEqual({ value: 'LandX', source: 'same-day' });
  });
});

describe('resolvePrefillGearField', () => {
  it('keeps a prefilled id that is still selectable', () => {
    const field = resolvePrefillGearField(
      { value: 'w-trip', source: 'last-flying-day' },
      'w-home',
      ['w-trip', 'w-home'],
    );
    expect(field).toEqual({ value: 'w-trip', source: 'last-flying-day' });
  });

  it('falls back to the default when the prefilled id is not in options', () => {
    const field = resolvePrefillGearField(
      { value: 'w-sold', source: 'same-day' },
      'w-home',
      ['w-home', 'w-other'],
    );
    expect(field).toEqual({ value: 'w-home', source: 'default' });
  });

  it('treats an empty prefilled id as missing', () => {
    const field = resolvePrefillGearField(
      { value: '', source: 'same-day' },
      'w-home',
      ['w-home'],
    );
    expect(field).toEqual({ value: 'w-home', source: 'default' });
  });

  it('clears the field when neither preferred nor default is selectable', () => {
    const field = resolvePrefillGearField(
      { value: 'w-gone', source: 'trip' },
      'w-also-gone',
      ['w-other'],
    );
    expect(field).toEqual({ value: null, source: 'none' });
  });
});
