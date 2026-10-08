import { describe, expect, it } from 'vitest';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DEFAULT_SETTINGS, type Equipment, type Flight } from '../types';
import { computeDashboard } from '../domain/analytics';
import { createHandlers } from './handlers';
import { createMemoryStore } from './store';

const NOW = new Date('2026-10-08T12:00:00Z');

function textOf(result: CallToolResult): string {
  const part = result.content[0];
  if (part.type !== 'text') throw new Error('expected text content');
  return part.text;
}

async function call(
  handler: (args: unknown) => Promise<CallToolResult>,
  args: unknown = {},
) {
  const result = await handler(args);
  const text = textOf(result);
  return {
    isError: Boolean(result.isError),
    text,
    data: result.isError ? null : (JSON.parse(text) as unknown),
  };
}

function wing(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: 'wing1',
    type: 'paraglider',
    producer: 'Ozone',
    model: 'Photon',
    size: 'MS',
    owner: null,
    serialNumber: 'SN1',
    manufactureDateISO: '2022-01-01',
    purchaseDateISO: '2022-03-01',
    saleDateISO: null,
    purchasePrice: 4000,
    salePrice: null,
    notes: null,
    status: 'active',
    lastCheckDateISO: '2025-01-01',
    maintenanceRule: null,
    legacyId: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function harness(overrides: Partial<Equipment> = {}): Equipment {
  return {
    ...wing({ id: 'harness1', type: 'harness', producer: 'Advance', model: 'Lightness', size: 'M', purchasePrice: 1500 }),
    ...overrides,
  };
}

function flight(overrides: Partial<Flight> = {}): Flight {
  return {
    id: 'f1',
    dateISO: '2026-10-01',
    time: '11:00',
    takeoff: 'Fiesch',
    landing: 'Fiescheralp',
    paragliderId: 'wing1',
    harnessId: 'harness1',
    airtimeMinutes: 90,
    comments: null,
    distanceKm: 20,
    altitudeGainM: 1000,
    track: null,
    igc: null,
    source: 'manual',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function handlers(seed?: Parameters<typeof createMemoryStore>[0]) {
  const store = createMemoryStore({
    equipment: [wing(), harness()],
    settings: {
      ...DEFAULT_SETTINGS,
      defaults: {
        paragliderId: 'wing1',
        harnessId: 'harness1',
        takeoff: 'Fiesch',
        landing: 'Fiescheralp',
      },
      currency: 'CHF',
    },
    ...seed,
  });
  return { store, h: createHandlers({ store, now: () => NOW }) };
}

describe('create_flight', () => {
  it('writes the same StoredFlight fields as the Add Flight UI', async () => {
    const { h } = handlers();
    const { data, isError } = await call(h.create_flight, {
      airtimeMinutes: 55,
      comments: 'soaring',
      distanceKm: 8,
    });
    expect(isError).toBe(false);
    expect(data).toMatchObject({
      dateISO: '2026-10-08',
      time: null,
      takeoff: 'Fiesch',
      landing: 'Fiescheralp',
      paragliderId: 'wing1',
      harnessId: 'harness1',
      airtimeMinutes: 55,
      comments: 'soaring',
      distanceKm: 8,
      altitudeGainM: null,
      track: null,
      igc: null,
      source: 'manual',
      createdAt: NOW.getTime(),
      updatedAt: NOW.getTime(),
    });
  });

  it('rejects unknown paraglider ids with valid options', async () => {
    const { h } = handlers();
    const { isError, text } = await call(h.create_flight, {
      airtimeMinutes: 10,
      takeoff: 'X',
      landing: 'Y',
      paragliderId: 'nope',
    });
    expect(isError).toBe(true);
    expect(text).toMatch(/Unknown paragliderId/);
    expect(text).toMatch(/wing1/);
    expect(text).toMatch(/Photon/);
  });

  it('rejects sold gear on create', async () => {
    const { h } = handlers({
      equipment: [wing({ status: 'sold' }), harness()],
    });
    const { isError, text } = await call(h.create_flight, {
      airtimeMinutes: 10,
      takeoff: 'X',
      landing: 'Y',
      paragliderId: 'wing1',
    });
    expect(isError).toBe(true);
    expect(text).toMatch(/sold/);
  });
});

describe('list_flights', () => {
  it('filters by date range and paginates newest first', async () => {
    const { h } = handlers({
      flights: [
        flight({ id: 'a', dateISO: '2026-01-01', time: '10:00' }),
        flight({ id: 'b', dateISO: '2026-06-01', time: '09:00' }),
        flight({ id: 'c', dateISO: '2026-06-01', time: '15:00' }),
      ],
    });
    const { data } = await call(h.list_flights, {
      date_from: '2026-06-01',
      date_to: '2026-12-31',
      limit: 1,
    });
    const page = data as { items: Flight[]; total: number; offset: number };
    expect(page.total).toBe(2);
    expect(page.items).toHaveLength(1);
    expect(page.items[0].id).toBe('c');
  });
});

describe('delete_flight', () => {
  it('previews without confirm and deletes with confirm: true', async () => {
    const { h, store } = handlers({ flights: [flight()] });
    const preview = await call(h.delete_flight, { id: 'f1' });
    expect(preview.isError).toBe(false);
    expect(preview.data).toMatchObject({ confirm_required: true });
    expect(await store.getFlight('f1')).not.toBeNull();

    const done = await call(h.delete_flight, { id: 'f1', confirm: true });
    expect(done.data).toEqual({ deleted: true, id: 'f1' });
    expect(await store.getFlight('f1')).toBeNull();
  });
});

describe('equipment CRUD', () => {
  it('creates with UI defaults and transitions status', async () => {
    const { h } = handlers({ equipment: [] });
    const created = await call(h.create_equipment, {
      type: 'reserve',
      producer: 'Advance',
      model: 'SQ',
    });
    expect(created.isError).toBe(false);
    expect(created.data).toMatchObject({
      type: 'reserve',
      producer: 'Advance',
      model: 'SQ',
      status: 'active',
      size: null,
      purchasePrice: null,
      maintenanceRule: null,
      legacyId: null,
    });
    const id = (created.data as Equipment).id;
    const updated = await call(h.update_equipment, { id, status: 'borrowed' });
    expect(updated.data).toMatchObject({ status: 'borrowed' });
  });

  it('lists invalid type with allowed values', async () => {
    const { h } = handlers();
    const { isError, text } = await call(h.list_equipment, { type: 'wing' });
    expect(isError).toBe(true);
    expect(text).toMatch(/paraglider/);
    expect(text).toMatch(/harness/);
  });
});

describe('expenses', () => {
  it('defaults currency, date, category like the Expenses form', async () => {
    const { h } = handlers();
    const { data } = await call(h.create_expense, { amount: 35 });
    expect(data).toMatchObject({
      amount: 35,
      currency: 'CHF',
      dateISO: '2026-10-08',
      category: 'gear',
      equipmentId: null,
      notes: null,
      createdAt: NOW.getTime(),
    });
  });

  it('rejects negative amounts', async () => {
    const { h } = handlers();
    const { isError, text } = await call(h.create_expense, { amount: -1 });
    expect(isError).toBe(true);
    expect(text).toMatch(/negative/i);
  });
});

describe('profile', () => {
  it('patches only provided fields and preserves importedAt', async () => {
    const { h } = handlers({
      settings: {
        ...DEFAULT_SETTINGS,
        importedAt: 99,
        pilot: { name: 'Andreas', shvNr: '1', dateOfIssueISO: '2020-01-01' },
      },
    });
    const { data } = await call(h.update_profile, {
      currency: 'EUR',
      pilot: { name: 'A. K.' },
    });
    expect(data).toMatchObject({
      currency: 'EUR',
      importedAt: 99,
      pilot: { name: 'A. K.', shvNr: '1', dateOfIssueISO: '2020-01-01' },
    });
  });
});

describe('get_stats', () => {
  it('matches computeDashboard totals', async () => {
    const equipment = [wing(), harness()];
    const flights = [
      flight({ id: 'a', dateISO: '2026-02-01', airtimeMinutes: 60 }),
      flight({ id: 'b', dateISO: '2025-02-01', airtimeMinutes: 120 }),
    ];
    const expenses = [
      {
        id: 'ex1',
        equipmentId: 'wing1',
        amount: 100,
        currency: 'CHF',
        dateISO: '2026-03-01',
        category: 'repair' as const,
        notes: null,
        createdAt: 1,
      },
    ];
    const settings = DEFAULT_SETTINGS;
    const { h } = handlers({ equipment, flights, expenses, settings });
    const { data } = await call(h.get_stats, { dateISO: '2026-10-08' });
    const expected = computeDashboard(
      equipment,
      [...flights].sort((a, b) => `${b.dateISO} ${b.time}`.localeCompare(`${a.dateISO} ${a.time}`)),
      expenses,
      settings,
      '2026-10-08',
    );
    const stats = data as {
      totalFlights: number;
      totalHours: number;
      flightsThisYear: number;
      totalSpend: number;
      spendByYear: { year: number; totalSpend: number }[];
    };
    expect(stats.totalFlights).toBe(expected.totalFlights);
    expect(stats.totalHours).toBe(expected.totalHours);
    expect(stats.flightsThisYear).toBe(expected.flightsThisYear);
    expect(stats.totalSpend).toBe(expected.totalSpend);
    expect(stats.spendByYear.some((r) => r.year === 2026)).toBe(true);
  });
});
