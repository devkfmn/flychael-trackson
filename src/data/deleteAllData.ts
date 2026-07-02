import {
  deleteDoc,
  getDocs,
  writeBatch,
  type CollectionReference,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  equipmentCol,
  expensesCol,
  flightsCol,
  userDoc,
} from './collections';

const BATCH_LIMIT = 450;

async function deleteCollection(
  col: CollectionReference,
): Promise<void> {
  const snap = await getDocs(col);
  const refs = snap.docs.map((d) => d.ref);
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const ref of refs.slice(i, i + BATCH_LIMIT)) {
      batch.delete(ref);
    }
    await batch.commit();
  }
}

/** Permanently removes all user-owned Firestore data. */
export async function deleteAllUserData(uid: string): Promise<void> {
  await deleteCollection(equipmentCol(uid));
  await deleteCollection(flightsCol(uid));
  await deleteCollection(expensesCol(uid));
  await deleteDoc(userDoc(uid));
}
