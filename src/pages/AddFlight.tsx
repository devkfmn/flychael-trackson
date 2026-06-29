import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { createFlight, useEquipment, useFlights, useSettings } from '../data/hooks';
import { computePrefill } from '../domain/prefill';
import type { FlightFormValues } from '../lib/schemas';
import type { StoredFlight } from '../data/collections';
import { FlightForm, type FlightSubmit } from '../components/FlightForm';
import { PageHeader, Spinner } from '../components/ui';
import { todayISO } from '../utils/dates';

export function AddFlight() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: equipment, loading: eqLoading } = useEquipment();
  const { data: flights, loading: flLoading } = useFlights();
  const { settings, loading: setLoading } = useSettings();

  const today = todayISO();

  const prefill = useMemo(
    () => computePrefill(flights, today, settings.defaults),
    [flights, today, settings.defaults],
  );

  const initial = useMemo<FlightFormValues>(
    () => ({
      dateISO: today,
      time: '',
      takeoff: prefill.takeoff.value ?? '',
      landing: prefill.landing.value ?? '',
      paragliderId: prefill.paragliderId.value ?? '',
      harnessId: prefill.harnessId.value ?? '',
      airtimeMinutes: '',
      comments: '',
      distanceKm: '',
      altitudeGainM: '',
    }),
    [prefill, today],
  );

  if (eqLoading || flLoading || setLoading) {
    return <Spinner label="Preparing…" />;
  }

  async function onSubmit({ values, igc, track }: FlightSubmit) {
    if (!user) return;
    const now = Date.now();
    const payload: StoredFlight = {
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
      track,
      igc,
      source: igc ? 'igc' : 'manual',
      createdAt: now,
      updatedAt: now,
    };
    await createFlight(user.uid, payload);
    navigate('/flights');
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Add flight"
        subtitle="Suggestions are shown as chips — tap to apply, edit anything."
      />
      <FlightForm
        equipment={equipment}
        initial={initial}
        prefill={prefill}
        showIgc
        submitLabel="Save flight"
        onSubmit={onSubmit}
        onCancel={() => navigate('/flights')}
      />
    </div>
  );
}
