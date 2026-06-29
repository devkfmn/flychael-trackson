import type { ReactNode } from 'react';
import type { MaintenanceStatus } from '../domain/maintenance';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Section({
  title,
  children,
  right,
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-">
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 py-10 text-center">
      <p className="font-medium">{title}</p>
      {hint && <p className="max-w-sm text-sm text-">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border- border-t-" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
}) {
  return (
    <div className="card">
      <p className="text-xs font-medium text-">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-">{sub}</p>}
    </div>
  );
}

const STATUS_STYLES: Record<MaintenanceStatus, string> = {
  ok: 'bg-/15 text-',
  dueSoon: 'bg-/15 text-',
  overdue: 'bg-/15 text-',
  unknown: 'bg-/15 text-',
};

const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  ok: 'OK',
  dueSoon: 'Due soon',
  overdue: 'Overdue',
  unknown: 'Unknown',
};

export function StatusPill({ status }: { status: MaintenanceStatus }) {
  return (
    <span className={`pill ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'brand' | 'warn' | 'danger' | 'ok';
}) {
  const tones: Record<string, string> = {
    neutral: 'bg- text-',
    brand: 'bg-/15 text-',
    warn: 'bg-/15 text-',
    danger: 'bg-/15 text-',
    ok: 'bg-/15 text-',
  };
  return <span className={`pill ${tones[tone]}`}>{children}</span>;
}

export function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-xs text-">{hint}</p>
      )}
      {error && <p className="mt-1 text-xs text-">{error}</p>}
    </div>
  );
}
