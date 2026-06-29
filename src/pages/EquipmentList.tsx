import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EQUIPMENT_TYPE_LABELS, type EquipmentType } from '../types';
import { useEquipment, useFlights, useSettings } from '../data/hooks';
import { equipmentLabel, maintenanceFor } from '../domain/equipment';
import { Badge, EmptyState, PageHeader, Spinner, StatusPill } from '../components/ui';
import { AddIcon } from '../components/icons';
import { formatSwissDate } from '../utils/dates';

const ORDER: EquipmentType[] = ['paraglider', 'harness', 'reserve', 'other'];

export function EquipmentList() {
  const { data: equipment, loading } = useEquipment();
  const { data: flights } = useFlights();
  const { settings } = useSettings();
  const [showSold, setShowSold] = useState(false);

  const grouped = useMemo(() => {
    const visible = equipment.filter((e) => showSold || e.status !== 'sold');
    return ORDER.map((type) => ({
      type,
      items: visible.filter((e) => e.type === type),
    })).filter((g) => g.items.length > 0);
  }, [equipment, showSold]);

  return (
    <div>
      <PageHeader
        title="Equipment"
        subtitle="Wings, harnesses, reserves and other gear"
        actions={
          <Link to="/equipment/new" className="btn-primary">
            <AddIcon width={16} height={16} /> Add
          </Link>
        }
      />

      <label className="mb-4 inline-flex items-center gap-2 text-sm text-">
        <input
          type="checkbox"
          checked={showSold}
          onChange={(e) => setShowSold(e.target.checked)}
        />
        Show sold gear
      </label>

      {loading ? (
        <Spinner label="Loading equipment…" />
      ) : grouped.length === 0 ? (
        <EmptyState
          title="No equipment yet"
          hint="Add your wings, harnesses and reserves — or import your existing gear."
          action={
            <Link to="/equipment/new" className="btn-primary">
              Add equipment
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.type}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-">
                {EQUIPMENT_TYPE_LABELS[group.type]}
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.items.map((eq) => {
                  const m = maintenanceFor(eq, flights, settings);
                  return (
                    <Link
                      key={eq.id}
                      to={`/equipment/${eq.id}`}
                      className="card transition hover:border-"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {equipmentLabel(eq)}
                          </p>
                          <p className="mt-0.5 text-xs text-">
                            {eq.serialNumber
                              ? `SN ${eq.serialNumber}`
                              : 'No serial number'}
                          </p>
                        </div>
                        {m.applicable && <StatusPill status={m.status} />}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {eq.status === 'sold' && <Badge tone="neutral">Sold</Badge>}
                        {eq.status === 'borrowed' && (
                          <Badge tone="brand">Borrowed</Badge>
                        )}
                        {eq.lastCheckDateISO && (
                          <Badge tone="neutral">
                            Last {eq.type === 'reserve' ? 'repack' : 'check'}{' '}
                            {formatSwissDate(eq.lastCheckDateISO)}
                          </Badge>
                        )}
                      </div>
                      {m.applicable && m.status !== 'ok' && (
                        <p className="mt-2 text-xs text-">
                          {m.reason}
                        </p>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
