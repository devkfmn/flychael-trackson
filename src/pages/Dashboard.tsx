import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useEquipment, useExpenses, useFlights, useSettings } from '../data/hooks';
import { computeDashboard, type MaintenanceItem } from '../domain/analytics';
import { equipmentLabel } from '../domain/equipment';
import {
  Badge,
  EmptyState,
  PageHeader,
  Section,
  Spinner,
  Stat,
  StatusPill,
} from '../components/ui';
import { AlertIcon } from '../components/icons';
import { formatAirtime, formatHours, formatMoney } from '../utils/format';
import { formatSwissDate } from '../utils/dates';

export function Dashboard() {
  const { data: equipment, loading: l1 } = useEquipment();
  const { data: flights, loading: l2 } = useFlights();
  const { data: expenses, loading: l3 } = useExpenses();
  const { settings } = useSettings();

  const d = useMemo(
    () => computeDashboard(equipment, flights, expenses, settings),
    [equipment, flights, expenses, settings],
  );

  if (l1 || l2 || l3) return <Spinner label="Loading dashboard…" />;

  const empty = equipment.length === 0 && flights.length === 0;
  if (empty) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Welcome to Flychael Trackson" />
        <EmptyState
          title="Let's get set up"
          hint="Import your existing Parafolio data, or add equipment and your first flight."
          action={
            <div className="flex gap-2">
              <Link to="/import" className="btn-primary">
                Import data
              </Link>
              <Link to="/equipment/new" className="btn-ghost">
                Add equipment
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const safetyCount = d.overdue.length + d.dueSoon.length;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={
          safetyCount > 0
            ? `${safetyCount} maintenance item${safetyCount > 1 ? 's' : ''} need attention`
            : 'All gear within limits'
        }
      />

      {/* 1. Safety first: overdue + due soon */}
      {(d.overdue.length > 0 || d.dueSoon.length > 0) && (
        <Section title="Needs attention">
          <div className="space-y-2">
            {d.overdue.map((m) => (
              <MaintenanceRow key={m.equipment.id} item={m} />
            ))}
            {d.dueSoon.map((m) => (
              <MaintenanceRow key={m.equipment.id} item={m} />
            ))}
          </div>
        </Section>
      )}

      {/* 2. Missing safety data */}
      {d.needsData.length > 0 && (
        <Section title="Missing maintenance data">
          <div className="space-y-2">
            {d.needsData.map((m) => (
              <Link
                key={m.equipment.id}
                to={`/equipment/${m.equipment.id}`}
                className="card flex items-center justify-between gap-2 transition hover:border-brand"
              >
                <span className="font-medium">{equipmentLabel(m.equipment)}</span>
                <Badge tone="warn">No check/repack date</Badge>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* 3. Totals */}
      <Section title="Totals">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total flights" value={d.totalFlights} />
          <Stat label="Total airtime" value={formatHours(d.totalHours)} />
          <Stat
            label="Flights this year"
            value={d.flightsThisYear}
            sub={formatHours(d.hoursThisYear)}
          />
          <Stat
            label="Cost / hour"
            value={formatMoney(d.costPerHour, settings.currency)}
            sub={`${formatMoney(d.costPerFlight, settings.currency)} / flight`}
          />
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 4. By wing */}
        <Section title="Hours by wing">
          <UsageList items={d.byWing} />
        </Section>

        {/* By harness */}
        <Section title="Hours by harness">
          <UsageList items={d.byHarness} />
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 5. Top sites */}
        <Section title="Most used takeoffs">
          {d.topSites.length === 0 ? (
          <p className="text-sm text-muted">No data yet.</p>
        ) : (
          <div className="card space-y-1.5">
              {d.topSites.map((s) => (
                <div key={s.site} className="flex justify-between text-sm">
                  <span>{s.site}</span>
                  <span className="tabular-nums text-muted">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* 6. Recent flights */}
        <Section
          title="Recent flights"
          right={
            <Link to="/flights" className="text-xs text-brand-soft">
              View all
            </Link>
          }
        >
          {d.recentFlights.length === 0 ? (
            <p className="text-sm text-muted">No flights yet.</p>
          ) : (
            <div className="space-y-2">
              {d.recentFlights.map((f) => (
                <Link
                  key={f.id}
                  to={`/flights/${f.id}`}
                  className="card flex items-center justify-between gap-2 transition hover:border-brand"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {f.takeoff} → {f.landing}
                    </p>
                    <p className="text-xs text-muted">
                      {formatSwissDate(f.dateISO)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatAirtime(f.airtimeMinutes)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* 7. Spend */}
      <Section title="Equipment spend">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat
            label="Net gear + expenses"
            value={formatMoney(d.totalSpend, settings.currency)}
          />
          <Stat
            label="Cost per flight"
            value={formatMoney(d.costPerFlight, settings.currency)}
          />
          <Stat
            label="Cost per hour"
            value={formatMoney(d.costPerHour, settings.currency)}
          />
        </div>
      </Section>

      {/* 8. Import quality warnings */}
      {d.warnings.length > 0 && (
        <Section title={`Data quality (${d.warnings.length})`}>
          <div className="card space-y-1.5">
            {d.warnings.slice(0, 12).map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <AlertIcon
                  width={16}
                  height={16}
                  className="mt-0.5 shrink-0 text-warn"
                />
                <span className="text-muted">{w.message}</span>
              </div>
            ))}
            {d.warnings.length > 12 && (
              <p className="pt-1 text-xs text-muted">
                +{d.warnings.length - 12} more…
              </p>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

function MaintenanceRow({ item }: { item: MaintenanceItem }) {
  return (
    <Link
      to={`/equipment/${item.equipment.id}`}
      className="card flex items-center justify-between gap-3 transition hover:border-brand"
    >
      <div className="min-w-0">
        <p className="font-semibold">{equipmentLabel(item.equipment)}</p>
        <p className="mt-0.5 text-xs text-muted">
          {item.result.reason}
          {item.result.daysRemaining != null &&
            ` · ${item.result.daysRemaining < 0 ? `${-item.result.daysRemaining} days over` : `${item.result.daysRemaining} days left`}`}
        </p>
      </div>
      <StatusPill status={item.result.status} />
    </Link>
  );
}

function UsageList({
  items,
}: {
  items: { id: string; label: string; flights: number; hours: number }[];
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">No data yet.</p>;
  }
  const max = Math.max(...items.map((i) => i.hours), 1);
  return (
    <div className="card space-y-2.5">
      {items.map((i) => (
        <div key={i.id}>
          <div className="flex justify-between text-sm">
            <span className="truncate">{i.label}</span>
            <span className="shrink-0 tabular-nums text-muted">
              {formatHours(i.hours)} · {i.flights}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${(i.hours / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
