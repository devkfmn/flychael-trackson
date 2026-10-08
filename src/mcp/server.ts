import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createHandlers, type HandlerContext } from './handlers.js';
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
  emptyObjectSchema,
  updateProfileSchema,
} from './schemas.js';
import { createFirestoreStore, type TracksonStore } from './store.js';

export function createTracksonMcpServer(
  store: TracksonStore = createFirestoreStore(),
  now: () => Date = () => new Date(),
): McpServer {
  const ctx: HandlerContext = { store, now };
  const h = createHandlers(ctx);
  const server = new McpServer(
    { name: 'flychael-trackson', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.registerTool(
    'list_flights',
    {
      description:
        'List flights for the owner, newest first (dateISO then time). Filter by date_from/date_to (yyyy-MM-dd, Europe/Zurich), paraglider_id, harness_id, source (manual|igc|import), takeoff/landing substring. Paginate with limit (default 50, max 200) and offset.',
      inputSchema: listFlightsSchema,
    },
    async (args) => h.list_flights(args),
  );

  server.registerTool(
    'get_flight',
    {
      description: 'Get one flight by id, including gear links, airtimeMinutes, and IGC/track metadata if any.',
      inputSchema: idSchema,
    },
    async (args) => h.get_flight(args),
  );

  server.registerTool(
    'create_flight',
    {
      description:
        'Log a flight. Required: airtimeMinutes (whole minutes). dateISO defaults to today in Europe/Zurich (yyyy-MM-dd). time is HH:mm or omit. takeoff/landing/paragliderId/harnessId default from profile defaults when omitted. source is stored as manual (or igc if igc metadata is passed). Dates use yyyy-MM-dd.',
      inputSchema: createFlightSchema,
    },
    async (args) => h.create_flight(args),
  );

  server.registerTool(
    'update_flight',
    {
      description:
        'Patch a flight by id. Omitted fields are left unchanged; pass null to clear optional fields such as comments, paragliderId, harnessId, time, distanceKm, altitudeGainM.',
      inputSchema: updateFlightSchema,
    },
    async (args) => h.update_flight(args),
  );

  server.registerTool(
    'delete_flight',
    {
      description:
        'Delete a flight. Without confirm: true this only returns a preview. Pass confirm: true to permanently delete.',
      inputSchema: deleteByIdSchema,
    },
    async (args) => h.delete_flight(args),
  );

  server.registerTool(
    'list_equipment',
    {
      description:
        'List equipment sorted by type then name. Filter by type (paraglider|harness|reserve|other) and status (active|borrowed|sold). Paginate with limit/offset.',
      inputSchema: listEquipmentSchema,
    },
    async (args) => h.list_equipment(args),
  );

  server.registerTool(
    'get_equipment',
    {
      description: 'Get one equipment item by id, including prices, dates, status, and maintenanceRule override.',
      inputSchema: idSchema,
    },
    async (args) => h.get_equipment(args),
  );

  server.registerTool(
    'create_equipment',
    {
      description:
        'Add gear. Required: type (paraglider|harness|reserve|other), producer, model. status defaults to active (also borrowed|sold). Dates are yyyy-MM-dd. purchasePrice/salePrice are numbers; sale of gear is stored here (not as a negative expense). maintenanceRule null uses the profile type default.',
      inputSchema: createEquipmentSchema,
    },
    async (args) => h.create_equipment(args),
  );

  server.registerTool(
    'update_equipment',
    {
      description:
        'Patch equipment by id, including status transitions (active|borrowed|sold). Pass maintenanceRule: null to clear a per-item override. Omitted fields are unchanged.',
      inputSchema: updateEquipmentSchema,
    },
    async (args) => h.update_equipment(args),
  );

  server.registerTool(
    'delete_equipment',
    {
      description:
        'Delete equipment. Without confirm: true this only returns a preview (including how many flights/expenses reference it). Pass confirm: true to permanently delete.',
      inputSchema: deleteByIdSchema,
    },
    async (args) => h.delete_equipment(args),
  );

  server.registerTool(
    'list_expenses',
    {
      description:
        'List manual expense documents (newest dateISO first). Does not include ledger rows derived from equipment purchasePrice/salePrice — those appear in get_stats. Filter by date_from/date_to, equipment_id, category (purchase|sale|repair|check|gear|other). Paginate with limit/offset.',
      inputSchema: listExpensesSchema,
    },
    async (args) => h.list_expenses(args),
  );

  server.registerTool(
    'get_expense',
    {
      description: 'Get one expense by id.',
      inputSchema: idSchema,
    },
    async (args) => h.get_expense(args),
  );

  server.registerTool(
    'create_expense',
    {
      description:
        'Add an expense. Required: amount (>= 0). currency defaults to profile currency (CHF). dateISO defaults to today in Europe/Zurich. category defaults to gear (purchase|sale|repair|check|gear|other). equipmentId is optional. Gear purchases/sales should usually be set on the equipment item instead.',
      inputSchema: createExpenseSchema,
    },
    async (args) => h.create_expense(args),
  );

  server.registerTool(
    'update_expense',
    {
      description:
        'Patch an expense by id. The UI has no expense-edit form; this exists for full CRUD parity. Omitted fields are unchanged.',
      inputSchema: updateExpenseSchema,
    },
    async (args) => h.update_expense(args),
  );

  server.registerTool(
    'delete_expense',
    {
      description:
        'Delete an expense. Without confirm: true this only returns a preview. Pass confirm: true to permanently delete.',
      inputSchema: deleteByIdSchema,
    },
    async (args) => h.delete_expense(args),
  );

  server.registerTool(
    'get_profile',
    {
      description:
        'Read the owner profile/settings: pilot (name, shvNr, dateOfIssueISO), defaults (paragliderId, harnessId, takeoff, landing), currency, maintenanceDefaults (wing/harness/reserve rules), importedAt.',
      inputSchema: emptyObjectSchema,
    },
    async (args) => h.get_profile(args),
  );

  server.registerTool(
    'update_profile',
    {
      description:
        'Patch profile fields the Settings UI allows: pilot.name/shvNr/dateOfIssueISO, defaults.paragliderId/harnessId/takeoff/landing, currency, maintenanceDefaults.wing|harness|{months,flights,hours} and reserve.months. importedAt is preserved and cannot be changed. Partial updates merge with the current document.',
      inputSchema: updateProfileSchema,
    },
    async (args) => h.update_profile(args),
  );

  server.registerTool(
    'get_stats',
    {
      description:
        'Dashboard totals computed the same way as the app: total flights/airtime, this-year flights/hours, net gear + expenses spend, cost per flight/hour, flights by wing, top takeoffs, recent flights, maintenance overdue/due soon, data-quality warnings, plus spend/flights by calendar year. Optional dateISO (yyyy-MM-dd, default today Europe/Zurich) is the reference for "this year" and maintenance remaining.',
      inputSchema: getStatsSchema,
    },
    async (args) => h.get_stats(args),
  );

  return server;
}
