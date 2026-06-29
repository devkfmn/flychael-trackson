import type { Equipment, Expense, Flight, UserSettings } from '../types';
import { todayISO, yearOf } from '../utils/dates';
import {
  equipmentLabel,
  equipmentMap,
  maintenanceFor,
} from './equipment';
import type { MaintenanceResult } from './maintenance';

export interface UsageBucket {
  id: string;
  label: string;
  flights: number;
  hours: number;
}

export interface SiteCount {
  site: string;
  count: number;
}

export interface MaintenanceItem {
  equipment: Equipment;
  result: MaintenanceResult;
}

export interface QualityWarning {
  kind:
    | 'missing-serial'
    | 'missing-check'
    | 'missing-manufacture'
    | 'unknown-equipment-ref'
    | 'zero-airtime';
  message: string;
  ref?: string;
}

export interface DashboardData {
  totalFlights: number;
  totalHours: number;
  flightsThisYear: number;
  hoursThisYear: number;
  byWing: UsageBucket[];
  byHarness: UsageBucket[];
  topSites: SiteCount[];
  recentFlights: Flight[];
  totalSpend: number;
  costPerFlight: number;
  costPerHour: number;
  overdue: MaintenanceItem[];
  dueSoon: MaintenanceItem[];
  needsData: MaintenanceItem[];
  warnings: QualityWarning[];
}

function hours(minutes: number): number {
  return minutes / 60;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeDashboard(
  equipment: Equipment[],
  flights: Flight[],
  expenses: Expense[],
  settings: UserSettings,
  refDateISO: string = todayISO(),
): DashboardData {
  const byId = equipmentMap(equipment);
  const thisYear = yearOf(refDateISO);

  let totalFlights = 0;
  let totalMinutes = 0;
  let flightsThisYear = 0;
  let minutesThisYear = 0;

  const wing = new Map<string, UsageBucket>();
  const harness = new Map<string, UsageBucket>();
  const sites = new Map<string, number>();
  const warnings: QualityWarning[] = [];

  const bump = (
    map: Map<string, UsageBucket>,
    id: string | null,
    minutes: number,
  ) => {
    if (!id) return;
    const eq = byId.get(id);
    const label = eq ? equipmentLabel(eq) : 'Unknown';
    const cur = map.get(id) ?? { id, label, flights: 0, hours: 0 };
    cur.flights += 1;
    cur.hours += hours(minutes);
    map.set(id, cur);
  };

  for (const f of flights) {
    totalFlights += 1;
    totalMinutes += f.airtimeMinutes;
    if (thisYear != null && yearOf(f.dateISO) === thisYear) {
      flightsThisYear += 1;
      minutesThisYear += f.airtimeMinutes;
    }
    bump(wing, f.paragliderId, f.airtimeMinutes);
    bump(harness, f.harnessId, f.airtimeMinutes);
    if (f.takeoff) sites.set(f.takeoff, (sites.get(f.takeoff) ?? 0) + 1);

    if (f.airtimeMinutes <= 0) {
      warnings.push({
        kind: 'zero-airtime',
        message: `Flight on ${f.dateISO} (${f.takeoff || '—'}) has no airtime.`,
        ref: f.id,
      });
    }
    if (f.paragliderId && !byId.has(f.paragliderId)) {
      warnings.push({
        kind: 'unknown-equipment-ref',
        message: `Flight on ${f.dateISO} references a missing paraglider.`,
        ref: f.id,
      });
    }
    if (f.harnessId && !byId.has(f.harnessId)) {
      warnings.push({
        kind: 'unknown-equipment-ref',
        message: `Flight on ${f.dateISO} references a missing harness.`,
        ref: f.id,
      });
    }
  }

  // Maintenance analysis.
  const overdue: MaintenanceItem[] = [];
  const dueSoon: MaintenanceItem[] = [];
  const needsData: MaintenanceItem[] = [];

  for (const eq of equipment) {
    if (eq.status === 'sold') continue;
    const result = maintenanceFor(eq, flights, settings, refDateISO);
    if (!result.applicable) continue;
    if (result.status === 'overdue') overdue.push({ equipment: eq, result });
    else if (result.status === 'dueSoon') dueSoon.push({ equipment: eq, result });
    else if (result.status === 'unknown') needsData.push({ equipment: eq, result });

    // Equipment data quality.
    if (!eq.serialNumber) {
      warnings.push({
        kind: 'missing-serial',
        message: `${equipmentLabel(eq)} is missing a serial number.`,
        ref: eq.id,
      });
    }
    if (!eq.lastCheckDateISO) {
      warnings.push({
        kind: 'missing-check',
        message: `${equipmentLabel(eq)} has no last check/repack date.`,
        ref: eq.id,
      });
    }
    if (!eq.manufactureDateISO) {
      warnings.push({
        kind: 'missing-manufacture',
        message: `${equipmentLabel(eq)} is missing a manufacture date.`,
        ref: eq.id,
      });
    }
  }

  const sortByUrgency = (a: MaintenanceItem, b: MaintenanceItem) =>
    (a.result.binding?.remaining ?? 0) - (b.result.binding?.remaining ?? 0);
  overdue.sort(sortByUrgency);
  dueSoon.sort(sortByUrgency);

  // Cost analytics: net gear cost (purchases - sales) + recorded expenses.
  let gearNet = 0;
  for (const eq of equipment) {
    gearNet += eq.purchasePrice ?? 0;
    gearNet -= eq.salePrice ?? 0;
  }
  const expenseTotal = expenses.reduce((acc, e) => acc + e.amount, 0);
  const totalSpend = gearNet + expenseTotal;

  const totalHours = hours(totalMinutes);

  const usageSort = (a: UsageBucket, b: UsageBucket) => b.hours - a.hours;

  return {
    totalFlights,
    totalHours: round1(totalHours),
    flightsThisYear,
    hoursThisYear: round1(hours(minutesThisYear)),
    byWing: [...wing.values()].sort(usageSort).map(roundBucket),
    byHarness: [...harness.values()].sort(usageSort).map(roundBucket),
    topSites: [...sites.entries()]
      .map(([site, count]) => ({ site, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    recentFlights: flights.slice(0, 6),
    totalSpend: Math.round(totalSpend),
    costPerFlight: totalFlights ? Math.round(totalSpend / totalFlights) : 0,
    costPerHour: totalHours ? Math.round(totalSpend / totalHours) : 0,
    overdue,
    dueSoon,
    needsData,
    warnings,
  };
}

function roundBucket(b: UsageBucket): UsageBucket {
  return { ...b, hours: round1(b.hours) };
}
