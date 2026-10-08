import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { stripUndefined } from '../data/stripUndefined.js';
import type { Equipment, Expense, Flight, UserSettings } from '../types/index.js';

type StoredEquipment = Omit<Equipment, 'id'>;
type StoredExpense = Omit<Expense, 'id'>;
type StoredFlight = Omit<Flight, 'id'>;
import {
  equipmentFromDoc,
  expenseFromDoc,
  flightFromDoc,
  settingsFromDoc,
} from './serialize.js';

export interface TracksonStore {
  listFlights(): Promise<Flight[]>;
  getFlight(id: string): Promise<Flight | null>;
  createFlight(data: StoredFlight): Promise<Flight>;
  updateFlight(id: string, patch: Partial<StoredFlight>): Promise<Flight>;
  deleteFlight(id: string): Promise<void>;

  listEquipment(): Promise<Equipment[]>;
  getEquipment(id: string): Promise<Equipment | null>;
  createEquipment(data: StoredEquipment): Promise<Equipment>;
  updateEquipment(
    id: string,
    patch: Partial<StoredEquipment>,
  ): Promise<Equipment>;
  deleteEquipment(id: string): Promise<void>;

  listExpenses(): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | null>;
  createExpense(data: StoredExpense): Promise<Expense>;
  updateExpense(id: string, patch: Partial<StoredExpense>): Promise<Expense>;
  deleteExpense(id: string): Promise<void>;

  getSettings(): Promise<UserSettings>;
  saveSettings(settings: UserSettings): Promise<UserSettings>;
}

function parseServiceAccount(): object {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON is not set. Add the Firebase service account JSON on the Vercel project.',
    );
  }
  try {
    return JSON.parse(raw) as object;
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.');
  }
}

function getAdminDb(): Firestore {
  if (!getApps().length) {
    const account = parseServiceAccount() as {
      project_id?: string;
    } & Parameters<typeof cert>[0];
    initializeApp({
      credential: cert(account),
      projectId: account.project_id,
    });
  }
  return getFirestore();
}

function ownerUid(): string {
  const uid = process.env.MCP_USER_UID;
  if (!uid) {
    throw new Error(
      'MCP_USER_UID is not set. Set it to Andreas\'s Firebase Auth uid on the Vercel project.',
    );
  }
  return uid;
}

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
}

export function createFirestoreStore(
  db: Firestore = getAdminDb(),
  uid: string = ownerUid(),
): TracksonStore {
  const user = db.collection('users').doc(uid);
  const flights = user.collection('flights');
  const equipment = user.collection('equipment');
  const expenses = user.collection('expenses');

  return {
    async listFlights() {
      const snap = await flights.get();
      return snap.docs.map((d) => flightFromDoc(d.id, asRecord(d.data())));
    },
    async getFlight(id) {
      const snap = await flights.doc(id).get();
      if (!snap.exists) return null;
      return flightFromDoc(snap.id, asRecord(snap.data()));
    },
    async createFlight(data) {
      const ref = await flights.add(stripUndefined(data));
      const snap = await ref.get();
      return flightFromDoc(ref.id, asRecord(snap.data()));
    },
    async updateFlight(id, patch) {
      const ref = flights.doc(id);
      await ref.update(stripUndefined(patch));
      const snap = await ref.get();
      return flightFromDoc(id, asRecord(snap.data()));
    },
    async deleteFlight(id) {
      await flights.doc(id).delete();
    },

    async listEquipment() {
      const snap = await equipment.get();
      return snap.docs.map((d) => equipmentFromDoc(d.id, asRecord(d.data())));
    },
    async getEquipment(id) {
      const snap = await equipment.doc(id).get();
      if (!snap.exists) return null;
      return equipmentFromDoc(snap.id, asRecord(snap.data()));
    },
    async createEquipment(data) {
      const ref = await equipment.add(stripUndefined(data));
      const snap = await ref.get();
      return equipmentFromDoc(ref.id, asRecord(snap.data()));
    },
    async updateEquipment(id, patch) {
      const ref = equipment.doc(id);
      await ref.update(stripUndefined(patch));
      const snap = await ref.get();
      return equipmentFromDoc(id, asRecord(snap.data()));
    },
    async deleteEquipment(id) {
      await equipment.doc(id).delete();
    },

    async listExpenses() {
      const snap = await expenses.get();
      return snap.docs.map((d) => expenseFromDoc(d.id, asRecord(d.data())));
    },
    async getExpense(id) {
      const snap = await expenses.doc(id).get();
      if (!snap.exists) return null;
      return expenseFromDoc(snap.id, asRecord(snap.data()));
    },
    async createExpense(data) {
      const ref = await expenses.add(stripUndefined(data));
      const snap = await ref.get();
      return expenseFromDoc(ref.id, asRecord(snap.data()));
    },
    async updateExpense(id, patch) {
      const ref = expenses.doc(id);
      await ref.update(stripUndefined(patch));
      const snap = await ref.get();
      return expenseFromDoc(id, asRecord(snap.data()));
    },
    async deleteExpense(id) {
      await expenses.doc(id).delete();
    },

    async getSettings() {
      const snap = await user.get();
      return settingsFromDoc(asRecord(snap.data()));
    },
    async saveSettings(settings) {
      await user.set(stripUndefined(settings), { merge: true });
      const snap = await user.get();
      return settingsFromDoc(asRecord(snap.data()));
    },
  };
}

export function createMemoryStore(seed?: {
  flights?: Flight[];
  equipment?: Equipment[];
  expenses?: Expense[];
  settings?: UserSettings;
}): TracksonStore {
  const flights = new Map((seed?.flights ?? []).map((f) => [f.id, structuredClone(f)]));
  const equipment = new Map(
    (seed?.equipment ?? []).map((e) => [e.id, structuredClone(e)]),
  );
  const expenses = new Map(
    (seed?.expenses ?? []).map((e) => [e.id, structuredClone(e)]),
  );
  let settings: UserSettings = settingsFromDoc(
    (seed?.settings ?? {}) as unknown as Record<string, unknown>,
  );
  let seq = 1;
  const nextId = () => `mem_${seq++}`;

  return {
    async listFlights() {
      return [...flights.values()].map((f) => structuredClone(f));
    },
    async getFlight(id) {
      const f = flights.get(id);
      return f ? structuredClone(f) : null;
    },
    async createFlight(data) {
      const id = nextId();
      const doc = { id, ...data };
      flights.set(id, doc);
      return structuredClone(doc);
    },
    async updateFlight(id, patch) {
      const current = flights.get(id);
      if (!current) throw new Error(`Flight ${id} not found`);
      const next = { ...current, ...patch };
      flights.set(id, next);
      return structuredClone(next);
    },
    async deleteFlight(id) {
      flights.delete(id);
    },

    async listEquipment() {
      return [...equipment.values()].map((e) => structuredClone(e));
    },
    async getEquipment(id) {
      const e = equipment.get(id);
      return e ? structuredClone(e) : null;
    },
    async createEquipment(data) {
      const id = nextId();
      const doc = { id, ...data };
      equipment.set(id, doc);
      return structuredClone(doc);
    },
    async updateEquipment(id, patch) {
      const current = equipment.get(id);
      if (!current) throw new Error(`Equipment ${id} not found`);
      const next = { ...current, ...patch };
      equipment.set(id, next);
      return structuredClone(next);
    },
    async deleteEquipment(id) {
      equipment.delete(id);
    },

    async listExpenses() {
      return [...expenses.values()].map((e) => structuredClone(e));
    },
    async getExpense(id) {
      const e = expenses.get(id);
      return e ? structuredClone(e) : null;
    },
    async createExpense(data) {
      const id = nextId();
      const doc = { id, ...data };
      expenses.set(id, doc);
      return structuredClone(doc);
    },
    async updateExpense(id, patch) {
      const current = expenses.get(id);
      if (!current) throw new Error(`Expense ${id} not found`);
      const next = { ...current, ...patch };
      expenses.set(id, next);
      return structuredClone(next);
    },
    async deleteExpense(id) {
      expenses.delete(id);
    },

    async getSettings() {
      return structuredClone(settings);
    },
    async saveSettings(next) {
      settings = structuredClone(next);
      return structuredClone(settings);
    },
  };
}
