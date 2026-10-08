import { describe, expect, it } from 'vitest';
import { equipmentFromDoc, expenseFromDoc, flightFromDoc, settingsFromDoc } from './serialize';

describe('flightFromDoc', () => {
  it('maps stored fields the UI writes, including Timestamp createdAt', () => {
    const flight = flightFromDoc('abc', {
      dateISO: '2026-10-08',
      time: '10:15',
      takeoff: 'Fiesch',
      landing: 'Fiescheralp',
      paragliderId: 'wing1',
      harnessId: null,
      airtimeMinutes: 42,
      comments: 'thermals',
      distanceKm: 12.5,
      altitudeGainM: 800,
      track: { points: 10, maxAltitudeM: 2400, durationMinutes: 42 },
      igc: { filename: 'x.igc', importedAt: { seconds: 1, nanoseconds: 0 } },
      source: 'igc',
      createdAt: { seconds: 10, nanoseconds: 0 },
      updatedAt: 99,
    });
    expect(flight).toMatchObject({
      id: 'abc',
      dateISO: '2026-10-08',
      time: '10:15',
      takeoff: 'Fiesch',
      landing: 'Fiescheralp',
      paragliderId: 'wing1',
      harnessId: null,
      airtimeMinutes: 42,
      source: 'igc',
      createdAt: 10_000,
      updatedAt: 99,
    });
    expect(flight.igc?.importedAt).toBe(1000);
  });
});

describe('equipmentFromDoc', () => {
  it('defaults status/type and preserves prices as numbers', () => {
    const eq = equipmentFromDoc('e1', {
      producer: 'Ozone',
      model: 'Photon',
      purchasePrice: 4200,
      salePrice: null,
    });
    expect(eq.type).toBe('other');
    expect(eq.status).toBe('active');
    expect(eq.purchasePrice).toBe(4200);
    expect(eq.legacyId).toBeNull();
  });
});

describe('expenseFromDoc', () => {
  it('maps amount/currency/dateISO/category', () => {
    const e = expenseFromDoc('x', {
      amount: 80,
      currency: 'CHF',
      dateISO: '2026-01-02',
      category: 'repair',
      equipmentId: 'e1',
      notes: 'lines',
      createdAt: 5,
    });
    expect(e).toEqual({
      id: 'x',
      amount: 80,
      currency: 'CHF',
      dateISO: '2026-01-02',
      category: 'repair',
      equipmentId: 'e1',
      notes: 'lines',
      createdAt: 5,
    });
  });
});

describe('settingsFromDoc', () => {
  it('fills defaults and folds legacy wingHarness', () => {
    const s = settingsFromDoc({
      pilot: { name: 'Andreas' },
      maintenanceDefaults: { wingHarness: { months: 12, flights: 80, hours: 90 } },
    });
    expect(s.pilot.name).toBe('Andreas');
    expect(s.currency).toBe('CHF');
    expect(s.maintenanceDefaults.wing.months).toBe(12);
    expect(s.maintenanceDefaults.harness.hours).toBe(90);
    expect(s.maintenanceDefaults.reserve.months).toBe(12);
  });
});
