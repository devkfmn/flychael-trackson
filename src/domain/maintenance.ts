import type { EquipmentType, Flight, MaintenanceRule } from '../types';
import { addMonthsISO, daysBetween, monthsBetween } from '../utils/dates';

export type MaintenanceStatus = 'ok' | 'dueSoon' | 'overdue' | 'unknown';

export type MaintenanceMetric = 'months' | 'flights' | 'hours';

export interface MaintenanceDimension {
  metric: MaintenanceMetric;
  threshold: number;
  used: number;
  remaining: number;
}

export interface MaintenanceResult {
  /** False for gear without a maintenance rule (e.g. type `other`). */
  applicable: boolean;
  status: MaintenanceStatus;
  reason: string;
  dimensions: MaintenanceDimension[];
  /** The most urgent dimension (smallest remaining), if any. */
  binding: MaintenanceDimension | null;
  /** Projected due date from the months threshold, if configured. */
  dueDateISO: string | null;
  /** Days until the months-based due date (negative = overdue), if known. */
  daysRemaining: number | null;
}

export interface SoonWindow {
  months: number;
  flights: number;
  hours: number;
}

export const DEFAULT_SOON_WINDOW: SoonWindow = {
  months: 2,
  flights: 15,
  hours: 15,
};

export interface MaintenanceInput {
  type: EquipmentType;
  rule: MaintenanceRule | null;
  lastCheckDateISO: string | null;
  equipmentId: string;
  flights: Pick<
    Flight,
    'dateISO' | 'airtimeMinutes' | 'paragliderId' | 'harnessId'
  >[];
  refDateISO: string;
  soonWindow?: SoonWindow;
}

function ruleHasAnyDimension(rule: MaintenanceRule | null): boolean {
  return (
    rule != null &&
    (rule.months != null || rule.flights != null || rule.hours != null)
  );
}

/**
 * Count flights and airtime for an equipment item on/after a baseline date.
 * Reserve parachutes are intentionally never linked to flights.
 */
function usageSince(input: MaintenanceInput, baselineISO: string) {
  let flights = 0;
  let minutes = 0;
  for (const f of input.flights) {
    const usesItem =
      f.paragliderId === input.equipmentId ||
      f.harnessId === input.equipmentId;
    if (!usesItem) continue;
    if (f.dateISO < baselineISO) continue;
    flights += 1;
    minutes += f.airtimeMinutes ?? 0;
  }
  return { flights, hours: minutes / 60 };
}

export function computeMaintenance(input: MaintenanceInput): MaintenanceResult {
  const soon = input.soonWindow ?? DEFAULT_SOON_WINDOW;
  const { rule } = input;

  if (!ruleHasAnyDimension(rule)) {
    return {
      applicable: false,
      status: 'ok',
      reason: 'No maintenance tracking for this item.',
      dimensions: [],
      binding: null,
      dueDateISO: null,
      daysRemaining: null,
    };
  }

  const baseline = input.lastCheckDateISO;
  const dueDateISO =
    baseline && rule!.months != null
      ? addMonthsISO(baseline, rule!.months)
      : null;

  if (!baseline) {
    return {
      applicable: true,
      status: 'unknown',
      reason: 'No last check/repack date set.',
      dimensions: [],
      binding: null,
      dueDateISO: null,
      daysRemaining: null,
    };
  }

  const usage = usageSince(input, baseline);
  const dimensions: MaintenanceDimension[] = [];

  if (rule!.months != null) {
    const used = Math.max(0, monthsBetween(baseline, input.refDateISO));
    dimensions.push({
      metric: 'months',
      threshold: rule!.months,
      used,
      remaining: rule!.months - used,
    });
  }
  if (rule!.flights != null) {
    dimensions.push({
      metric: 'flights',
      threshold: rule!.flights,
      used: usage.flights,
      remaining: rule!.flights - usage.flights,
    });
  }
  if (rule!.hours != null) {
    dimensions.push({
      metric: 'hours',
      threshold: rule!.hours,
      used: usage.hours,
      remaining: rule!.hours - usage.hours,
    });
  }

  const binding = dimensions.reduce<MaintenanceDimension | null>(
    (acc, d) => (acc == null || d.remaining < acc.remaining ? d : acc),
    null,
  );

  const daysRemaining =
    dueDateISO != null ? daysBetween(input.refDateISO, dueDateISO) : null;

  let status: MaintenanceStatus = 'ok';
  let reason = 'Within limits.';

  if (binding && binding.remaining <= 0) {
    status = 'overdue';
    reason = overdueReason(binding);
  } else {
    const soonHit = dimensions.find((d) => isSoon(d, soon));
    if (soonHit) {
      status = 'dueSoon';
      reason = soonReason(soonHit);
    }
  }

  return {
    applicable: true,
    status,
    reason,
    dimensions,
    binding,
    dueDateISO,
    daysRemaining,
  };
}

function isSoon(d: MaintenanceDimension, soon: SoonWindow): boolean {
  if (d.remaining <= 0) return false;
  if (d.metric === 'months') return d.remaining <= soon.months;
  if (d.metric === 'flights') return d.remaining <= soon.flights;
  return d.remaining <= soon.hours;
}

function metricNoun(metric: MaintenanceMetric): string {
  if (metric === 'months') return 'months';
  if (metric === 'flights') return 'flights';
  return 'hours';
}

function overdueReason(d: MaintenanceDimension): string {
  const over = Math.abs(Math.round(d.remaining * 10) / 10);
  return `Overdue by ${over} ${metricNoun(d.metric)}.`;
}

function soonReason(d: MaintenanceDimension): string {
  const left = Math.round(d.remaining * 10) / 10;
  return `Due in ${left} ${metricNoun(d.metric)}.`;
}
