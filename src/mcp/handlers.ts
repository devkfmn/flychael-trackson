import { computeDashboard } from '../domain/analytics';
import { equipmentLabel, isSelectableForFlight } from '../domain/equipment';
import { mergeSettings } from '../domain/settings';
import { yearOf, todayISOInTimeZone } from '../utils/dates';
import type {
  Equipment,
  Expense,
  Flight,
  MaintenanceRule,
  UserSettings,
} from '../types';
import { DEFAULT_MAINTENANCE_DEFAULTS } from '../types';
import { NotFoundError, ToolInputError, parseArgs } from './errors';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { errorResult, jsonResult } from './result';
import {
  createEquipmentSchema,
  createExpenseSchema,
  createFlightSchema,
  deleteByIdSchema,
  getStatsSchema,
  idSchema,
  listEquipmentSchema,
  listExpensesSchema,
  listFlightsSchema,
  updateEquipmentSchema,
  updateExpenseSchema,
  updateFlightSchema,
  updateProfileSchema,
  type CreateEquipmentInput,
  type CreateExpenseInput,
  type CreateFlightInput,
  type ListEquipmentInput,
  type ListExpensesInput,
  type ListFlightsInput,
  type UpdateEquipmentInput,
  type UpdateExpenseInput,
  type UpdateFlightInput,
  type UpdateProfileInput,
} from './schemas';
import type { TracksonStore } from './store';

const TIMEZONE = 'Europe/Zurich';
const DEFAULT_LIMIT = 50;

export interface HandlerContext {
  store: TracksonStore;
  now: () => Date;
}

function flightSortKey(f: Flight): string {
  return `${f.dateISO} ${f.time ?? '00:00'}`;
}

function paginate<T>(
  items: T[],
  limit: number | undefined,
  offset: number | undefined,
): { items: T[]; total: number; limit: number; offset: number } {
  const size = limit ?? DEFAULT_LIMIT;
  const start = offset ?? 0;
  return {
    items: items.slice(start, start + size),
    total: items.length,
    limit: size,
    offset: start,
  };
}

function includesInsensitive(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.trim().toLowerCase());
}

function describeEquipment(eq: Equipment): string {
  return `${eq.id} (${equipmentLabel(eq)}, ${eq.type}, ${eq.status})`;
}

async function requireFlight(store: TracksonStore, id: string): Promise<Flight> {
  const flight = await store.getFlight(id);
  if (!flight) {
    throw new NotFoundError(`Flight not found: ${id}. Use list_flights to see ids.`);
  }
  return flight;
}

async function requireEquipment(
  store: TracksonStore,
  id: string,
): Promise<Equipment> {
  const item = await store.getEquipment(id);
  if (!item) {
    throw new NotFoundError(
      `Equipment not found: ${id}. Use list_equipment to see ids.`,
    );
  }
  return item;
}

async function requireExpense(store: TracksonStore, id: string): Promise<Expense> {
  const item = await store.getExpense(id);
  if (!item) {
    throw new NotFoundError(
      `Expense not found: ${id}. Use list_expenses to see ids.`,
    );
  }
  return item;
}

async function resolveGear(
  store: TracksonStore,
  kind: 'paraglider' | 'harness',
  id: string | null | undefined,
  currentId?: string | null,
): Promise<string | null> {
  if (id === undefined) return currentId ?? null;
  if (id === null) return null;
  const eq = await store.getEquipment(id);
  if (!eq) {
    const all = await store.listEquipment();
    const options = all
      .filter((e) => e.type === kind)
      .map(describeEquipment);
    throw new ToolInputError(
      `Unknown ${kind}Id "${id}". Valid ${kind} ids: ${options.length ? options.join('; ') : '(none)'}.`,
    );
  }
  if (eq.type !== kind) {
    throw new ToolInputError(
      `${kind}Id "${id}" is type "${eq.type}", not ${kind}.`,
    );
  }
  const keepingCurrent = currentId === id;
  if (!keepingCurrent && !isSelectableForFlight(eq)) {
    throw new ToolInputError(
      `${kind}Id "${id}" is ${eq.status} and cannot be selected for a new/changed flight. Use active or borrowed gear.`,
    );
  }
  return eq.id;
}

async function resolveExpenseEquipment(
  store: TracksonStore,
  id: string | null | undefined,
  currentId?: string | null,
): Promise<string | null> {
  if (id === undefined) return currentId ?? null;
  if (id === null) return null;
  const eq = await store.getEquipment(id);
  if (!eq) {
    const all = await store.listEquipment();
    throw new ToolInputError(
      `Unknown equipmentId "${id}". Valid ids: ${
        all.length ? all.map(describeEquipment).join('; ') : '(none)'
      }.`,
    );
  }
  return eq.id;
}

function defaultString(
  provided: string | null | undefined,
  fallback: string | null,
): string | null {
  if (provided !== undefined) return provided;
  return fallback;
}

function runTool(fn: () => Promise<unknown>): Promise<CallToolResult> {
  return fn()
    .then((data) => jsonResult(data))
    .catch((err: unknown) => {
      if (err instanceof ToolInputError || err instanceof NotFoundError) {
        return errorResult(err.message);
      }
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(message);
    });
}

export function createHandlers(ctx: HandlerContext) {
  const { store } = ctx;
  const today = () => todayISOInTimeZone(TIMEZONE, ctx.now());

  async function listFlights(raw: unknown) {
    const input: ListFlightsInput = parseArgs(listFlightsSchema, raw);
    let items = await store.listFlights();
    items.sort((a, b) => flightSortKey(b).localeCompare(flightSortKey(a)));
    if (input.date_from) items = items.filter((f) => f.dateISO >= input.date_from!);
    if (input.date_to) items = items.filter((f) => f.dateISO <= input.date_to!);
    if (input.paraglider_id) {
      items = items.filter((f) => f.paragliderId === input.paraglider_id);
    }
    if (input.harness_id) {
      items = items.filter((f) => f.harnessId === input.harness_id);
    }
    if (input.source) items = items.filter((f) => f.source === input.source);
    if (input.takeoff) {
      items = items.filter((f) => includesInsensitive(f.takeoff, input.takeoff!));
    }
    if (input.landing) {
      items = items.filter((f) => includesInsensitive(f.landing, input.landing!));
    }
    return paginate(items, input.limit, input.offset);
  }

  async function getFlight(raw: unknown) {
    const { id } = parseArgs(idSchema, raw);
    return requireFlight(store, id);
  }

  async function createFlight(raw: unknown) {
    const input: CreateFlightInput = parseArgs(createFlightSchema, raw);
    const settings = await store.getSettings();
    const takeoff =
      (input.takeoff && input.takeoff.trim()) ||
      settings.defaults.takeoff;
    const landing =
      (input.landing && input.landing.trim()) ||
      settings.defaults.landing;
    if (!takeoff) {
      throw new ToolInputError(
        'takeoff is required (no default takeoff in profile). Pass takeoff or update_profile defaults.takeoff.',
      );
    }
    if (!landing) {
      throw new ToolInputError(
        'landing is required (no default landing in profile). Pass landing or update_profile defaults.landing.',
      );
    }
    const paragliderId = await resolveGear(
      store,
      'paraglider',
      defaultString(input.paragliderId, settings.defaults.paragliderId),
    );
    const harnessId = await resolveGear(
      store,
      'harness',
      defaultString(input.harnessId, settings.defaults.harnessId),
    );
    const now = ctx.now().getTime();
    const igc = input.igc
      ? { filename: input.igc.filename, importedAt: input.igc.importedAt ?? now }
      : null;
    return store.createFlight({
      dateISO: input.dateISO ?? today(),
      time: input.time ?? null,
      takeoff,
      landing,
      paragliderId,
      harnessId,
      airtimeMinutes: input.airtimeMinutes,
      comments: input.comments ?? null,
      distanceKm: input.distanceKm ?? null,
      altitudeGainM: input.altitudeGainM ?? null,
      track: input.track ?? null,
      igc,
      source: igc ? 'igc' : 'manual',
      createdAt: now,
      updatedAt: now,
    });
  }

  async function updateFlight(raw: unknown) {
    const input: UpdateFlightInput = parseArgs(updateFlightSchema, raw);
    const existing = await requireFlight(store, input.id);
    const paragliderId = await resolveGear(
      store,
      'paraglider',
      input.paragliderId,
      existing.paragliderId,
    );
    const harnessId = await resolveGear(
      store,
      'harness',
      input.harnessId,
      existing.harnessId,
    );
    const now = ctx.now().getTime();
    const patch = {
      dateISO: input.dateISO,
      time: input.time,
      takeoff: input.takeoff,
      landing: input.landing,
      paragliderId,
      harnessId,
      airtimeMinutes: input.airtimeMinutes,
      comments: input.comments,
      distanceKm: input.distanceKm,
      altitudeGainM: input.altitudeGainM,
      track: input.track,
      igc: input.igc
        ? {
            filename: input.igc.filename,
            importedAt: input.igc.importedAt ?? existing.igc?.importedAt ?? now,
          }
        : input.igc,
      updatedAt: now,
    };
    return store.updateFlight(existing.id, patch);
  }

  async function deleteFlight(raw: unknown) {
    const { id, confirm } = parseArgs(deleteByIdSchema, raw);
    const existing = await requireFlight(store, id);
    if (!confirm) {
      return {
        confirm_required: true,
        preview: existing,
        message:
          'Pass confirm: true to permanently delete this flight. This cannot be undone.',
      };
    }
    await store.deleteFlight(id);
    return { deleted: true, id };
  }

  async function listEquipment(raw: unknown) {
    const input: ListEquipmentInput = parseArgs(listEquipmentSchema, raw);
    let items = await store.listEquipment();
    items.sort(
      (a, b) =>
        a.type.localeCompare(b.type) ||
        `${a.producer} ${a.model}`.localeCompare(`${b.producer} ${b.model}`),
    );
    if (input.type) items = items.filter((e) => e.type === input.type);
    if (input.status) items = items.filter((e) => e.status === input.status);
    return paginate(items, input.limit, input.offset);
  }

  async function getEquipment(raw: unknown) {
    const { id } = parseArgs(idSchema, raw);
    return requireEquipment(store, id);
  }

  function normalizeRule(
    rule: CreateEquipmentInput['maintenanceRule'],
  ): MaintenanceRule | null {
    if (rule == null) return null;
    return {
      months: rule.months ?? null,
      flights: rule.flights ?? null,
      hours: rule.hours ?? null,
    };
  }

  async function createEquipment(raw: unknown) {
    const input: CreateEquipmentInput = parseArgs(createEquipmentSchema, raw);
    const now = ctx.now().getTime();
    return store.createEquipment({
      type: input.type,
      producer: input.producer,
      model: input.model,
      size: input.size ?? null,
      owner: input.owner ?? null,
      serialNumber: input.serialNumber ?? null,
      manufactureDateISO: input.manufactureDateISO ?? null,
      purchaseDateISO: input.purchaseDateISO ?? null,
      saleDateISO: input.saleDateISO ?? null,
      purchasePrice: input.purchasePrice ?? null,
      salePrice: input.salePrice ?? null,
      notes: input.notes ?? null,
      status: input.status ?? 'active',
      lastCheckDateISO: input.lastCheckDateISO ?? null,
      maintenanceRule: normalizeRule(input.maintenanceRule),
      legacyId: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  async function updateEquipment(raw: unknown) {
    const input: UpdateEquipmentInput = parseArgs(updateEquipmentSchema, raw);
    const existing = await requireEquipment(store, input.id);
    const now = ctx.now().getTime();
    const patch: Partial<Omit<Equipment, 'id'>> = { updatedAt: now };
    if (input.type !== undefined) patch.type = input.type;
    if (input.producer !== undefined) patch.producer = input.producer;
    if (input.model !== undefined) patch.model = input.model;
    if (input.size !== undefined) patch.size = input.size;
    if (input.owner !== undefined) patch.owner = input.owner;
    if (input.serialNumber !== undefined) patch.serialNumber = input.serialNumber;
    if (input.manufactureDateISO !== undefined) {
      patch.manufactureDateISO = input.manufactureDateISO;
    }
    if (input.purchaseDateISO !== undefined) {
      patch.purchaseDateISO = input.purchaseDateISO;
    }
    if (input.saleDateISO !== undefined) patch.saleDateISO = input.saleDateISO;
    if (input.purchasePrice !== undefined) patch.purchasePrice = input.purchasePrice;
    if (input.salePrice !== undefined) patch.salePrice = input.salePrice;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (input.status !== undefined) patch.status = input.status;
    if (input.lastCheckDateISO !== undefined) {
      patch.lastCheckDateISO = input.lastCheckDateISO;
    }
    if (input.maintenanceRule !== undefined) {
      patch.maintenanceRule = normalizeRule(input.maintenanceRule);
    }
    return store.updateEquipment(existing.id, patch);
  }

  async function deleteEquipment(raw: unknown) {
    const { id, confirm } = parseArgs(deleteByIdSchema, raw);
    const existing = await requireEquipment(store, id);
    const flights = await store.listFlights();
    const linkedFlights = flights.filter(
      (f) => f.paragliderId === id || f.harnessId === id,
    );
    const expenses = await store.listExpenses();
    const linkedExpenses = expenses.filter((e) => e.equipmentId === id);
    if (!confirm) {
      return {
        confirm_required: true,
        preview: existing,
        linked_flights: linkedFlights.length,
        linked_expenses: linkedExpenses.length,
        warning:
          linkedFlights.length > 0
            ? `${linkedFlights.length} flight(s) reference this item and will show as missing gear.`
            : undefined,
        message:
          'Pass confirm: true to permanently delete this equipment. This cannot be undone.',
      };
    }
    await store.deleteEquipment(id);
    return { deleted: true, id };
  }

  async function listExpenses(raw: unknown) {
    const input: ListExpensesInput = parseArgs(listExpensesSchema, raw);
    let items = await store.listExpenses();
    items.sort((a, b) => b.dateISO.localeCompare(a.dateISO));
    if (input.date_from) items = items.filter((e) => e.dateISO >= input.date_from!);
    if (input.date_to) items = items.filter((e) => e.dateISO <= input.date_to!);
    if (input.equipment_id) {
      items = items.filter((e) => e.equipmentId === input.equipment_id);
    }
    if (input.category) items = items.filter((e) => e.category === input.category);
    return paginate(items, input.limit, input.offset);
  }

  async function getExpense(raw: unknown) {
    const { id } = parseArgs(idSchema, raw);
    return requireExpense(store, id);
  }

  async function createExpense(raw: unknown) {
    const input: CreateExpenseInput = parseArgs(createExpenseSchema, raw);
    const settings = await store.getSettings();
    const equipmentId = await resolveExpenseEquipment(store, input.equipmentId);
    return store.createExpense({
      equipmentId,
      amount: input.amount,
      currency: input.currency ?? settings.currency ?? 'CHF',
      dateISO: input.dateISO ?? today(),
      category: input.category ?? 'gear',
      notes: input.notes ?? null,
      createdAt: ctx.now().getTime(),
    });
  }

  async function updateExpense(raw: unknown) {
    const input: UpdateExpenseInput = parseArgs(updateExpenseSchema, raw);
    const existing = await requireExpense(store, input.id);
    const equipmentId = await resolveExpenseEquipment(
      store,
      input.equipmentId,
      existing.equipmentId,
    );
    return store.updateExpense(existing.id, {
      amount: input.amount,
      currency: input.currency,
      dateISO: input.dateISO,
      category: input.category,
      equipmentId,
      notes: input.notes,
    });
  }

  async function deleteExpense(raw: unknown) {
    const { id, confirm } = parseArgs(deleteByIdSchema, raw);
    const existing = await requireExpense(store, id);
    if (!confirm) {
      return {
        confirm_required: true,
        preview: existing,
        message:
          'Pass confirm: true to permanently delete this expense. This cannot be undone.',
      };
    }
    await store.deleteExpense(id);
    return { deleted: true, id };
  }

  async function getProfile() {
    return store.getSettings();
  }

  async function updateProfile(raw: unknown) {
    const input: UpdateProfileInput = parseArgs(updateProfileSchema, raw);
    const current = await store.getSettings();
    if (input.defaults?.paragliderId) {
      await resolveGear(store, 'paraglider', input.defaults.paragliderId);
    }
    if (input.defaults?.harnessId) {
      await resolveGear(store, 'harness', input.defaults.harnessId);
    }
    const next: UserSettings = mergeSettings({
      ...current,
      importedAt: current.importedAt,
      currency: input.currency ?? current.currency,
      pilot: {
        ...current.pilot,
        ...(input.pilot
          ? {
              name:
                input.pilot.name !== undefined
                  ? input.pilot.name
                  : current.pilot.name,
              shvNr:
                input.pilot.shvNr !== undefined
                  ? input.pilot.shvNr
                  : current.pilot.shvNr,
              dateOfIssueISO:
                input.pilot.dateOfIssueISO !== undefined
                  ? input.pilot.dateOfIssueISO
                  : current.pilot.dateOfIssueISO,
            }
          : {}),
      },
      defaults: {
        ...current.defaults,
        ...(input.defaults
          ? {
              paragliderId:
                input.defaults.paragliderId !== undefined
                  ? input.defaults.paragliderId
                  : current.defaults.paragliderId,
              harnessId:
                input.defaults.harnessId !== undefined
                  ? input.defaults.harnessId
                  : current.defaults.harnessId,
              takeoff:
                input.defaults.takeoff !== undefined
                  ? input.defaults.takeoff
                  : current.defaults.takeoff,
              landing:
                input.defaults.landing !== undefined
                  ? input.defaults.landing
                  : current.defaults.landing,
            }
          : {}),
      },
      maintenanceDefaults: {
        wing: {
          ...current.maintenanceDefaults.wing,
          ...(input.maintenanceDefaults?.wing ?? {}),
        },
        harness: {
          ...current.maintenanceDefaults.harness,
          ...(input.maintenanceDefaults?.harness ?? {}),
        },
        reserve: {
          months:
            input.maintenanceDefaults?.reserve?.months !== undefined
              ? input.maintenanceDefaults.reserve.months
              : current.maintenanceDefaults.reserve.months,
          flights: DEFAULT_MAINTENANCE_DEFAULTS.reserve.flights,
          hours: DEFAULT_MAINTENANCE_DEFAULTS.reserve.hours,
        },
      },
    });
    return store.saveSettings(next);
  }

  async function getStats(raw: unknown) {
    const input = parseArgs(getStatsSchema, raw);
    const refDateISO = input.dateISO ?? today();
    const [equipment, flights, expenses, settings] = await Promise.all([
      store.listEquipment(),
      store.listFlights(),
      store.listExpenses(),
      store.getSettings(),
    ]);
    flights.sort((a, b) => flightSortKey(b).localeCompare(flightSortKey(a)));
    const dashboard = computeDashboard(
      equipment,
      flights,
      expenses,
      settings,
      refDateISO,
    );

    const byYear = new Map<
      number,
      {
        year: number;
        flights: number;
        hours: number;
        expenseSpend: number;
        gearNet: number;
      }
    >();
    const bumpYear = (year: number | null) => {
      if (year == null) return null;
      const cur = byYear.get(year) ?? {
        year,
        flights: 0,
        hours: 0,
        expenseSpend: 0,
        gearNet: 0,
      };
      byYear.set(year, cur);
      return cur;
    };
    for (const f of flights) {
      const row = bumpYear(yearOf(f.dateISO));
      if (row) {
        row.flights += 1;
        row.hours += f.airtimeMinutes / 60;
      }
    }
    for (const e of expenses) {
      const row = bumpYear(yearOf(e.dateISO));
      if (row) row.expenseSpend += e.amount;
    }
    for (const eq of equipment) {
      const purchaseYear = yearOf(eq.purchaseDateISO);
      const purchaseRow = bumpYear(purchaseYear);
      if (purchaseRow) purchaseRow.gearNet += eq.purchasePrice ?? 0;
      const saleYear = yearOf(eq.saleDateISO);
      const saleRow = bumpYear(saleYear);
      if (saleRow) saleRow.gearNet -= eq.salePrice ?? 0;
    }

    const round1 = (n: number) => Math.round(n * 10) / 10;

    return {
      currency: settings.currency,
      refDateISO,
      totalFlights: dashboard.totalFlights,
      totalHours: dashboard.totalHours,
      flightsThisYear: dashboard.flightsThisYear,
      hoursThisYear: dashboard.hoursThisYear,
      totalSpend: dashboard.totalSpend,
      costPerFlight: dashboard.costPerFlight,
      costPerHour: dashboard.costPerHour,
      byWing: dashboard.byWing,
      topSites: dashboard.topSites,
      recentFlights: dashboard.recentFlights,
      overdue: dashboard.overdue.map((m) => ({
        equipmentId: m.equipment.id,
        label: equipmentLabel(m.equipment),
        status: m.result.status,
        reason: m.result.reason,
        daysRemaining: m.result.daysRemaining,
      })),
      dueSoon: dashboard.dueSoon.map((m) => ({
        equipmentId: m.equipment.id,
        label: equipmentLabel(m.equipment),
        status: m.result.status,
        reason: m.result.reason,
        daysRemaining: m.result.daysRemaining,
      })),
      needsData: dashboard.needsData.map((m) => ({
        equipmentId: m.equipment.id,
        label: equipmentLabel(m.equipment),
        reason: m.result.reason,
      })),
      warnings: dashboard.warnings,
      spendByYear: [...byYear.values()]
        .sort((a, b) => b.year - a.year)
        .map((row) => ({
          year: row.year,
          flights: row.flights,
          hours: round1(row.hours),
          expenseSpend: Math.round(row.expenseSpend),
          gearNet: Math.round(row.gearNet),
          totalSpend: Math.round(row.expenseSpend + row.gearNet),
        })),
    };
  }

  return {
    list_flights: (args: unknown) => runTool(() => listFlights(args)),
    get_flight: (args: unknown) => runTool(() => getFlight(args)),
    create_flight: (args: unknown) => runTool(() => createFlight(args)),
    update_flight: (args: unknown) => runTool(() => updateFlight(args)),
    delete_flight: (args: unknown) => runTool(() => deleteFlight(args)),
    list_equipment: (args: unknown) => runTool(() => listEquipment(args)),
    get_equipment: (args: unknown) => runTool(() => getEquipment(args)),
    create_equipment: (args: unknown) => runTool(() => createEquipment(args)),
    update_equipment: (args: unknown) => runTool(() => updateEquipment(args)),
    delete_equipment: (args: unknown) => runTool(() => deleteEquipment(args)),
    list_expenses: (args: unknown) => runTool(() => listExpenses(args)),
    get_expense: (args: unknown) => runTool(() => getExpense(args)),
    create_expense: (args: unknown) => runTool(() => createExpense(args)),
    update_expense: (args: unknown) => runTool(() => updateExpense(args)),
    delete_expense: (args: unknown) => runTool(() => deleteExpense(args)),
    get_profile: (_args: unknown) => runTool(() => getProfile()),
    update_profile: (args: unknown) => runTool(() => updateProfile(args)),
    get_stats: (args: unknown) => runTool(() => getStats(args)),
  };
}

export type TracksonHandlers = ReturnType<typeof createHandlers>;
