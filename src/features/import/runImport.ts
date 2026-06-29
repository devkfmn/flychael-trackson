import {
  doc,
  setDoc,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  equipmentCol,
  flightsCol,
  stripUndefined,
  userDoc,
  type StoredFlight,
} from '../../data/collections';
import type { MappedImport } from './parafolio';

const BATCH_LIMIT = 450;

export interface ImportResult {
  equipmentWritten: number;
  flightsWritten: number;
}

/**
 * Writes a mapped import into Firestore. Equipment is created first so that
 * flight references can be resolved from legacy ids to new document ids.
 * Writes are committed in chunks to stay within Firestore's batch limit.
 */
export async function runImport(
  uid: string,
  mapped: MappedImport,
): Promise<ImportResult> {
  const ops: { ref: DocumentReference; data: Record<string, unknown> }[] = [];

  // Equipment with pre-generated ids -> legacyId map.
  const legacyToId = new Map<string, string>();
  for (const eq of mapped.equipment) {
    const ref = doc(equipmentCol(uid));
    legacyToId.set(eq.legacyId, ref.id);
    ops.push({ ref, data: stripUndefined(eq.data) });
  }

  // Flights with resolved equipment references.
  const now = Date.now();
  for (const f of mapped.flights) {
    const ref = doc(flightsCol(uid));
    const flight: StoredFlight = {
      dateISO: f.dateISO,
      time: f.time,
      takeoff: f.takeoff,
      landing: f.landing,
      paragliderId: f.paragliderLegacyId
        ? (legacyToId.get(f.paragliderLegacyId) ?? null)
        : null,
      harnessId: f.harnessLegacyId
        ? (legacyToId.get(f.harnessLegacyId) ?? null)
        : null,
      airtimeMinutes: f.airtimeMinutes,
      comments: f.comments,
      distanceKm: null,
      altitudeGainM: null,
      track: null,
      igc: null,
      source: 'import',
      createdAt: now,
      updatedAt: now,
    };
    ops.push({ ref, data: stripUndefined(flight) });
  }

  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const op of ops.slice(i, i + BATCH_LIMIT)) {
      batch.set(op.ref, op.data);
    }
    await batch.commit();
  }

  // Pilot profile + import marker.
  await setDoc(
    userDoc(uid),
    stripUndefined({
      pilot: mapped.pilot,
      importedAt: now,
    }),
    { merge: true },
  );

  return {
    equipmentWritten: mapped.equipment.length,
    flightsWritten: mapped.flights.length,
  };
}
