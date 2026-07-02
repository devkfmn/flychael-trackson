import {
  doc,
  setDoc,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore';
import { deleteAllUserData } from '../../data/deleteAllData';
import {
  equipmentCol,
  expensesCol,
  flightsCol,
  stripUndefined,
  userDoc,
} from '../../data/collections';
import { db } from '../../lib/firebase';
import type { TracksonExport } from '../export/tracksonExport';

const BATCH_LIMIT = 450;

export interface TracksonImportResult {
  equipmentWritten: number;
  flightsWritten: number;
  expensesWritten: number;
}

async function commitBatchedSets(
  ops: { ref: DocumentReference; data: Record<string, unknown> }[],
): Promise<void> {
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const op of ops.slice(i, i + BATCH_LIMIT)) {
      batch.set(op.ref, op.data);
    }
    await batch.commit();
  }
}

/** Wipes existing data and restores a full Trackson backup with preserved ids. */
export async function runTracksonImport(
  uid: string,
  data: TracksonExport,
): Promise<TracksonImportResult> {
  await deleteAllUserData(uid);

  const ops: { ref: DocumentReference; data: Record<string, unknown> }[] = [];

  for (const item of data.equipment) {
    const { id, ...payload } = item;
    ops.push({
      ref: doc(equipmentCol(uid), id),
      data: stripUndefined(payload),
    });
  }

  for (const item of data.flights) {
    const { id, ...payload } = item;
    ops.push({
      ref: doc(flightsCol(uid), id),
      data: stripUndefined(payload),
    });
  }

  for (const item of data.expenses) {
    const { id, ...payload } = item;
    ops.push({
      ref: doc(expensesCol(uid), id),
      data: stripUndefined(payload),
    });
  }

  await commitBatchedSets(ops);

  await setDoc(userDoc(uid), stripUndefined(data.settings));

  return {
    equipmentWritten: data.equipment.length,
    flightsWritten: data.flights.length,
    expensesWritten: data.expenses.length,
  };
}
