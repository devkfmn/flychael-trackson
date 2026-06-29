import { useState } from 'react';
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
import type { ExpenseCategory } from '../types';
import { equipmentLabel, equipmentMap } from '../domain/equipment';
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

  const total = expenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Expenses"
        subtitle={`Total ${formatMoney(total, settings.currency)}`}
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
      ) : expenses.length === 0 ? (
        <EmptyState
          title="No expenses recorded"
          hint="Gear purchase and sale prices already feed cost analytics; add repairs, checks and extras here."
        />
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => {
            const eq = e.equipmentId ? byId.get(e.equipmentId) : null;
            return (
              <div
                key={e.id}
                className="card flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">
                      {formatMoney(e.amount, e.currency)}
                    </p>
                    <Badge tone="neutral">{e.category}</Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-">
                    {formatSwissDate(e.dateISO)}
                    {eq ? ` · ${equipmentLabel(eq)}` : ''}
                    {e.notes ? ` · ${e.notes}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => user && void deleteExpense(user.uid, e.id)}
                  className="rounded-lg p-2 text- hover:text-"
                  title="Delete"
                >
                  <TrashIcon width={16} height={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
