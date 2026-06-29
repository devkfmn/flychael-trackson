import type { DefaultSetup, Flight } from '../types';

export type PrefillSource =
  | 'same-day'
  | 'last-flying-day'
  | 'trip'
  | 'default'
  | 'none';

export interface Setup {
  paragliderId: string | null;
  harnessId: string | null;
  takeoff: string | null;
  landing: string | null;
}

export interface PrefillField {
  value: string | null;
  source: PrefillSource;
}

export interface PrefillResult {
  paragliderId: PrefillField;
  harnessId: PrefillField;
  takeoff: PrefillField;
  landing: PrefillField;
  tripModeActive: boolean;
  /** The leading source that drove the suggestion, for headline display. */
  primarySource: PrefillSource;
}

export type PrefillFlight = Pick<
  Flight,
  'dateISO' | 'time' | 'paragliderId' | 'harnessId' | 'takeoff' | 'landing'
>;

export const SOURCE_LABELS: Record<PrefillSource, string> = {
  'same-day': 'Same day',
  'last-flying-day': 'Last flying day',
  trip: 'Trip mode',
  default: 'Your default',
  none: 'No suggestion',
};

function setupOf(f: PrefillFlight): Setup {
  return {
    paragliderId: f.paragliderId,
    harnessId: f.harnessId,
    takeoff: f.takeoff,
    landing: f.landing,
  };
}

function defaultSetup(d: DefaultSetup): Setup {
  return {
    paragliderId: d.paragliderId,
    harnessId: d.harnessId,
    takeoff: d.takeoff,
    landing: d.landing,
  };
}

/** Sort key: date then time (missing time sorts first within a day). */
function sortKey(f: PrefillFlight): string {
  return `${f.dateISO} ${f.time ?? '00:00'}`;
}

/**
 * Does a setup deviate from the user's configured defaults? Only fields with a
 * configured default participate; if no defaults are configured we cannot tell,
 * so we report `false` (no trip detection without a baseline).
 */
function setupDiffersFromDefault(setup: Setup, defaults: DefaultSetup): boolean {
  const checks: boolean[] = [];
  if (defaults.paragliderId)
    checks.push(setup.paragliderId !== defaults.paragliderId);
  if (defaults.harnessId) checks.push(setup.harnessId !== defaults.harnessId);
  if (defaults.takeoff) checks.push(setup.takeoff !== defaults.takeoff);
  if (defaults.landing) checks.push(setup.landing !== defaults.landing);
  if (checks.length === 0) return false;
  return checks.some(Boolean);
}

function lastFlightOfDay(
  flights: PrefillFlight[],
  dateISO: string,
): PrefillFlight | null {
  const onDay = flights.filter((f) => f.dateISO === dateISO);
  if (onDay.length === 0) return null;
  return onDay.reduce((a, b) => (sortKey(a) >= sortKey(b) ? a : b));
}

function defaultsHaveAny(d: DefaultSetup): boolean {
  return Boolean(d.paragliderId || d.harnessId || d.takeoff || d.landing);
}

/**
 * Compute visible prefill suggestions for the Add Flight form.
 *
 * Priority:
 *  1. Same-day: reuse the previous flight from the target date.
 *  2. First flight of a new day: reuse the last flying day's setup.
 *     If the last two flying days both used non-default gear/sites, "trip mode"
 *     is active and the suggestion is labelled accordingly.
 *  3. Otherwise fall back to the user's configured defaults.
 *
 * Each field falls back to the user's default when the chosen source has no
 * value for it.
 */
export function computePrefill(
  flights: PrefillFlight[],
  targetDateISO: string,
  defaults: DefaultSetup,
): PrefillResult {
  const sameDay = flights
    .filter((f) => f.dateISO === targetDateISO)
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

  const priorDays = Array.from(
    new Set(flights.filter((f) => f.dateISO < targetDateISO).map((f) => f.dateISO)),
  ).sort((a, b) => b.localeCompare(a));

  const lastDayFlight = priorDays[0]
    ? lastFlightOfDay(flights, priorDays[0])
    : null;
  const secondLastDayFlight = priorDays[1]
    ? lastFlightOfDay(flights, priorDays[1])
    : null;

  const tripModeActive =
    lastDayFlight != null &&
    secondLastDayFlight != null &&
    setupDiffersFromDefault(setupOf(lastDayFlight), defaults) &&
    setupDiffersFromDefault(setupOf(secondLastDayFlight), defaults);

  let base: Setup;
  let source: PrefillSource;

  if (sameDay.length > 0) {
    base = setupOf(sameDay[sameDay.length - 1]);
    source = 'same-day';
  } else if (lastDayFlight) {
    base = setupOf(lastDayFlight);
    source = tripModeActive ? 'trip' : 'last-flying-day';
  } else if (defaultsHaveAny(defaults)) {
    base = defaultSetup(defaults);
    source = 'default';
  } else {
    base = { paragliderId: null, harnessId: null, takeoff: null, landing: null };
    source = 'none';
  }

  const dflt = defaultSetup(defaults);

  const field = (key: keyof Setup): PrefillField => {
    if (base[key] != null) return { value: base[key], source };
    if (dflt[key] != null) return { value: dflt[key], source: 'default' };
    return { value: null, source: 'none' };
  };

  return {
    paragliderId: field('paragliderId'),
    harnessId: field('harnessId'),
    takeoff: field('takeoff'),
    landing: field('landing'),
    tripModeActive,
    primarySource: source,
  };
}
