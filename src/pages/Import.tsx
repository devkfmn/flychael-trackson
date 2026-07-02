import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import {
  useEquipment,
  useExpenses,
  useFlights,
  useSettings,
} from '../data/hooks';
import { runTracksonImport } from '../features/import/runTracksonImport';
import { parseTracksonExport } from '../features/import/tracksonImport';
import {
  buildTracksonExport,
  downloadTracksonExport,
  type TracksonExport,
} from '../features/export/tracksonExport';
import { PageHeader, Stat } from '../components/ui';
import { formatSwissDate } from '../utils/dates';

type Phase = 'idle' | 'preview' | 'importing' | 'done' | 'error';

interface RestoreResult {
  equipment: number;
  flights: number;
  expenses: number;
}

export function ImportPage() {
  const { user } = useAuth();
  const { settings, loading: settingsLoading, exists: settingsExists } =
    useSettings();
  const { data: equipment, loading: equipmentLoading } = useEquipment();
  const { data: flights, loading: flightsLoading } = useFlights();
  const { data: expenses, loading: expensesLoading } = useExpenses();
  const [phase, setPhase] = useState<Phase>('idle');
  const [preview, setPreview] = useState<TracksonExport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [result, setResult] = useState<RestoreResult | null>(null);

  const hasExistingData =
    equipment.length > 0 ||
    flights.length > 0 ||
    expenses.length > 0 ||
    settingsExists;
  const exportLoading =
    settingsLoading ||
    equipmentLoading ||
    flightsLoading ||
    expensesLoading;
  const restoreBlocked = hasExistingData && !confirmReplace;

  function resetToIdle() {
    setPhase('idle');
    setPreview(null);
    setConfirmReplace(false);
  }

  function onExport() {
    if (exportLoading) return;
    downloadTracksonExport(
      buildTracksonExport(settings, equipment, flights, expenses),
    );
  }

  async function onFile(file: File) {
    setError(null);
    setConfirmReplace(false);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setPreview(parseTracksonExport(parsed));
      setPhase('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read file.');
      setPhase('error');
    }
  }

  async function doRestore() {
    if (!user || !preview || restoreBlocked) return;
    setPhase('importing');
    try {
      const r = await runTracksonImport(user.uid, preview);
      setResult({
        equipment: r.equipmentWritten,
        flights: r.flightsWritten,
        expenses: r.expensesWritten,
      });
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed.');
      setPhase('error');
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Import/Export"
        subtitle="Download or restore a full Trackson backup"
      />

      {(phase === 'idle' || phase === 'error') && (
        <div className="card">
          <h2 className="mb-3 font-semibold">Import</h2>
          <label className="label">Select a Trackson backup file</label>
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          <p className="mt-2 text-xs text-muted">
            Choose a trackson-export-*.json file. Restoring a backup fully
            replaces existing data in your account.
          </p>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </div>
      )}

      {phase === 'preview' && preview && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Equipment" value={preview.equipment.length} />
            <Stat label="Flights" value={preview.flights.length} />
            <Stat label="Expenses" value={preview.expenses.length} />
          </div>

          <div className="card">
            <p className="text-sm">
              Pilot:{' '}
              <span className="font-semibold">
                {preview.settings.pilot.name || '—'}
              </span>
              {preview.settings.pilot.shvNr
                ? ` · SHV ${preview.settings.pilot.shvNr}`
                : ''}
            </p>
            <p className="mt-1 text-xs text-muted">
              Exported on{' '}
              {formatSwissDate(
                new Date(preview.exportedAt).toISOString().slice(0, 10),
              )}
            </p>
          </div>

          <div className="card border-danger/40 bg-danger/10">
            <p className="text-sm font-medium text-danger">
              This will permanently replace all data in your account.
            </p>
            {hasExistingData && (
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={confirmReplace}
                  onChange={(e) => setConfirmReplace(e.target.checked)}
                />
                I understand this will delete my current data and restore the
                backup.
              </label>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => void doRestore()}
              disabled={restoreBlocked}
              className="btn-primary flex-1"
            >
              Restore backup
            </button>
            <button onClick={resetToIdle} className="btn-ghost">
              Choose another file
            </button>
          </div>
        </div>
      )}

      {phase === 'importing' && (
        <div className="card">
          <p className="text-sm">Restoring… this may take a moment.</p>
        </div>
      )}

      {phase === 'done' && result && (
        <div className="card border-ok/40 bg-ok/10">
          <p className="font-semibold text-ok">Restore complete</p>
          <p className="mt-1 text-sm text-muted">
            Restored {result.equipment} equipment items, {result.flights}{' '}
            flights, and {result.expenses} expenses.
          </p>
          <div className="mt-3 flex gap-2">
            <Link to="/" className="btn-primary">
              Go to dashboard
            </Link>
            <Link to="/flights" className="btn-ghost">
              View flights
            </Link>
          </div>
        </div>
      )}

      <div className="card mt-8 space-y-4">
        <h2 className="font-semibold">Export</h2>
        <p className="text-sm text-muted">
          Download a JSON backup of all settings, equipment, flights, and
          expenses.
        </p>
        <p className="text-xs text-muted">
          {equipment.length} equipment · {flights.length} flights ·{' '}
          {expenses.length} expenses
        </p>
        <button
          type="button"
          className="btn-ghost"
          disabled={exportLoading}
          onClick={onExport}
        >
          Export all data
        </button>
      </div>
    </div>
  );
}
