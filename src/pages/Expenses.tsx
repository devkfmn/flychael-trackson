import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../lib/auth';
import {
  createExpense,
  deleteExpense,
  useEquipment,
  useExpenses,
  useSettings,
} from '../data/hooks';
import {
  expenseFormSchema,
  type ExpenseFormValues,
} from '../lib/schemas';
import type { Equipment, ExpenseCategory } from '../types';
import {
  equipmentLabel,
  equipmentMap,
  equipmentStatusSuffix,
  isBorrowed,
} from '../domain/equipment';
import { Badge, EmptyState, Field, PageHeader, Spinner } from '../components/ui';
import { AddIcon, TrashIcon } from '../components/icons';
import { formatMoney } from '../utils/format';
import { formatSwissDate, todayISO } from '../utils/dates';

const CATEGORIES: ExpenseCategory[] = [
  'purchase',
  'sale',
  'repair',
  'check',
  'gear',
  'other',
];

/**
 * A unified cost-ledger row. Manual expenses are deletable; rows derived from
 * an equipment item's purchase/sale price link back to that item (they are
 * edited there, not here). `amount` is positive for a cost, negative for a
 * credit (a sale).
 */
interface LedgerRow {
  key: string;
  dateISO: string | null;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  eq: Equipment | null;
  notes: string | null;
  /** Set only for manual expenses, which can be deleted from this page. */
  expenseId: string | null;
  /** True for rows derived from gear purchase/sale prices. */
  derived: boolean;
}

export function Expenses() {
  const { user } = useAuth();
  const { data: expenses, loading } = useExpenses();
  const { data: equipment } = useEquipment();
  const { settings } = useSettings();
  const byId = equipmentMap(equipment);
  const [open, setOpen] = useState(false);

  const { register, handleSubmit, reset, formState } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      equipmentId: '',
      amount: '',
      currency: settings.currency,
      dateISO: todayISO(),
      category: 'gear',
      notes: '',
    },
  });

  async function onSubmit(values: ExpenseFormValues) {
    if (!user) return;
    const parsed = expenseFormSchema.parse(values);
    await createExpense(user.uid, {
      equipmentId: parsed.equipmentId,
      amount: parsed.amount,
      currency: parsed.currency,
      dateISO: parsed.dateISO,
      category: parsed.category,
      notes: parsed.notes,
      createdAt: Date.now(),
    });
    reset({
      equipmentId: '',
      amount: '',
      currency: settings.currency,
      dateISO: todayISO(),
      category: 'gear',
      notes: '',
    });
    setOpen(false);
  }

  const rows = useMemo<LedgerRow[]>(() => {
    const manual: LedgerRow[] = expenses.map((e) => ({
      key: `expense:${e.id}`,
      dateISO: e.dateISO,
      amount: e.amount,
      currency: e.currency,
      category: e.category,
      eq: e.equipmentId ? byId.get(e.equipmentId) ?? null : null,
      notes: e.notes,
      expenseId: e.id,
      derived: false,
    }));

    const gear: LedgerRow[] = [];
    for (const eq of equipment) {
      if (eq.purchasePrice != null) {
        gear.push({
          key: `gear-purchase:${eq.id}`,
          dateISO: eq.purchaseDateISO,
          amount: eq.purchasePrice,
          currency: settings.currency,
          category: 'purchase',
          eq,
          notes: null,
          expenseId: null,
          derived: true,
        });
      }
      if (eq.salePrice != null) {
        gear.push({
          key: `gear-sale:${eq.id}`,
          dateISO: eq.saleDateISO,
          amount: -eq.salePrice,
          currency: settings.currency,
          category: 'sale',
          eq,
          notes: null,
          expenseId: null,
          derived: true,
        });
      }
    }

    return [...manual, ...gear].sort((a, b) => {
      // Most recent first; rows without a date sink to the bottom.
      if (!a.dateISO && !b.dateISO) return 0;
      if (!a.dateISO) return 1;
      if (!b.dateISO) return -1;
      return b.dateISO.localeCompare(a.dateISO);
    });
  }, [expenses, equipment, byId, settings.currency]);

  const total = rows.reduce((acc, r) => acc + r.amount, 0);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Expenses"
        subtitle={`Net total ${formatMoney(total, settings.currency)} · gear purchases, sales and extras`}
        actions={
          <button onClick={() => setOpen((o) => !o)} className="btn-primary">
            <AddIcon width={16} height={16} /> Add
          </button>
        }
      />

      {open && (
        <form onSubmit={handleSubmit(onSubmit)} className="card mb-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount" error={formState.errors.amount?.message}>
              <input className="input" inputMode="decimal" {...register('amount')} />
            </Field>
            <Field label="Currency">
              <input className="input" {...register('currency')} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" error={formState.errors.dateISO?.message}>
              <input type="date" className="input" {...register('dateISO')} />
            </Field>
            <Field label="Category">
              <select className="input" {...register('category')}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c[0].toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Equipment (optional)">
            <select className="input" {...register('equipmentId')}>
              <option value="">— None —</option>
              {equipment.map((e) => (
                <option key={e.id} value={e.id}>
                  {equipmentLabel(e)}
                  {equipmentStatusSuffix(e)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Notes">
            <input className="input" {...register('notes')} />
          </Field>
          <button type="submit" className="btn-primary w-full">
            Save expense
          </button>
        </form>
      )}

      {loading ? (
        <Spinner label="Loading expenses…" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No costs recorded yet"
          hint="Set purchase and sale prices on your gear, or add repairs, checks and extras here — everything shows up in this ledger."
        />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const meta = (
              <p className="mt-0.5 truncate text-xs text-muted">
                {r.dateISO ? formatSwissDate(r.dateISO) : 'No date'}
                {r.eq
                  ? ` · ${equipmentLabel(r.eq)}${isBorrowed(r.eq) ? ' (borrowed)' : ''}`
                  : ''}
                {r.notes ? ` · ${r.notes}` : ''}
              </p>
            );
            const head = (
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className={`font-semibold ${r.amount < 0 ? 'text-ok' : ''}`}
                >
                  {formatMoney(r.amount, r.currency)}
                </p>
                <Badge tone={r.category === 'sale' ? 'ok' : 'neutral'}>
                  {r.category}
                </Badge>
                {r.derived && <Badge tone="neutral">from gear</Badge>}
              </div>
            );

            if (r.derived && r.eq) {
              return (
                <Link
                  key={r.key}
                  to={`/equipment/${r.eq.id}`}
                  className="card flex items-center justify-between gap-3 transition hover:border-brand"
                >
                  <div className="min-w-0">
                    {head}
                    {meta}
                  </div>
                </Link>
              );
            }

            return (
              <div
                key={r.key}
                className="card flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  {head}
                  {meta}
                </div>
                {r.expenseId && (
                  <button
                    onClick={() =>
                      user && void deleteExpense(user.uid, r.expenseId!)
                    }
                    className="rounded-lg p-2 text-muted hover:text-danger"
                    title="Delete"
                  >
                    <TrashIcon width={16} height={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
