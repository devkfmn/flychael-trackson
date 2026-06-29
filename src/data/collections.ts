import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Equipment, Expense, Flight, UserSettings } from '../types';

// Firestore stores documents without their own `id` field; the id comes from
// the document key. These helper types describe the stored payload shape.
export type StoredEquipment = Omit<Equipment, 'id'>;
export type StoredFlight = Omit<Flight, 'id'>;
export type StoredExpense = Omit<Expense, 'id'>;

export function userDoc(uid: string): DocumentReference<UserSettings> {
  return doc(db, 'users', uid) as DocumentReference<UserSettings>;
}

export function equipmentCol(uid: string): CollectionReference<StoredEquipment> {
  return collection(
    db,
    'users',
    uid,
    'equipment',
  ) as CollectionReference<StoredEquipment>;
}

export function flightsCol(uid: string): CollectionReference<StoredFlight> {
  return collection(
    db,
    'users',
    uid,
    'flights',
  ) as CollectionReference<StoredFlight>;
}

export function expensesCol(uid: string): CollectionReference<StoredExpense> {
  return collection(
    db,
    'users',
    uid,
    'expenses',
  ) as CollectionReference<StoredExpense>;
}

/** Remove `undefined` values; Firestore rejects them (use `null` instead). */
export function stripUndefined<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}
