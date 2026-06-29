import type { EquipmentType, PilotProfile } from '../../types';
import type { StoredEquipment } from '../../data/collections';
import { parseSwissDate, parseSwissDateTime } from '../../utils/dates';

// Maps the legacy Parafolio export (wrapped in an app tag such as `Horus`) into
// the normalized Trackson model. The wrapping tag and any other old app
// metadata are ignored.

export interface ImportWarning {
  kind:
    | 'missing-serial'
    | 'missing-check'
    | 'missing-manufacture'
    | 'unknown-equipment-ref'
    | 'unparsable-date'
    | 'zero-airtime';
  message: string;
}

export interface MappedEquipment {
  legacyId: string;
  data: StoredEquipment;
}

export interface MappedFlight {
  dateISO: string;
  time: string | null;
  takeoff: string;
  landing: string;
  paragliderLegacyId: string | null;
  harnessLegacyId: string | null;
  airtimeMinutes: number;
  comments: string | null;
}

export interface MappedImport {
  pilot: PilotProfile;
  equipment: MappedEquipment[];
  flights: MappedFlight[];
  warnings: ImportWarning[];
  stats: {
    paragliders: number;
    harnesses: number;
    reserves: number;
    flights: number;
    earliestDate: string | null;
    latestDate: string | null;
  };
}

interface RawItem {
  Id?: string;
  Producer?: string;
  Model?: string;
  Size?: string;
  Owner?: string;
  SerialNumber?: string;
  DateOfManufacture?: string;
  DateOfLastCheck?: string;
  DateOfPurchase?: string;
  DateOfSelling?: string;
  PurchasePrice?: string;
  SellingPrice?: string;
}

interface RawFlight {
  DateTime?: string;
  Takeoff?: string;
  Landing?: string;
  ParagliderId?: string;
  HarnessId?: string;
  Airtime?: string;
  Comments?: string;
}

interface RawRoot {
  Pilot?: { Name?: string; SHVNr?: string; DateOfIssue?: string };
  Paragliders?: { Paraglider?: RawItem[] };
  Harnesses?: { Harness?: RawItem[] };
  ReserveParachutes?: { ReserveParachute?: RawItem[] };
  Flights?: { Flight?: RawFlight[] };
}

function num(value: string | undefined): number | null {
  if (value == null) return null;
  const t = value.trim();
  if (t === '') return null;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function str(value: string | undefined): string | null {
  if (value == null) return null;
  const t = value.trim();
  return t === '' ? null : t;
}

/** Locate the payload object, ignoring the wrapping app tag (e.g. `Horus`). */
function findRoot(parsed: unknown): RawRoot | null {
  if (parsed == null || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  const looksLikeRoot = (o: unknown): o is RawRoot =>
    o != null &&
    typeof o === 'object' &&
    ('Flights' in o || 'Paragliders' in o || 'Pilot' in o);

  if (looksLikeRoot(obj)) return obj as RawRoot;
  for (const value of Object.values(obj)) {
    if (looksLikeRoot(value)) return value as RawRoot;
  }
  return null;
}

function mapItem(
  type: EquipmentType,
  raw: RawItem,
  pilotName: string | null,
  now: number,
  warnings: ImportWarning[],
): MappedEquipment {
  const legacyId = `${type}:${raw.Id ?? ''}`;
  const owner = str(raw.Owner);
  const saleDateISO = parseSwissDate(raw.DateOfSelling);
  const serialNumber = str(raw.SerialNumber);
  const manufactureDateISO = parseSwissDate(raw.DateOfManufacture);
  const lastCheckDateISO = parseSwissDate(raw.DateOfLastCheck);

  let status: StoredEquipment['status'] = 'active';
  if (saleDateISO) status = 'sold';
  else if (owner && pilotName && owner !== pilotName) status = 'borrowed';

  const label = `${str(raw.Producer) ?? ''} ${str(raw.Model) ?? ''}`.trim() || legacyId;
  if (status !== 'sold' && !serialNumber) {
    warnings.push({
      kind: 'missing-serial',
      message: `${label}: no serial number.`,
    });
  }
  if (status !== 'sold' && type !== 'other' && !lastCheckDateISO) {
    warnings.push({
      kind: 'missing-check',
      message: `${label}: no last ${type === 'reserve' ? 'repack' : 'check'} date.`,
    });
  }

  return {
    legacyId,
    data: {
      type,
      producer: str(raw.Producer) ?? '',
      model: str(raw.Model) ?? '',
      size: str(raw.Size),
      owner,
      serialNumber,
      manufactureDateISO,
      purchaseDateISO: parseSwissDate(raw.DateOfPurchase),
      saleDateISO,
      purchasePrice: num(raw.PurchasePrice),
      salePrice: num(raw.SellingPrice),
      notes: null,
      status,
      lastCheckDateISO,
      maintenanceRule: null,
      legacyId,
      createdAt: now,
      updatedAt: now,
    },
  };
}

export function mapParafolio(parsed: unknown): MappedImport {
  const root = findRoot(parsed);
  const warnings: ImportWarning[] = [];

  if (!root) {
    return {
      pilot: { name: '', shvNr: null, dateOfIssueISO: null },
      equipment: [],
      flights: [],
      warnings: [
        {
          kind: 'unparsable-date',
          message: 'Could not find a recognizable Parafolio structure.',
        },
      ],
      stats: {
        paragliders: 0,
        harnesses: 0,
        reserves: 0,
        flights: 0,
        earliestDate: null,
        latestDate: null,
      },
    };
  }

  const now = Date.now();
  const pilotName = str(root.Pilot?.Name);
  const pilot: PilotProfile = {
    name: pilotName ?? '',
    shvNr: str(root.Pilot?.SHVNr),
    dateOfIssueISO: parseSwissDate(root.Pilot?.DateOfIssue),
  };

  const paragliders = (root.Paragliders?.Paraglider ?? []).map((r) =>
    mapItem('paraglider', r, pilotName, now, warnings),
  );
  const harnesses = (root.Harnesses?.Harness ?? []).map((r) =>
    mapItem('harness', r, pilotName, now, warnings),
  );
  const reserves = (root.ReserveParachutes?.ReserveParachute ?? []).map((r) =>
    mapItem('reserve', r, pilotName, now, warnings),
  );

  const equipment = [...paragliders, ...harnesses, ...reserves];
  const knownLegacy = new Set(equipment.map((e) => e.legacyId));

  const flights: MappedFlight[] = [];
  let earliest: string | null = null;
  let latest: string | null = null;

  for (const raw of root.Flights?.Flight ?? []) {
    const dt = parseSwissDateTime(raw.DateTime);
    if (!dt) {
      warnings.push({
        kind: 'unparsable-date',
        message: `Skipped flight with unparsable date "${raw.DateTime ?? ''}".`,
      });
      continue;
    }
    const airtimeMinutes = num(raw.Airtime) ?? 0;
    if (airtimeMinutes <= 0) {
      warnings.push({
        kind: 'zero-airtime',
        message: `Flight ${dt.dateISO} ${dt.time} has no airtime.`,
      });
    }

    const paraLegacy =
      raw.ParagliderId != null ? `paraglider:${raw.ParagliderId}` : null;
    const harnLegacy = raw.HarnessId != null ? `harness:${raw.HarnessId}` : null;
    if (paraLegacy && !knownLegacy.has(paraLegacy)) {
      warnings.push({
        kind: 'unknown-equipment-ref',
        message: `Flight ${dt.dateISO} references unknown paraglider id ${raw.ParagliderId}.`,
      });
    }
    if (harnLegacy && !knownLegacy.has(harnLegacy)) {
      warnings.push({
        kind: 'unknown-equipment-ref',
        message: `Flight ${dt.dateISO} references unknown harness id ${raw.HarnessId}.`,
      });
    }

    if (!earliest || dt.dateISO < earliest) earliest = dt.dateISO;
    if (!latest || dt.dateISO > latest) latest = dt.dateISO;

    flights.push({
      dateISO: dt.dateISO,
      time: dt.time,
      takeoff: str(raw.Takeoff) ?? '',
      landing: str(raw.Landing) ?? '',
      paragliderLegacyId: paraLegacy,
      harnessLegacyId: harnLegacy,
      airtimeMinutes,
      comments: str(raw.Comments),
    });
  }

  return {
    pilot,
    equipment,
    flights,
    warnings,
    stats: {
      paragliders: paragliders.length,
      harnesses: harnesses.length,
      reserves: reserves.length,
      flights: flights.length,
      earliestDate: earliest,
      latestDate: latest,
    },
  };
}
