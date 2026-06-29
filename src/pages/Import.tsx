import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useSettings } from '../data/hooks';
import { mapParafolio, type MappedImport } from '../features/import/parafolio';
import { runImport } from '../features/import/runImport';
import { Badge, PageHeader, Stat } from '../components/ui';
import { AlertIcon } from '../components/icons';
import { formatSwissDate } from '../utils/dates';

type Phase = 'idle' | 'preview' | 'importing' | 'done' | 'error';

export function ImportPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [phase, setPhase] = useState<Phase>('idle');
  const [mapped, setMapped] = useState<MappedImport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReimport, setConfirmReimport] = useState(false);
  const [result, setResult] = useState<{ e: number; f: number } | null>(null);

  const alreadyImported = settings.importedAt != null;

  async function onFile(file: File) {
    setError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setMapped(mapParafolio(parsed));
      setPhase('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read file.');
      setPhase('error');
    }
  }

  async function doImport() {
    if (!user || !mapped) return;
    setPhase('importing');
    try {
      const r = await runImport(user.uid, mapped);
      setResult({ e: r.equipmentWritten, f: r.flightsWritten });
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.');
      setPhase('error');
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Import"
        subtitle="One-time import of your Parafolio export (parafolio_data.json)"
      />

      {alreadyImported && phase !== 'done' && (
        <div className="card mb-5 border-warn/40 bg-warn/10">
          <p className="text-sm font-medium text-warn">
            You already imported on {formatSwissDate(
              new Date(settings.importedAt as number).toISOString().slice(0, 10),
            )}
            .
          </p>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmReimport}
              onChange={(e) => setConfirmReimport(e.target.checked)}
            />
            I understand re-importing will add duplicate records.
          </label>
        </div>
      )}

      {(phase === 'idle' || phase === 'error') && (
        <div className="card">
          <label className="label">Select your parafolio_data.json file</label>
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          <p className="mt-2 text-xs text-muted">
            Old app tags (e.g. Horus) are ignored. Pilot, paragliders, harnesses,
            reserves and flights are normalized into your account.
          </p>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </div>
      )}

      {phase === 'preview' && mapped && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Paragliders" value={mapped.stats.paragliders} />
            <Stat label="Harnesses" value={mapped.stats.harnesses} />
            <Stat label="Reserves" value={mapped.stats.reserves} />
            <Stat label="Flights" value={mapped.stats.flights} />
          </div>

          <div className="card">
            <p className="text-sm">
              Pilot:{' '}
              <span className="font-semibold">
                {mapped.pilot.name || '—'}
              </span>
              {mapped.pilot.shvNr ? ` · SHV ${mapped.pilot.shvNr}` : ''}
            </p>
            {mapped.stats.earliestDate && (
              <p className="mt-1 text-xs text-muted">
                Flights from {formatSwissDate(mapped.stats.earliestDate)} to{' '}
                {formatSwissDate(mapped.stats.latestDate)}
              </p>
            )}
          </div>

          {mapped.warnings.length > 0 && (
            <div className="card">
              <div className="mb-2 flex items-center gap-2">
                <AlertIcon width={16} height={16} className="text-warn" />
                <p className="text-sm font-semibold">
                  {mapped.warnings.length} data quality warning
                  {mapped.warnings.length > 1 ? 's' : ''}
                </p>
              </div>
              <div className="max-h-60 space-y-1 overflow-auto">
                {mapped.warnings.map((w, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted">{w.message}</span>
                    <Badge tone="warn">{w.kind}</Badge>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">
                Warnings are informational — the import will still proceed.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => void doImport()}
              disabled={alreadyImported && !confirmReimport}
              className="btn-primary flex-1"
            >
              Import {mapped.stats.flights} flights & {mapped.equipment.length} items
            </button>
            <button onClick={() => setPhase('idle')} className="btn-ghost">
              Choose another file
            </button>
          </div>
        </div>
      )}

      {phase === 'importing' && (
        <div className="card">
          <p className="text-sm">Importing… this may take a moment.</p>
        </div>
      )}

      {phase === 'done' && result && (
        <div className="card border-ok/40 bg-ok/10">
          <p className="font-semibold text-ok">Import complete</p>
          <p className="mt-1 text-sm text-muted">
            Imported {result.e} equipment items and {result.f} flights.
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
    </div>
  );
}
