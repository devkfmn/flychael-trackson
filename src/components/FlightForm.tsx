import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { flightFormSchema, type FlightFormValues } from '../lib/schemas';
import type { Equipment, IgcMeta, TrackMeta } from '../types';
import { selectableByType, equipmentLabel } from '../domain/equipment';
import {
  SOURCE_LABELS,
  type PrefillField,
  type PrefillResult,
} from '../domain/prefill';
import { parseIgc } from '../utils/igc';
import { Field } from './ui';
import { CheckIcon } from './icons';

export interface FlightSubmit {
  values: ReturnType<typeof flightFormSchema.parse>;
  igc: IgcMeta | null;
  track: TrackMeta | null;
}

interface FlightFormProps {
  equipment: Equipment[];
  initial: FlightFormValues;
  prefill?: PrefillResult;
  showIgc?: boolean;
  submitLabel: string;
  onSubmit: (data: FlightSubmit) => Promise<void> | void;
  onCancel?: () => void;
  initialIgc?: IgcMeta | null;
  initialTrack?: TrackMeta | null;
}

/** Build a select option list including the current value even if sold. */
function gearOptions(
  equipment: Equipment[],
  type: 'paraglider' | 'harness',
  currentId: string | null,
): Equipment[] {
  const list = selectableByType(equipment, type);
  if (currentId && !list.some((e) => e.id === currentId)) {
    const cur = equipment.find((e) => e.id === currentId);
    if (cur) return [cur, ...list];
  }
  return list;
}

export function FlightForm({
  equipment,
  initial,
  prefill,
  showIgc,
  submitLabel,
  onSubmit,
  onCancel,
  initialIgc = null,
  initialTrack = null,
}: FlightFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FlightFormValues>({
    resolver: zodResolver(flightFormSchema),
    defaultValues: initial,
  });

  const [igc, setIgc] = useState<IgcMeta | null>(initialIgc);
  const [track, setTrack] = useState<TrackMeta | null>(initialTrack);
  const [igcInfo, setIgcInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const paragliderId = watch('paragliderId') ?? null;
  const harnessId = watch('harnessId') ?? null;

  const wings = gearOptions(equipment, 'paraglider', paragliderId);
  const harnesses = gearOptions(equipment, 'harness', harnessId);

  async function handleIgc(file: File) {
    const text = await file.text();
    const r = parseIgc(text, file.name);
    if (r.dateISO) setValue('dateISO', r.dateISO);
    if (r.startTime) setValue('time', r.startTime);
    if (r.airtimeMinutes != null) setValue('airtimeMinutes', r.airtimeMinutes);
    if (r.altitudeGainM != null) setValue('altitudeGainM', String(r.altitudeGainM));
    setIgc({ filename: r.filename, importedAt: Date.now() });
    setTrack({
      points: r.points,
      maxAltitudeM: r.maxAltitudeM,
      durationMinutes: r.airtimeMinutes,
    });
    setIgcInfo(
      `${r.filename}: ${r.points} points, ${r.airtimeMinutes ?? '?'} min` +
        (r.maxAltitudeM != null ? `, max ${r.maxAltitudeM} m` : ''),
    );
  }

  async function submit(values: FlightFormValues) {
    const parsed = flightFormSchema.parse(values);
    setSaving(true);
    try {
      await onSubmit({ values: parsed, igc, track });
    } finally {
      setSaving(false);
    }
  }

  function applyChip(field: keyof FlightFormValues, value: string) {
    setValue(field, value, { shouldValidate: true });
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="card space-y-4">
      {showIgc && (
        <div className="rounded-xl border border-dashed border-border bg-surface-2 p-3">
          <label className="label">Import IGC track (optional)</label>
          <input
            type="file"
            accept=".igc,text/plain"
            className="text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleIgc(f);
            }}
          />
          {igcInfo && (
            <p className="mt-2 text-xs text-brand-soft">{igcInfo}</p>
          )}
        </div>
      )}

      {prefill && prefill.tripModeActive && (
        <div className="rounded-xl border border-brand/40 bg-brand/10 px-3 py-2 text-xs font-medium text-brand-soft">
          Trip mode active — suggesting your current trip setup until you change
          it.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" error={errors.dateISO?.message}>
          <input type="date" className="input" {...register('dateISO')} />
        </Field>
        <Field label="Time">
          <input type="time" className="input" {...register('time')} />
        </Field>
      </div>

      <div>
        <Field label="Takeoff" error={errors.takeoff?.message}>
          <input className="input" placeholder="Launch site" {...register('takeoff')} />
        </Field>
        {prefill && (
          <Chip
            field={prefill.takeoff}
            onApply={(v) => applyChip('takeoff', v)}
          />
        )}
      </div>

      <div>
        <Field label="Landing" error={errors.landing?.message}>
          <input className="input" placeholder="Landing site" {...register('landing')} />
        </Field>
        {prefill && (
          <Chip field={prefill.landing} onApply={(v) => applyChip('landing', v)} />
        )}
      </div>

      <div>
        <Field label="Paraglider">
          <select className="input" {...register('paragliderId')}>
            <option value="">— Select wing —</option>
            {wings.map((w) => (
              <option key={w.id} value={w.id}>
                {equipmentLabel(w)}
                {w.status === 'sold' ? ' (sold)' : ''}
              </option>
            ))}
          </select>
        </Field>
        {prefill && (
          <Chip
            field={prefill.paragliderId}
            resolve={(id) => labelForId(equipment, id)}
            onApply={(v) => applyChip('paragliderId', v)}
          />
        )}
      </div>

      <div>
        <Field label="Harness">
          <select className="input" {...register('harnessId')}>
            <option value="">— Select harness —</option>
            {harnesses.map((h) => (
              <option key={h.id} value={h.id}>
                {equipmentLabel(h)}
                {h.status === 'sold' ? ' (sold)' : ''}
              </option>
            ))}
          </select>
        </Field>
        {prefill && (
          <Chip
            field={prefill.harnessId}
            resolve={(id) => labelForId(equipment, id)}
            onApply={(v) => applyChip('harnessId', v)}
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Airtime (min)" error={errors.airtimeMinutes?.message}>
          <input className="input" inputMode="numeric" {...register('airtimeMinutes')} />
        </Field>
        <Field label="Distance (km)">
          <input className="input" inputMode="decimal" {...register('distanceKm')} />
        </Field>
        <Field label="Alt. gain (m)">
          <input className="input" inputMode="numeric" {...register('altitudeGainM')} />
        </Field>
      </div>

      <Field label="Comments">
        <textarea className="input min-h-20" {...register('comments')} />
      </Field>

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-ghost">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function labelForId(equipment: Equipment[], id: string): string {
  const eq = equipment.find((e) => e.id === id);
  return eq ? equipmentLabel(eq) : 'Unknown';
}

function Chip({
  field,
  onApply,
  resolve,
}: {
  field: PrefillField;
  onApply: (value: string) => void;
  resolve?: (value: string) => string;
}) {
  if (!field.value || field.source === 'none') return null;
  const display = resolve ? resolve(field.value) : field.value;
  return (
    <button
      type="button"
      onClick={() => onApply(field.value as string)}
      className="chip mt-1.5 hover:border-brand"
      title={`Apply suggestion from ${SOURCE_LABELS[field.source]}`}
    >
      <CheckIcon width={13} height={13} />
      <span className="text-muted">
        {SOURCE_LABELS[field.source]}:
      </span>
      <span className="font-semibold">{display}</span>
    </button>
  );
}
