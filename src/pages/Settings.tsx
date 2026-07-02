import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../lib/auth';
import { saveSettings, useEquipment, useSettings } from '../data/hooks';
import { settingsFormSchema, type SettingsFormValues } from '../lib/schemas';
import { selectableByType } from '../domain/equipment';
import { equipmentLabel, equipmentStatusSuffix } from '../domain/equipment';
import {
  DEFAULT_MAINTENANCE_DEFAULTS,
  type UserSettings,
} from '../types';
import { Field, PageHeader, Spinner } from '../components/ui';

export function Settings() {
  const { user } = useAuth();
  const { data: equipment } = useEquipment();
  const { settings, loading } = useSettings();
  const [saved, setSaved] = useState(false);

  const wings = selectableByType(equipment, 'paraglider');
  const harnesses = selectableByType(equipment, 'harness');

  const { register, handleSubmit, reset } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: toForm(settings),
  });

  useEffect(() => {
    if (!loading) reset(toForm(settings));
  }, [settings, loading, reset]);

  if (loading) return <Spinner label="Loading settings…" />;

  async function onSubmit(values: SettingsFormValues) {
    if (!user) return;
    const p = settingsFormSchema.parse(values);
    const next: UserSettings = {
      pilot: {
        name: p.pilotName ?? '',
        shvNr: p.shvNr,
        dateOfIssueISO: p.dateOfIssueISO,
      },
      defaults: {
        paragliderId: p.defaultParagliderId,
        harnessId: p.defaultHarnessId,
        takeoff: p.defaultTakeoff,
        landing: p.defaultLanding,
      },
      currency: p.currency,
      maintenanceDefaults: {
        wing: {
          months: p.wingMonths ?? DEFAULT_MAINTENANCE_DEFAULTS.wing.months,
          flights: p.wingFlights ?? DEFAULT_MAINTENANCE_DEFAULTS.wing.flights,
          hours: p.wingHours ?? DEFAULT_MAINTENANCE_DEFAULTS.wing.hours,
        },
        harness: {
          months: p.harnessMonths ?? DEFAULT_MAINTENANCE_DEFAULTS.harness.months,
          flights: p.harnessFlights ?? DEFAULT_MAINTENANCE_DEFAULTS.harness.flights,
          hours: p.harnessHours ?? DEFAULT_MAINTENANCE_DEFAULTS.harness.hours,
        },
        reserve: {
          months: p.reserveMonths ?? DEFAULT_MAINTENANCE_DEFAULTS.reserve.months,
          flights: null,
          hours: null,
        },
      },
      importedAt: settings.importedAt,
    };
    await saveSettings(user.uid, next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" subtitle="Pilot profile, defaults and maintenance rules" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="card space-y-4">
          <h2 className="font-semibold">Pilot</h2>
          <Field label="Name">
            <input className="input" {...register('pilotName')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="SHV number">
              <input className="input" {...register('shvNr')} />
            </Field>
            <Field label="License issued">
              <input type="date" className="input" {...register('dateOfIssueISO')} />
            </Field>
          </div>
          <Field label="Currency">
            <input className="input" {...register('currency')} />
          </Field>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">Default setup</h2>
          <p className="-mt-2 text-xs text-muted">
            Used as the baseline for Add Flight suggestions and trip-mode
            detection.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Default wing">
              <select className="input" {...register('defaultParagliderId')}>
                <option value="">— None —</option>
                {wings.map((w) => (
                  <option key={w.id} value={w.id}>
                    {equipmentLabel(w)}
                    {equipmentStatusSuffix(w)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Default harness">
              <select className="input" {...register('defaultHarnessId')}>
                <option value="">— None —</option>
                {harnesses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {equipmentLabel(h)}
                    {equipmentStatusSuffix(h)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Default takeoff">
              <input className="input" {...register('defaultTakeoff')} />
            </Field>
            <Field label="Default landing">
              <input className="input" {...register('defaultLanding')} />
            </Field>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">Maintenance defaults</h2>
          <p className="-mt-2 text-xs text-muted">
            Wings and harnesses are due at the first threshold reached. Reserves
            use repack interval only.
          </p>
          <h3 className="text-sm font-medium">Wing</h3>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Months">
              <input className="input" inputMode="numeric" {...register('wingMonths')} />
            </Field>
            <Field label="Flights">
              <input className="input" inputMode="numeric" {...register('wingFlights')} />
            </Field>
            <Field label="Hours">
              <input className="input" inputMode="numeric" {...register('wingHours')} />
            </Field>
          </div>
          <h3 className="text-sm font-medium">Harness</h3>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Months">
              <input className="input" inputMode="numeric" {...register('harnessMonths')} />
            </Field>
            <Field label="Flights">
              <input className="input" inputMode="numeric" {...register('harnessFlights')} />
            </Field>
            <Field label="Hours">
              <input className="input" inputMode="numeric" {...register('harnessHours')} />
            </Field>
          </div>
          <Field label="Reserve repack (months)">
            <input className="input" inputMode="numeric" {...register('reserveMonths')} />
          </Field>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary">
            Save settings
          </button>
          {saved && <span className="text-sm text-ok">Saved.</span>}
        </div>
      </form>
    </div>
  );
}

function toForm(s: UserSettings): SettingsFormValues {
  return {
    pilotName: s.pilot.name ?? '',
    shvNr: s.pilot.shvNr ?? '',
    dateOfIssueISO: s.pilot.dateOfIssueISO ?? '',
    defaultParagliderId: s.defaults.paragliderId ?? '',
    defaultHarnessId: s.defaults.harnessId ?? '',
    defaultTakeoff: s.defaults.takeoff ?? '',
    defaultLanding: s.defaults.landing ?? '',
    currency: s.currency,
    wingMonths: s.maintenanceDefaults.wing.months ?? '',
    wingFlights: s.maintenanceDefaults.wing.flights ?? '',
    wingHours: s.maintenanceDefaults.wing.hours ?? '',
    harnessMonths: s.maintenanceDefaults.harness.months ?? '',
    harnessFlights: s.maintenanceDefaults.harness.flights ?? '',
    harnessHours: s.maintenanceDefaults.harness.hours ?? '',
    reserveMonths: s.maintenanceDefaults.reserve.months ?? '',
  };
}
