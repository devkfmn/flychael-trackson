import { Link } from 'react-router-dom';
import { useEquipment, useFlights } from '../data/hooks';
import { equipmentLabel, equipmentMap } from '../domain/equipment';
import { EmptyState, PageHeader, Spinner } from '../components/ui';
import { AddIcon } from '../components/icons';
import { formatAirtime } from '../utils/format';
import { formatSwissDate } from '../utils/dates';

export function Flights() {
  const { data: flights, loading } = useFlights();
  const { data: equipment } = useEquipment();
  const byId = equipmentMap(equipment);

  return (
    <div>
      <PageHeader
        title="Flights"
        subtitle={`${flights.length} logged`}
        actions={
          <Link to="/flights/new" className="btn-primary">
            <AddIcon width={16} height={16} /> Add
          </Link>
        }
      />

      {loading ? (
        <Spinner label="Loading flights…" />
      ) : flights.length === 0 ? (
        <EmptyState
          title="No flights yet"
          hint="Log your first flight or import your history."
          action={
            <Link to="/flights/new" className="btn-primary">
              Add flight
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {flights.map((f) => {
            const wing = f.paragliderId ? byId.get(f.paragliderId) : null;
            return (
              <Link
                key={f.id}
                to={`/flights/${f.id}`}
                className="card flex items-center justify-between gap-3 transition hover:border-"
              >
                <div className="min-w-0">
                  <p className="font-semibold">
                    {f.takeoff} <span className="text-">→</span>{' '}
                    {f.landing}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-">
                    {formatSwissDate(f.dateISO)}
                    {f.time ? ` · ${f.time}` : ''}
                    {wing ? ` · ${equipmentLabel(wing)}` : ''}
                    {f.source === 'igc' ? ' · IGC' : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold tabular-nums">
                    {formatAirtime(f.airtimeMinutes)}
                  </p>
                  {f.distanceKm != null && (
                    <p className="text-xs text-">{f.distanceKm} km</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
