import { z } from 'zod';

export const EQUIPMENT_TYPES = [
  'paraglider',
  'harness',
  'reserve',
  'other',
] as const;

export const EQUIPMENT_STATUSES = ['active', 'borrowed', 'sold'] as const;

export const FLIGHT_SOURCES = ['manual', 'igc', 'import'] as const;

export const EXPENSE_CATEGORIES = [
  'purchase',
  'sale',
  'repair',
  'check',
  'gear',
  'other',
] as const;

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;
const TIME_HM = /^\d{2}:\d{2}$/;

export const dateISOSchema = z
  .string()
  .regex(DATE_ISO, 'Must be yyyy-MM-dd (Europe/Zurich calendar date)');

export const optionalDateISOSchema = z
  .union([dateISOSchema, z.literal(''), z.null()])
  .optional()
  .transform((v) => (v == null || v === '' ? null : v));

export const patchDateISOSchema = z
  .union([dateISOSchema, z.literal(''), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    return v === '' || v === null ? null : v;
  });

export const optionalStringSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (v === null) return null;
    const t = v.trim();
    return t === '' ? null : t;
  });

export const requiredTrimmedString = z
  .string()
  .trim()
  .min(1);

const optionalTimeSchema = z
  .union([
    z.string().regex(TIME_HM, 'Must be HH:mm (24h)'),
    z.literal(''),
    z.null(),
  ])
  .optional()
  .transform((v) => (v == null || v === '' ? null : v));

const patchTimeSchema = z
  .union([
    z.string().regex(TIME_HM, 'Must be HH:mm (24h)'),
    z.literal(''),
    z.null(),
  ])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    return v === '' || v === null ? null : v;
  });

export const equipmentTypeSchema = z.enum(EQUIPMENT_TYPES, {
  error: `Invalid type. Allowed: ${EQUIPMENT_TYPES.join(', ')}`,
});

export const equipmentStatusSchema = z.enum(EQUIPMENT_STATUSES, {
  error: `Invalid status. Allowed: ${EQUIPMENT_STATUSES.join(', ')}`,
});

export const flightSourceSchema = z.enum(FLIGHT_SOURCES, {
  error: `Invalid source. Allowed: ${FLIGHT_SOURCES.join(', ')}`,
});

export const expenseCategorySchema = z.enum(EXPENSE_CATEGORIES, {
  error: `Invalid category. Allowed: ${EXPENSE_CATEGORIES.join(', ')}`,
});

export const paginationSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .describe('Page size. Default 50, max 200.'),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Number of matching items to skip. Default 0.'),
});

export const nullableNumberSchema = z
  .union([z.number(), z.null()])
  .optional();

export const maintenanceRuleSchema = z.object({
  months: z.number().nullable().optional(),
  flights: z.number().nullable().optional(),
  hours: z.number().nullable().optional(),
});

export const confirmSchema = z
  .boolean()
  .optional()
  .describe(
    'Must be true to actually delete. Omit or false returns a preview only.',
  );

export const listFlightsSchema = paginationSchema.extend({
  date_from: dateISOSchema
    .optional()
    .describe('Inclusive start date yyyy-MM-dd.'),
  date_to: dateISOSchema.optional().describe('Inclusive end date yyyy-MM-dd.'),
  paraglider_id: z.string().optional().describe('Filter by wing equipment id.'),
  harness_id: z.string().optional().describe('Filter by harness equipment id.'),
  source: flightSourceSchema
    .optional()
    .describe('Filter by source: manual, igc, or import.'),
  takeoff: z.string().optional().describe('Case-insensitive substring match.'),
  landing: z.string().optional().describe('Case-insensitive substring match.'),
});

export const idSchema = z.object({
  id: z.string().min(1, 'id is required'),
});

export const emptyObjectSchema = z.object({});

export const trackMetaSchema = z.object({
  points: z.number().int(),
  maxAltitudeM: z.number().nullable(),
  durationMinutes: z.number().nullable(),
});

export const igcMetaSchema = z.object({
  filename: z.string().min(1),
  importedAt: z.number().optional(),
});

export const createFlightSchema = z.object({
  dateISO: dateISOSchema
    .optional()
    .describe(
      'Flight calendar date yyyy-MM-dd. Defaults to today in Europe/Zurich.',
    ),
  time: optionalTimeSchema.describe('Local takeoff time HH:mm, or omit.'),
  takeoff: z
    .string()
    .trim()
    .optional()
    .describe(
      'Launch site. Defaults to profile defaults.takeoff when omitted.',
    ),
  landing: z
    .string()
    .trim()
    .optional()
    .describe(
      'Landing site. Defaults to profile defaults.landing when omitted.',
    ),
  paragliderId: optionalStringSchema.describe(
    'Wing equipment id. Defaults to profile defaults.paragliderId.',
  ),
  harnessId: optionalStringSchema.describe(
    'Harness equipment id. Defaults to profile defaults.harnessId.',
  ),
  airtimeMinutes: z
    .number()
    .int()
    .min(0, 'Airtime cannot be negative')
    .describe('Whole minutes of airtime (required).'),
  comments: optionalStringSchema,
  distanceKm: nullableNumberSchema,
  altitudeGainM: nullableNumberSchema,
  track: trackMetaSchema.nullable().optional(),
  igc: igcMetaSchema.nullable().optional(),
});

export const updateFlightSchema = z.object({
  id: z.string().min(1, 'id is required'),
  dateISO: dateISOSchema.optional(),
  time: patchTimeSchema,
  takeoff: z.string().trim().min(1).optional(),
  landing: z.string().trim().min(1).optional(),
  paragliderId: optionalStringSchema,
  harnessId: optionalStringSchema,
  airtimeMinutes: z.number().int().min(0).optional(),
  comments: optionalStringSchema,
  distanceKm: nullableNumberSchema,
  altitudeGainM: nullableNumberSchema,
  track: trackMetaSchema.nullable().optional(),
  igc: igcMetaSchema.nullable().optional(),
});

export const deleteByIdSchema = z.object({
  id: z.string().min(1, 'id is required'),
  confirm: confirmSchema,
});

export const listEquipmentSchema = paginationSchema.extend({
  type: equipmentTypeSchema
    .optional()
    .describe('paraglider, harness, reserve, or other.'),
  status: equipmentStatusSchema
    .optional()
    .describe('active, borrowed, or sold. Default lists all statuses.'),
});

export const createEquipmentSchema = z.object({
  type: equipmentTypeSchema.describe(
    'paraglider, harness, reserve, or other.',
  ),
  producer: requiredTrimmedString.describe('Manufacturer / brand.'),
  model: requiredTrimmedString,
  size: optionalStringSchema,
  owner: optionalStringSchema.describe(
    'Leave null for your own gear; set for borrowed gear.',
  ),
  serialNumber: optionalStringSchema,
  manufactureDateISO: optionalDateISOSchema,
  purchaseDateISO: optionalDateISOSchema,
  saleDateISO: optionalDateISOSchema,
  purchasePrice: nullableNumberSchema,
  salePrice: nullableNumberSchema,
  notes: optionalStringSchema,
  status: equipmentStatusSchema
    .optional()
    .describe('active, borrowed, or sold. Default active.'),
  lastCheckDateISO: optionalDateISOSchema.describe(
    'Last periodic check (wing/harness) or last repack (reserve).',
  ),
  maintenanceRule: maintenanceRuleSchema
    .nullable()
    .optional()
    .describe(
      'Per-item override. Null/omit uses the type default from profile.',
    ),
});

export const updateEquipmentSchema = z.object({
  id: z.string().min(1, 'id is required'),
  type: equipmentTypeSchema.optional(),
  producer: z.string().trim().min(1).optional(),
  model: z.string().trim().min(1).optional(),
  size: optionalStringSchema,
  owner: optionalStringSchema,
  serialNumber: optionalStringSchema,
  manufactureDateISO: patchDateISOSchema,
  purchaseDateISO: patchDateISOSchema,
  saleDateISO: patchDateISOSchema,
  purchasePrice: nullableNumberSchema,
  salePrice: nullableNumberSchema,
  notes: optionalStringSchema,
  status: equipmentStatusSchema
    .optional()
    .describe('Status transition: active, borrowed, or sold.'),
  lastCheckDateISO: patchDateISOSchema,
  maintenanceRule: maintenanceRuleSchema
    .nullable()
    .optional()
    .describe('Set to null to clear the override and use the type default.'),
});

export const listExpensesSchema = paginationSchema.extend({
  date_from: dateISOSchema.optional(),
  date_to: dateISOSchema.optional(),
  equipment_id: z.string().optional(),
  category: expenseCategorySchema
    .optional()
    .describe(
      'purchase, sale, repair, check, gear, or other. Ledger rows derived from gear prices are not in this collection — see get_stats.',
    ),
});

export const createExpenseSchema = z.object({
  amount: z
    .number()
    .min(0, 'Amount cannot be negative')
    .describe(
      'Cost amount. Sales of gear are stored on the equipment item (salePrice), not as a negative expense.',
    ),
  currency: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Defaults to the profile currency (usually CHF).'),
  dateISO: dateISOSchema
    .optional()
    .describe('Defaults to today in Europe/Zurich.'),
  category: expenseCategorySchema
    .optional()
    .describe('purchase, sale, repair, check, gear, or other. Default gear.'),
  equipmentId: optionalStringSchema,
  notes: optionalStringSchema,
});

export const updateExpenseSchema = z.object({
  id: z.string().min(1, 'id is required'),
  amount: z.number().min(0).optional(),
  currency: z.string().trim().min(1).optional(),
  dateISO: dateISOSchema.optional(),
  category: expenseCategorySchema.optional(),
  equipmentId: optionalStringSchema,
  notes: optionalStringSchema,
});

const maintenanceRulePatch = z
  .object({
    months: z.number().nullable().optional(),
    flights: z.number().nullable().optional(),
    hours: z.number().nullable().optional(),
  })
  .optional();

export const updateProfileSchema = z.object({
  pilot: z
    .object({
      name: z.string().optional(),
      shvNr: optionalStringSchema,
      dateOfIssueISO: patchDateISOSchema,
    })
    .optional(),
  defaults: z
    .object({
      paragliderId: optionalStringSchema,
      harnessId: optionalStringSchema,
      takeoff: optionalStringSchema,
      landing: optionalStringSchema,
    })
    .optional(),
  currency: z.string().trim().min(1).optional(),
  maintenanceDefaults: z
    .object({
      wing: maintenanceRulePatch,
      harness: maintenanceRulePatch,
      reserve: z
        .object({
          months: z.number().nullable().optional(),
        })
        .optional(),
    })
    .optional(),
});

export const getStatsSchema = z.object({
  dateISO: dateISOSchema
    .optional()
    .describe(
      'Reference date for "this year" and maintenance remaining. Defaults to today in Europe/Zurich.',
    ),
});

export type ListFlightsInput = z.output<typeof listFlightsSchema>;
export type CreateFlightInput = z.output<typeof createFlightSchema>;
export type UpdateFlightInput = z.output<typeof updateFlightSchema>;
export type ListEquipmentInput = z.output<typeof listEquipmentSchema>;
export type CreateEquipmentInput = z.output<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.output<typeof updateEquipmentSchema>;
export type ListExpensesInput = z.output<typeof listExpensesSchema>;
export type CreateExpenseInput = z.output<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.output<typeof updateExpenseSchema>;
export type UpdateProfileInput = z.output<typeof updateProfileSchema>;
export type GetStatsInput = z.output<typeof getStatsSchema>;
