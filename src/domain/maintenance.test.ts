import { describe, expect, it } from 'vitest';
import { computeMaintenance, type MaintenanceInput } from './maintenance';
import type { Flight } from '../types';

function flight(
  dateISO: string,
  equipmentId: string,
  airtimeMinutes: number,
): Pick<Flight, 'dateISO' | 'airtimeMinutes' | 'paragliderId' | 'harnessId'> {
  return { dateISO, airtimeMinutes, paragliderId: equipmentId, harnessId: null };
}

function makeFlights(
  count: number,
  equipmentId: string,
  airtimeMinutes: number,
  fromDate = '2024-01-02',
) {
  return Array.from({ length: count }, () =>
    flight(fromDate, equipmentId, airtimeMinutes),
  );
}

const baseWing = (over: Partial<MaintenanceInput> = {}): MaintenanceInput => ({
  type: 'paraglider',
  rule: { months: 24, flights: 150, hours: 150 },
  lastCheckDateISO: '2024-01-01',
  equipmentId: 'w1',
  flights: [],
  refDateISO: '2024-06-01',
  ...over,
});

describe('computeMaintenance — wing/harness', () => {
  it('is overdue when months exceed the threshold first', () => {
    const r = computeMaintenance(
      baseWing({ lastCheckDateISO: '2020-01-01', refDateISO: '2023-01-01' }),
    );
    expect(r.status).toBe('overdue');
    expect(r.binding?.metric).toBe('months');
  });

  it('is overdue when flights exceed the threshold first', () => {
    const r = computeMaintenance(
      baseWing({ flights: makeFlights(200, 'w1', 30) }),
    );
    expect(r.status).toBe('overdue');
    expect(r.binding?.metric).toBe('flights');
  });

  it('is overdue when flight hours exceed the threshold first', () => {
    const r = computeMaintenance(
      baseWing({ flights: makeFlights(100, 'w1', 120) }), // 200h
    );
    expect(r.status).toBe('overdue');
    expect(r.binding?.metric).toBe('hours');
  });

  it('only counts flights on/after the last check date', () => {
    const r = computeMaintenance(
      baseWing({
        flights: [
          ...makeFlights(200, 'w1', 30, '2023-06-01'), // before last check
          ...makeFlights(10, 'w1', 30, '2024-02-01'),
        ],
      }),
    );
    expect(r.status).toBe('ok');
    const flightsDim = r.dimensions.find((d) => d.metric === 'flights');
    expect(flightsDim?.used).toBe(10);
  });

  it('ignores flights flown on other equipment', () => {
    const r = computeMaintenance(
      baseWing({
        flights: makeFlights(200, 'other-wing', 30),
      }),
    );
    expect(r.status).toBe('ok');
  });

  it('is dueSoon when close to the months threshold', () => {
    const r = computeMaintenance(
      baseWing({ lastCheckDateISO: '2022-02-01', refDateISO: '2024-01-01' }),
    );
    expect(r.status).toBe('dueSoon');
  });

  it('is unknown when there is no last check date', () => {
    const r = computeMaintenance(baseWing({ lastCheckDateISO: null }));
    expect(r.status).toBe('unknown');
    expect(r.applicable).toBe(true);
  });
});

describe('computeMaintenance — reserve', () => {
  it('uses the repack months only, not flights', () => {
    const r = computeMaintenance({
      type: 'reserve',
      rule: { months: 12, flights: null, hours: null },
      lastCheckDateISO: '2023-01-01',
      equipmentId: 'r1',
      flights: makeFlights(500, 'r1', 60),
      refDateISO: '2024-06-01',
    });
    expect(r.status).toBe('overdue');
    expect(r.dimensions).toHaveLength(1);
    expect(r.binding?.metric).toBe('months');
    expect(r.dueDateISO).toBe('2024-01-01');
  });

  it('is ok within the repack interval', () => {
    const r = computeMaintenance({
      type: 'reserve',
      rule: { months: 12, flights: null, hours: null },
      lastCheckDateISO: '2024-03-01',
      equipmentId: 'r1',
      flights: [],
      refDateISO: '2024-06-01',
    });
    expect(r.status).toBe('ok');
  });
});

describe('computeMaintenance — not applicable', () => {
  it('returns not applicable when there is no rule', () => {
    const r = computeMaintenance({
      type: 'other',
      rule: null,
      lastCheckDateISO: null,
      equipmentId: 'o1',
      flights: [],
      refDateISO: '2024-06-01',
    });
    expect(r.applicable).toBe(false);
    expect(r.status).toBe('ok');
  });
});
