import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import {
  deleteFlight,
  updateFlight,
  useEquipment,
  useFlights,
} from '../data/hooks';
import type { FlightFormValues } from '../lib/schemas';
import type { StoredFlight } from '../data/collections';
import { FlightForm, type FlightSubmit } from '../components/FlightForm';
import { PageHeader, Spinner } from '../components/ui';
import { TrashIcon } from '../components/icons';

export function FlightDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: flights, loading } = useFlights();
  const { data: equipment } = useEquipment();

  const flight = useMemo(
    () => flights.find((f) => f.id === id),
    [flights, id],
  );

  if (loading && !flight) return <Spinner label="Loading flight…" />;
  if (!flight) return <p className="text-muted">Flight not found.</p>;

  const initial: FlightFormValues = {
    dateISO: flight.dateISO,
    time: flight.time ?? '',
    takeoff: flight.takeoff,
    landing: flight.landing,
    paragliderId: flight.paragliderId ?? '',
    harnessId: flight.harnessId ?? '',
    airtimeMinutes: flight.airtimeMinutes,
    comments: flight.comments ?? '',
    distanceKm: flight.distanceKm ?? '',
    altitudeGainM: flight.altitudeGainM ?? '',
  };

  async function onSubmit({ values, igc, track }: FlightSubmit) {
    if (!user || !flight) return;
    const patch: Partial<StoredFlight> = {
      dateISO: values.dateISO,
      time: values.time,
      takeoff: values.takeoff,
      landing: values.landing,
      paragliderId: values.paragliderId,
      harnessId: values.harnessId,
      airtimeMinutes: values.airtimeMinutes,
      comments: values.comments,
      distanceKm: values.distanceKm,
      altitudeGainM: values.altitudeGainM,
      igc: igc ?? flight.igc,
      track: track ?? flight.track,
    };
    await updateFlight(user.uid, flight.id, patch);
    navigate('/flights');
  }

  async function onDelete() {
    if (!user || !flight) return;
    if (!confirm('Delete this flight?')) return;
    await deleteFlight(user.uid, flight.id);
    navigate('/flights');
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Edit flight"
        subtitle={`${flight.takeoff} → ${flight.landing}`}
        actions={
          <button onClick={() => void onDelete()} className="btn-danger">
            <TrashIcon width={16} height={16} /> Delete
          </button>
        }
      />
      <FlightForm
        equipment={equipment}
        initial={initial}
        showIgc
        submitLabel="Save changes"
        onSubmit={onSubmit}
        onCancel={() => navigate('/flights')}
        initialIgc={flight.igc}
        initialTrack={flight.track}
      />
    </div>
  );
}
