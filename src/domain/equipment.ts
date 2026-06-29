import {
  defaultRuleForType,
  type Equipment,
  type EquipmentType,
  type MaintenanceRule,
  type UserSettings,
} from '../types';
import { computeMaintenance, type MaintenanceResult } from './maintenance';
import type { Flight } from '../types';
import { todayISO } from '../utils/dates';

export function equipmentLabel(eq: Equipment): string {
  const main = [eq.producer, eq.model].filter(Boolean).join(' ').trim();
  const base = main || 'Unnamed';
  return eq.size ? `${base} (${eq.size})` : base;
}

/** Sold gear is hidden from flight dropdowns; active and borrowed remain. */
export function isSelectableForFlight(eq: Equipment): boolean {
  return eq.status !== 'sold';
}

export function selectableByType(
  equipment: Equipment[],
  type: EquipmentType,
): Equipment[] {
  return equipment
    .filter((e) => e.type === type && isSelectableForFlight(e))
    .sort((a, b) => equipmentLabel(a).localeCompare(equipmentLabel(b)));
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
