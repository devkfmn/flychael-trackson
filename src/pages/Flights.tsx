import { Link } from 'react-router-dom';
import { useEquipment, useFlights } from '../data/hooks';
import { equipmentLabel, equipmentMap, isBorrowed } from '../domain/equipment';
import { EmptyState, PageHeader, Spinner } from '../components/ui';
import { AddIcon } from '../components/icons';
import { formatAirtime } from '../utils/format';
import { formatSwissDate } from '../utils/dates';
import type { Equipment, Flight } from '../types';

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
          hint="Log your first flight or restore a backup from Import/Export."
          action={
            <Link to="/flights/new" className="btn-primary">
              Add flight
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {flights.map((f, index) => (
            <FlightRow
              key={f.id}
              flight={f}
              flightNumber={flights.length - index}
              wing={f.paragliderId ? byId.get(f.paragliderId) : undefined}
              harness={f.harnessId ? byId.get(f.harnessId) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FlightRow({
  flight,
  flightNumber,
  wing,
  harness,
}: {
  flight: Flight;
  flightNumber: number;
  wing?: Equipment;
  harness?: Equipment;
}) {
  const gear = [gearName(wing), gearName(harness)].filter(Boolean).join(' · ');
  const meta = [
    formatSwissDate(flight.dateISO),
    flight.time,
    formatAirtime(flight.airtimeMinutes),
    flight.distanceKm != null ? `${flight.distanceKm} km` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link
      to={`/flights/${flight.id}`}
      className="@container card flex items-center gap-4 transition hover:border-brand"
    >
      <span className="w-13 shrink-0 text-right text-base font-bold tabular-nums">
        #{flightNumber}
      </span>
      <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-4 gap-y-0.5 @[40rem]:grid-cols-2">
        <p className="text-xs text-muted">{meta}</p>
        <p className="text-left text-xs text-muted @[40rem]:col-start-1 @[40rem]:row-start-2">
          {flight.takeoff} <span>→</span> {flight.landing}
        </p>
        {gear && (
          <p className="truncate text-xs text-muted @[40rem]:col-start-2 @[40rem]:row-start-1 @[40rem]:text-right">
            {gear}
          </p>
        )}
        {flight.comments && (
          <p className="line-clamp-2 text-xs text-muted @[40rem]:col-start-2 @[40rem]:row-start-2 @[40rem]:text-right">
            {flight.comments}
          </p>
        )}
      </div>
    </Link>
  );
}

function gearName(item: Equipment | undefined): string | null {
  if (!item) return null;
  return `${equipmentLabel(item)}${isBorrowed(item) ? ' (borrowed)' : ''}`;
}
