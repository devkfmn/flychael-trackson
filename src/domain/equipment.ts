import {
  defaultRuleForType,
  type Equipment,
  type EquipmentType,
  type MaintenanceRule,
  type UserSettings,
} from '../types/index.js';
import { computeMaintenance, type MaintenanceResult } from './maintenance.js';
import type { Flight } from '../types/index.js';
import { todayISO } from '../utils/dates.js';

export function equipmentLabel(eq: Equipment): string {
  const main = [eq.producer, eq.model].filter(Boolean).join(' ').trim();
  const base = main || 'Unnamed';
  return eq.size ? `${base} (${eq.size})` : base;
}

/** Whether a piece of gear is borrowed (owned by someone else). */
export function isBorrowed(eq: Equipment): boolean {
  return eq.status === 'borrowed';
}

/** Human label for borrowed gear, including the owner when known. */
export function borrowedLabel(eq: Equipment): string {
  return eq.owner ? `Borrowed · ${eq.owner}` : 'Borrowed';
}

/**
 * Status suffix for text-only contexts such as `<option>` labels, e.g.
 * ` (borrowed)` or ` (sold)`. Returns an empty string for active gear.
 */
export function equipmentStatusSuffix(eq: Equipment): string {
  if (eq.status === 'sold') return ' (sold)';
  if (eq.status === 'borrowed') return ' (borrowed)';
  return '';
}

/** Sold gear is hidden from flight dropdowns; active and borrowed remain. */
export function isSelectableForFlight(eq: Equipment): boolean {
  return eq.status !== 'sold';
}

/** Treat empty string the same as a missing id. */
export function presentId(id: string | null | undefined): string | null {
  if (id == null || id === '') return null;
  return id;
}

export function selectableByType(
  equipment: Equipment[],
  type: EquipmentType,
): Equipment[] {
  return equipment
    .filter((e) => e.type === type && isSelectableForFlight(e))
    .sort((a, b) => equipmentLabel(a).localeCompare(equipmentLabel(b)));
}

/**
 * Select options for a flight gear field. Sold items stay hidden unless the
 * flight (or current form value) still references them — same for any other
 * non-selectable status that is already stored on the flight.
 */
export function gearOptions(
  equipment: Equipment[],
  type: EquipmentType,
  ...referencedIds: Array<string | null | undefined>
): Equipment[] {
  const list = selectableByType(equipment, type);
  const extras: Equipment[] = [];
  for (const raw of referencedIds) {
    const id = presentId(raw);
    if (!id) continue;
    if (list.some((e) => e.id === id) || extras.some((e) => e.id === id)) continue;
    const cur = equipment.find((e) => e.id === id && e.type === type);
    if (cur) extras.push(cur);
  }
  return extras.length > 0 ? [...extras, ...list] : list;
}

/**
 * Pick a gear id that exists in `options`. Empty string is missing. If the
 * preferred id is not among the options, fall back to `fallback` when that id
 * is available.
 */
export function resolveGearId(
  preferred: string | null | undefined,
  options: Equipment[],
  fallback: string | null | undefined = null,
): string | null {
  const ids = new Set(options.map((e) => e.id));
  const preferredId = presentId(preferred);
  if (preferredId && ids.has(preferredId)) return preferredId;
  const fallbackId = presentId(fallback);
  if (fallbackId && ids.has(fallbackId)) return fallbackId;
  return null;
}

/**
 * Decide whether to push a stored gear id back into the form after options
 * arrive. Never overwrites a user-chosen value; only fills an empty field
 * once the referenced option is actually listed.
 */
export function restoreGearFormValue(input: {
  current: string | null | undefined;
  initial: string | null | undefined;
  options: Equipment[];
  alreadyRestored: boolean;
}): { value: string | null; restored: boolean } {
  if (input.alreadyRestored) {
    return { value: presentId(input.current), restored: true };
  }
  const initialId = presentId(input.initial);
  const currentId = presentId(input.current);
  if (initialId && !input.options.some((e) => e.id === initialId)) {
    return { value: currentId, restored: false };
  }
  if (currentId) {
    return { value: currentId, restored: true };
  }
  if (initialId) {
    return { value: initialId, restored: true };
  }
  return { value: null, restored: true };
}

export function equipmentMap(equipment: Equipment[]): Map<string, Equipment> {
  return new Map(equipment.map((e) => [e.id, e]));
}

/** The maintenance rule in effect for an item (override or type default). */
export function effectiveRule(
  eq: Equipment,
  settings: UserSettings,
): MaintenanceRule | null {
  return eq.maintenanceRule ?? defaultRuleForType(eq.type, settings.maintenanceDefaults);
}

export function maintenanceFor(
  eq: Equipment,
  flights: Flight[],
  settings: UserSettings,
  refDateISO: string = todayISO(),
): MaintenanceResult {
  return computeMaintenance({
    type: eq.type,
    rule: effectiveRule(eq, settings),
    lastCheckDateISO: eq.lastCheckDateISO,
    equipmentId: eq.id,
    flights,
    refDateISO,
  });
}
