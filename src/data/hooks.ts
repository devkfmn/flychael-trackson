import { useEffect, useState } from 'react';
import {
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { useAuth } from '../lib/auth';
import {
  DEFAULT_MAINTENANCE_DEFAULTS,
  DEFAULT_SETTINGS,
  type Equipment,
  type Expense,
  type Flight,
  type MaintenanceDefaults,
  type MaintenanceRule,
  type UserSettings,
} from '../types';
import {
  equipmentCol,
  expensesCol,
  flightsCol,
  stripUndefined,
  userDoc,
  type StoredEquipment,
  type StoredExpense,
  type StoredFlight,
} from './collections';

interface ListState<T> {
  data: T[];
  loading: boolean;
}

export function useSettings(): {
  settings: UserSettings;
  loading: boolean;
  exists: boolean;
} {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    return onSnapshot(userDoc(user.uid), (snap) => {
      if (snap.exists()) {
        const raw = snap.data() as Partial<UserSettings>;
        setSettings(mergeSettings(raw));
        setExists(true);
      } else {
        setSettings(DEFAULT_SETTINGS);
        setExists(false);
      }
      setLoading(false);
    });
  }, [user]);

  return { settings, loading, exists };
}

function mergeSettings(raw: Partial<UserSettings>): UserSettings {
  const legacy = (
    raw.maintenanceDefaults as
      | (Partial<MaintenanceDefaults> & { wingHarness?: MaintenanceRule })
      | undefined
  )?.wingHarness;

  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    pilot: { ...DEFAULT_SETTINGS.pilot, ...raw.pilot },
    defaults: { ...DEFAULT_SETTINGS.defaults, ...raw.defaults },
    maintenanceDefaults: {
      wing: {
        ...DEFAULT_MAINTENANCE_DEFAULTS.wing,
        ...legacy,
        ...raw.maintenanceDefaults?.wing,
      },
      harness: {
        ...DEFAULT_MAINTENANCE_DEFAULTS.harness,
        ...legacy,
        ...raw.maintenanceDefaults?.harness,
      },
      reserve: {
        ...DEFAULT_MAINTENANCE_DEFAULTS.reserve,
        ...raw.maintenanceDefaults?.reserve,
      },
    },
  };
}

export function useEquipment(): ListState<Equipment> {
  const { user } = useAuth();
  const [state, setState] = useState<ListState<Equipment>>({
    data: [],
    loading: true,
  });

  useEffect(() => {
    if (!user) return;
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(equipmentCol(user.uid), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Equipment);
      data.sort(
        (a, b) =>
          a.type.localeCompare(b.type) ||
          `${a.producer} ${a.model}`.localeCompare(`${b.producer} ${b.model}`),
      );
      setState({ data, loading: false });
    });
  }, [user]);

  return state;
}

export function useFlights(): ListState<Flight> {
  const { user } = useAuth();
  const [state, setState] = useState<ListState<Flight>>({
    data: [],
    loading: true,
  });

  useEffect(() => {
    if (!user) return;
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(flightsCol(user.uid), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Flight);
      data.sort((a, b) => sortFlightKey(b).localeCompare(sortFlightKey(a)));
      setState({ data, loading: false });
    });
  }, [user]);

  return state;
}

function sortFlightKey(f: Flight): string {
  return `${f.dateISO} ${f.time ?? '00:00'}`;
}

export function useExpenses(): ListState<Expense> {
  const { user } = useAuth();
  const [state, setState] = useState<ListState<Expense>>({
    data: [],
    loading: true,
  });

  useEffect(() => {
    if (!user) return;
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(expensesCol(user.uid), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense);
      data.sort((a, b) => b.dateISO.localeCompare(a.dateISO));
      setState({ data, loading: false });
    });
  }, [user]);

  return state;
}

// ---- Writers -------------------------------------------------------------

export async function saveSettings(
  uid: string,
  settings: UserSettings,
): Promise<void> {
  await setDoc(userDoc(uid), stripUndefined(settings), { merge: true });
}

export async function createEquipment(
  uid: string,
  data: StoredEquipment,
): Promise<string> {
  const ref = await addDoc(equipmentCol(uid), stripUndefined(data));
  return ref.id;
}

export async function updateEquipment(
  uid: string,
  id: string,
  data: Partial<StoredEquipment>,
): Promise<void> {
  await updateDoc(
    doc(equipmentCol(uid), id),
    stripUndefined({ ...data, updatedAt: Date.now() }),
  );
}

export async function deleteEquipment(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(equipmentCol(uid), id));
}

export async function createFlight(
  uid: string,
  data: StoredFlight,
): Promise<string> {
  const ref = await addDoc(flightsCol(uid), stripUndefined(data));
  return ref.id;
}

export async function updateFlight(
  uid: string,
  id: string,
  data: Partial<StoredFlight>,
): Promise<void> {
  await updateDoc(
    doc(flightsCol(uid), id),
    stripUndefined({ ...data, updatedAt: Date.now() }),
  );
}

export async function deleteFlight(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(flightsCol(uid), id));
}

export async function createExpense(
  uid: string,
  data: StoredExpense,
): Promise<string> {
  const ref = await addDoc(expensesCol(uid), stripUndefined(data));
  return ref.id;
}

export async function updateExpense(
  uid: string,
  id: string,
  data: Partial<StoredExpense>,
): Promise<void> {
  await updateDoc(doc(expensesCol(uid), id), stripUndefined(data));
}

export async function deleteExpense(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(expensesCol(uid), id));
}

export { deleteAllUserData } from './deleteAllData';
