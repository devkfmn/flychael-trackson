// Domain model for Flychael Trackson.
// All persisted dates are ISO strings: calendar dates as `yyyy-MM-dd`, times as
// `HH:mm`. Airtime is always stored as whole minutes.

export type EquipmentType = 'paraglider' | 'harness' | 'reserve' | 'other';

export type EquipmentStatus = 'active' | 'borrowed' | 'sold';

export type FlightSource = 'manual' | 'igc' | 'import';

export type ExpenseCategory =
  | 'purchase'
  | 'sale'
  | 'repair'
  | 'check'
  | 'gear'
  | 'other';

/**
 * A maintenance rule. A `null` dimension means "do not trigger on this metric".
 * The check is due when the FIRST enabled threshold is reached.
 */
export interface MaintenanceRule {
  months: number | null;
  flights: number | null;
  hours: number | null;
}

export interface Equipment {
  id: string;
  type: EquipmentType;
  producer: string;
  model: string;
  size: string | null;
  owner: string | null;
  serialNumber: string | null;
  manufactureDateISO: string | null;
  purchaseDateISO: string | null;
  saleDateISO: string | null;
  purchasePrice: number | null;
  salePrice: number | null;
  notes: string | null;
  status: EquipmentStatus;
  /** Last periodic check (paraglider/harness) or last repack (reserve). */
  lastCheckDateISO: string | null;
  /** Per-item override; `null` means use the type default. */
  maintenanceRule: MaintenanceRule | null;
  /** Reference back to the legacy import id, e.g. `paraglider:3`. */
  legacyId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface TrackMeta {
  points: number;
  maxAltitudeM: number | null;
  durationMinutes: number | null;
}

export interface IgcMeta {
  filename: string;
  importedAt: number;
}

export interface Flight {
  id: string;
  /** Calendar date `yyyy-MM-dd`. */
  dateISO: string;
  /** Local takeoff time `HH:mm`, or null if unknown. */
  time: string | null;
  takeoff: string;
  landing: string;
  paragliderId: string | null;
  harnessId: string | null;
  airtimeMinutes: number;
  comments: string | null;
  distanceKm: number | null;
  altitudeGainM: number | null;
  track: TrackMeta | null;
  igc: IgcMeta | null;
  source: FlightSource;
  createdAt: number;
  updatedAt: number;
}

export interface Expense {
  id: string;
  equipmentId: string | null;
  amount: number;
  currency: string;
  dateISO: string;
  category: ExpenseCategory;
  notes: string | null;
  createdAt: number;
}

export interface PilotProfile {
  name: string;
  shvNr: string | null;
  dateOfIssueISO: string | null;
}

export interface DefaultSetup {
  paragliderId: string | null;
  harnessId: string | null;
  takeoff: string | null;
  landing: string | null;
}

export interface MaintenanceDefaults {
  /** Applies to paragliders and harnesses. */
  wingHarness: MaintenanceRule;
  /** Applies to reserve parachutes (repacking only). */
  reserve: MaintenanceRule;
}

export interface UserSettings {
  pilot: PilotProfile;
  defaults: DefaultSetup;
  currency: string;
  maintenanceDefaults: MaintenanceDefaults;
  importedAt: number | null;
}

export const DEFAULT_MAINTENANCE_DEFAULTS: MaintenanceDefaults = {
  wingHarness: { months: 24, flights: 150, hours: 150 },
  reserve: { months: 12, flights: null, hours: null },
};

export const DEFAULT_SETTINGS: UserSettings = {
  pilot: { name: '', shvNr: null, dateOfIssueISO: null },
  defaults: {
    paragliderId: null,
    harnessId: null,
    takeoff: null,
    landing: null,
  },
  currency: 'CHF',
  maintenanceDefaults: DEFAULT_MAINTENANCE_DEFAULTS,
  importedAt: null,
};

export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  paraglider: 'Paraglider',
  harness: 'Harness',
  reserve: 'Reserve',
  other: 'Other gear',
};

/** Equipment that can be selected as a wing when adding a flight. */
export const WING_TYPES: EquipmentType[] = ['paraglider'];

/** Equipment usable as a harness when adding a flight. */
export const HARNESS_TYPES: EquipmentType[] = ['harness'];

/**
 * The default maintenance rule for a given equipment type, derived from the
 * user's configured defaults.
 */
export function defaultRuleForType(
  type: EquipmentType,
  defaults: MaintenanceDefaults,
): MaintenanceRule | null {
  if (type === 'paraglider' || type === 'harness') return defaults.wingHarness;
  if (type === 'reserve') return defaults.reserve;
  return null;
}
