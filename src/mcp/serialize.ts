import { mergeSettings } from '../domain/settings.js';
import type {
  Equipment,
  Expense,
  Flight,
  IgcMeta,
  MaintenanceRule,
  TrackMeta,
  UserSettings,
} from '../types/index.js';
import { timestampToMillis, timestampToMillisOr } from './timestamps.js';

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') return null;
  return value;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asMaintenanceRule(value: unknown): MaintenanceRule | null {
  if (value == null || typeof value !== 'object') return null;
  const rec = value as Record<string, unknown>;
  return {
    months: asNullableNumber(rec.months),
    flights: asNullableNumber(rec.flights),
    hours: asNullableNumber(rec.hours),
  };
}

function asTrack(value: unknown): TrackMeta | null {
  if (value == null || typeof value !== 'object') return null;
  const rec = value as Record<string, unknown>;
  return {
    points: asNumber(rec.points, 0),
    maxAltitudeM: asNullableNumber(rec.maxAltitudeM),
    durationMinutes: asNullableNumber(rec.durationMinutes),
  };
}

function asIgc(value: unknown): IgcMeta | null {
  if (value == null || typeof value !== 'object') return null;
  const rec = value as Record<string, unknown>;
  const filename = asString(rec.filename);
  if (!filename) return null;
  return {
    filename,
    importedAt: timestampToMillisOr(rec.importedAt, 0),
  };
}

export function flightFromDoc(
  id: string,
  data: Record<string, unknown>,
): Flight {
  const source = data.source;
  return {
    id,
    dateISO: asString(data.dateISO),
    time: asNullableString(data.time),
    takeoff: asString(data.takeoff),
    landing: asString(data.landing),
    paragliderId: asNullableString(data.paragliderId),
    harnessId: asNullableString(data.harnessId),
    airtimeMinutes: asNumber(data.airtimeMinutes, 0),
    comments: asNullableString(data.comments),
    distanceKm: asNullableNumber(data.distanceKm),
    altitudeGainM: asNullableNumber(data.altitudeGainM),
    track: asTrack(data.track),
    igc: asIgc(data.igc),
    source:
      source === 'igc' || source === 'import' || source === 'manual'
        ? source
        : 'manual',
    createdAt: timestampToMillisOr(data.createdAt, 0),
    updatedAt: timestampToMillisOr(data.updatedAt, 0),
  };
}

export function equipmentFromDoc(
  id: string,
  data: Record<string, unknown>,
): Equipment {
  const type = data.type;
  const status = data.status;
  return {
    id,
    type:
      type === 'paraglider' ||
      type === 'harness' ||
      type === 'reserve' ||
      type === 'other'
        ? type
        : 'other',
    producer: asString(data.producer),
    model: asString(data.model),
    size: asNullableString(data.size),
    owner: asNullableString(data.owner),
    serialNumber: asNullableString(data.serialNumber),
    manufactureDateISO: asNullableString(data.manufactureDateISO),
    purchaseDateISO: asNullableString(data.purchaseDateISO),
    saleDateISO: asNullableString(data.saleDateISO),
    purchasePrice: asNullableNumber(data.purchasePrice),
    salePrice: asNullableNumber(data.salePrice),
    notes: asNullableString(data.notes),
    status:
      status === 'active' || status === 'borrowed' || status === 'sold'
        ? status
        : 'active',
    lastCheckDateISO: asNullableString(data.lastCheckDateISO),
    maintenanceRule: asMaintenanceRule(data.maintenanceRule),
    legacyId: asNullableString(data.legacyId),
    createdAt: timestampToMillisOr(data.createdAt, 0),
    updatedAt: timestampToMillisOr(data.updatedAt, 0),
  };
}

export function expenseFromDoc(
  id: string,
  data: Record<string, unknown>,
): Expense {
  const category = data.category;
  return {
    id,
    equipmentId: asNullableString(data.equipmentId),
    amount: asNumber(data.amount, 0),
    currency: asString(data.currency, 'CHF'),
    dateISO: asString(data.dateISO),
    category:
      category === 'purchase' ||
      category === 'sale' ||
      category === 'repair' ||
      category === 'check' ||
      category === 'gear' ||
      category === 'other'
        ? category
        : 'other',
    notes: asNullableString(data.notes),
    createdAt: timestampToMillisOr(data.createdAt, 0),
  };
}

export function settingsFromDoc(
  data: Record<string, unknown> | undefined,
): UserSettings {
  const merged = mergeSettings(data as Partial<UserSettings> | undefined);
  const importedAt =
    data && 'importedAt' in data
      ? timestampToMillis(data.importedAt)
      : merged.importedAt;
  return { ...merged, importedAt };
}
