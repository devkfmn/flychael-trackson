import type {
  Equipment,
  Expense,
  Flight,
  UserSettings,
} from '../../types';
import { todayISO } from '../../utils/dates';

export interface TracksonExport {
  format: 'trackson';
  version: 1;
  exportedAt: number;
  settings: UserSettings;
  equipment: Equipment[];
  flights: Flight[];
  expenses: Expense[];
}

export function buildTracksonExport(
  settings: UserSettings,
  equipment: Equipment[],
  flights: Flight[],
  expenses: Expense[],
): TracksonExport {
  return {
    format: 'trackson',
    version: 1,
    exportedAt: Date.now(),
    settings,
    equipment,
    flights,
    expenses,
  };
}

export function downloadTracksonExport(exportData: TracksonExport): void {
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `trackson-export-${todayISO()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
