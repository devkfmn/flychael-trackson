import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useEquipment, useFlights, useSettings } from '../data/hooks';
import { equipmentLabel, maintenanceFor } from '../domain/equipment';
import type { MaintenanceResult } from '../domain/maintenance';
import type { Equipment } from '../types';
import { EmptyState, PageHeader, Spinner, StatusPill } from '../components/ui';
import { formatSwissDate } from '../utils/dates';

interface Row {
  eq: Equipment;
  result: MaintenanceResult;
}

export function Maintenance() {
  const { data: equipment, loading } = useEquipment();
  const { data: flights } = useFlights();
  const { settings } = useSettings();

  const rows = useMemo<Row[]>(() => {
    const order = { overdue: 0, dueSoon: 1, unknown: 2, ok: 3 } as const;
    return equipment
      .filter((e) => e.status !== 'sold')
      .map((eq) => ({ eq, result: maintenanceFor(eq, flights, settings) }))
      .filter((r) => r.result.applicable)
      .sort(
        (a, b) =>
          order[a.result.status] - order[b.result.status] ||
          (a.result.binding?.remaining ?? 0) - (b.result.binding?.remaining ?? 0),
      );
  }, [equipment, flights, settings]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Maintenance"
        subtitle="Checks and reserve repacks across your active gear"
      />

      {loading ? (
        <Spinner label="Calculating…" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nothing to track"
          hint="Add paragliders, harnesses or reserves to see maintenance status."
        />
      ) : (
        <div className="space-y-2">
          {rows.map(({ eq, result }) => (
            <Link
              key={eq.id}
              to={`/equipment/${eq.id}`}
              className="card block transition hover:border-"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{equipmentLabel(eq)}</p>
                  <p className="mt-0.5 text-xs text-">
                    {result.reason}
                    {result.dueDateISO
                      ? ` · Due ${formatSwissDate(result.dueDateISO)}`
                      : ''}
                  </p>
                </div>
                <StatusPill status={result.status} />
              </div>

              {result.dimensions.length > 0 && (
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {result.dimensions.map((d) => {
                    const pct = Math.max(
                      0,
                      Math.min(100, (d.used / d.threshold) * 100),
                    );
                    return (
                      <div key={d.metric}>
                        <div className="flex justify-between text-[11px] text-">
                          <span className="capitalize">{d.metric}</span>
                          <span className="tabular-nums">
                            {Math.round(d.used * 10) / 10}/{d.threshold}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 100
                                ? 'bg-'
                                : pct >= 85
                                  ? 'bg-'
                                  : 'bg-'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
