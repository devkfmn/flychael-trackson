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

export { stripUndefined } from './stripUndefined';
