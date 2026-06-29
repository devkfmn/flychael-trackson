import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import {
  EQUIPMENT_TYPE_LABELS,
  defaultRuleForType,
  type Equipment,
  type EquipmentType,
} from '../types';
import {
  equipmentFormSchema,
  type EquipmentFormValues,
} from '../lib/schemas';
import { useAuth } from '../lib/auth';
import {
  createEquipment,
  deleteEquipment,
  updateEquipment,
  useEquipment,
  useSettings,
} from '../data/hooks';
import type { StoredEquipment } from '../data/collections';
import { Field, PageHeader, Spinner } from '../components/ui';
import { TrashIcon } from '../components/icons';

const TYPES: EquipmentType[] = ['paraglider', 'harness', 'reserve', 'other'];
const STATUSES = ['active', 'borrowed', 'sold'] as const;

function toFormValues(eq: Equipment): EquipmentFormValues {
  return {
    type: eq.type,
    producer: eq.producer,
    model: eq.model,
    size: eq.size ?? '',
    owner: eq.owner ?? '',
    serialNumber: eq.serialNumber ?? '',
    manufactureDateISO: eq.manufactureDateISO ?? '',
    purchaseDateISO: eq.purchaseDateISO ?? '',
    saleDateISO: eq.saleDateISO ?? '',
    purchasePrice: eq.purchasePrice ?? '',
    salePrice: eq.salePrice ?? '',
    notes: eq.notes ?? '',
    status: eq.status,
    lastCheckDateISO: eq.lastCheckDateISO ?? '',
  };
}

const EMPTY: EquipmentFormValues = {
  type: 'paraglider',
  producer: '',
  model: '',
  size: '',
  owner: '',
  serialNumber: '',
  manufactureDateISO: '',
  purchaseDateISO: '',
  saleDateISO: '',
  purchasePrice: '',
  salePrice: '',
  notes: '',
  status: 'active',
  lastCheckDateISO: '',
};

export function EquipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: equipment, loading } = useEquipment();
  const { settings } = useSettings();

  const existing = useMemo(
    () => (id ? equipment.find((e) => e.id === id) : undefined),
    [equipment, id],
  );

  const [customRule, setCustomRule] = useState(false);
  const [ruleMonths, setRuleMonths] = useState('');
  const [ruleFlights, setRuleFlights] = useState('');
  const [ruleHours, setRuleHours] = useState('');
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: EMPTY,
  });

  const type = watch('type');

  useEffect(() => {
    if (existing) {
      reset(toFormValues(existing));
      if (existing.maintenanceRule) {
        setCustomRule(true);
        setRuleMonths(existing.maintenanceRule.months?.toString() ?? '');
        setRuleFlights(existing.maintenanceRule.flights?.toString() ?? '');
        setRuleHours(existing.maintenanceRule.hours?.toString() ?? '');
      }
    }
  }, [existing, reset]);

  if (id && loading && !existing) {
    return <Spinner label="Loading equipment…" />;
  }
  if (id && !loading && !existing) {
    return <p className="text-">Equipment not found.</p>;
  }

  const typeDefault = defaultRuleForType(type, settings.maintenanceDefaults);

  async function onSubmit(values: EquipmentFormValues) {
    if (!user) return;
    const parsed = equipmentFormSchema.parse(values);
    setSaving(true);
    try {
      const num = (s: string) => {
        const t = s.trim();
        if (t === '') return null;
        const v = Number(t);
        return Number.isFinite(v) ? v : null;
      };
      const rule = customRule
        ? { months: num(ruleMonths), flights: num(ruleFlights), hours: num(ruleHours) }
        : null;

      const now = Date.now();
      const payload: StoredEquipment = {
        type: parsed.type,
        producer: parsed.producer,
        model: parsed.model,
        size: parsed.size,
        owner: parsed.owner,
        serialNumber: parsed.serialNumber,
        manufactureDateISO: parsed.manufactureDateISO,
        purchaseDateISO: parsed.purchaseDateISO,
        saleDateISO: parsed.saleDateISO,
        purchasePrice: parsed.purchasePrice,
        salePrice: parsed.salePrice,
        notes: parsed.notes,
        status: parsed.status,
        lastCheckDateISO: parsed.lastCheckDateISO,
        maintenanceRule: rule,
        legacyId: existing?.legacyId ?? null,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      if (existing) {
        await updateEquipment(user.uid, existing.id, payload);
      } else {
        await createEquipment(user.uid, payload);
      }
      navigate('/equipment');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!user || !existing) return;
    if (!confirm(`Delete ${existing.producer} ${existing.model}?`)) return;
    await deleteEquipment(user.uid, existing.id);
    navigate('/equipment');
  }

  const reserveSelected = type === 'reserve';

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={existing ? 'Edit equipment' : 'Add equipment'}
        subtitle={existing ? `${existing.producer} ${existing.model}` : undefined}
        actions={
          existing && (
            <button onClick={() => void onDelete()} className="btn-danger">
              <TrashIcon width={16} height={16} /> Delete
            </button>
          )
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select className="input" {...register('type')}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {EQUIPMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className="input" {...register('status')}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Producer" error={errors.producer?.message}>
            <input className="input" {...register('producer')} />
          </Field>
          <Field label="Model" error={errors.model?.message}>
            <input className="input" {...register('model')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Size">
            <input className="input" {...register('size')} />
          </Field>
          <Field label="Owner" hint="Leave as your name; others mean borrowed gear.">
            <input className="input" {...register('owner')} />
          </Field>
        </div>

        <Field label="Serial number">
          <input className="input" {...register('serialNumber')} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Manufacture date">
            <input type="date" className="input" {...register('manufactureDateISO')} />
          </Field>
          <Field
            label={reserveSelected ? 'Last repack' : 'Last check'}
          >
            <input type="date" className="input" {...register('lastCheckDateISO')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Purchase date">
            <input type="date" className="input" {...register('purchaseDateISO')} />
          </Field>
          <Field label="Purchase price">
            <input className="input" inputMode="decimal" {...register('purchasePrice')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Sale date" hint="Set to mark as sold.">
            <input type="date" className="input" {...register('saleDateISO')} />
          </Field>
          <Field label="Sale price">
            <input className="input" inputMode="decimal" {...register('salePrice')} />
          </Field>
        </div>

        <Field label="Notes">
          <textarea className="input min-h-20" {...register('notes')} />
        </Field>

        {type !== 'other' && (
          <div className="rounded-xl border border- bg- p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={customRule}
                onChange={(e) => setCustomRule(e.target.checked)}
              />
              Custom maintenance rule
            </label>
            <p className="mt-1 text-xs text-">
              {reserveSelected
                ? `Default: repack every ${typeDefault?.months ?? '—'} months.`
                : `Default: check at first of ${typeDefault?.months ?? '—'} months / ${typeDefault?.flights ?? '—'} flights / ${typeDefault?.hours ?? '—'} hours.`}
            </p>
            {customRule && (
              <div className="mt-3 grid grid-cols-3 gap-3">
                <Field label="Months">
                  <input
                    className="input"
                    inputMode="numeric"
                    value={ruleMonths}
                    onChange={(e) => setRuleMonths(e.target.value)}
                  />
                </Field>
                {!reserveSelected && (
                  <>
                    <Field label="Flights">
                      <input
                        className="input"
                        inputMode="numeric"
                        value={ruleFlights}
                        onChange={(e) => setRuleFlights(e.target.value)}
                      />
                    </Field>
                    <Field label="Hours">
                      <input
                        className="input"
                        inputMode="numeric"
                        value={ruleHours}
                        onChange={(e) => setRuleHours(e.target.value)}
                      />
                    </Field>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving…' : existing ? 'Save changes' : 'Add equipment'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/equipment')}
            className="btn-ghost"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
