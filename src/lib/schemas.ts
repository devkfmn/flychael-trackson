import { z } from 'zod';

// Form-input schemas. These validate user-entered data before it is normalized
// into the persisted domain model. Empty strings are treated as "not provided"
// for optional fields.

const optionalString = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable();

const optionalNumber = z
  .union([z.string(), z.number()])
  .transform((v) => {
    if (typeof v === 'number') return v;
    const trimmed = v.trim();
    if (trimmed === '') return null;
    const parsed = Number(trimmed.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  })
  .nullable();

/** `yyyy-MM-dd` produced by an `<input type="date">`, optional. */
const optionalDateISO = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable();

export const equipmentTypeSchema = z.enum([
  'paraglider',
  'harness',
  'reserve',
  'other',
]);

export const equipmentStatusSchema = z.enum(['active', 'borrowed', 'sold']);

export const maintenanceRuleSchema = z.object({
  months: optionalNumber,
  flights: optionalNumber,
  hours: optionalNumber,
});

export const equipmentFormSchema = z.object({
  type: equipmentTypeSchema,
  producer: z.string().trim().min(1, 'Producer is required'),
  model: z.string().trim().min(1, 'Model is required'),
  size: optionalString,
  owner: optionalString,
  serialNumber: optionalString,
  manufactureDateISO: optionalDateISO,
  purchaseDateISO: optionalDateISO,
  saleDateISO: optionalDateISO,
  purchasePrice: optionalNumber,
  salePrice: optionalNumber,
  notes: optionalString,
  status: equipmentStatusSchema,
  lastCheckDateISO: optionalDateISO,
  maintenanceRule: maintenanceRuleSchema.nullable().default(null),
});

export type EquipmentFormValues = z.input<typeof equipmentFormSchema>;
export type EquipmentFormOutput = z.output<typeof equipmentFormSchema>;

export const flightFormSchema = z.object({
  dateISO: z.string().trim().min(1, 'Date is required'),
  time: optionalString,
  takeoff: z.string().trim().min(1, 'Takeoff is required'),
  landing: z.string().trim().min(1, 'Landing is required'),
  paragliderId: optionalString,
  harnessId: optionalString,
  airtimeMinutes: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === 'number' ? v : Number(v)))
    .pipe(z.number().int().min(0, 'Airtime cannot be negative')),
  comments: optionalString,
  distanceKm: optionalNumber,
  altitudeGainM: optionalNumber,
});

export type FlightFormValues = z.input<typeof flightFormSchema>;
export type FlightFormOutput = z.output<typeof flightFormSchema>;

export const expenseCategorySchema = z.enum([
  'purchase',
  'sale',
  'repair',
  'check',
  'gear',
  'other',
]);

export const expenseFormSchema = z.object({
  equipmentId: optionalString,
  amount: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === 'number' ? v : Number(v)))
    .pipe(z.number().min(0, 'Amount cannot be negative')),
  currency: z.string().trim().min(1).default('CHF'),
  dateISO: z.string().trim().min(1, 'Date is required'),
  category: expenseCategorySchema,
  notes: optionalString,
});

export type ExpenseFormValues = z.input<typeof expenseFormSchema>;
export type ExpenseFormOutput = z.output<typeof expenseFormSchema>;

export const settingsFormSchema = z.object({
  pilotName: optionalString,
  shvNr: optionalString,
  dateOfIssueISO: optionalDateISO,
  defaultParagliderId: optionalString,
  defaultHarnessId: optionalString,
  defaultTakeoff: optionalString,
  defaultLanding: optionalString,
  currency: z.string().trim().min(1).default('CHF'),
  wingMonths: optionalNumber,
  wingFlights: optionalNumber,
  wingHours: optionalNumber,
  harnessMonths: optionalNumber,
  harnessFlights: optionalNumber,
  harnessHours: optionalNumber,
  reserveMonths: optionalNumber,
});

export type SettingsFormValues = z.input<typeof settingsFormSchema>;
export type SettingsFormOutput = z.output<typeof settingsFormSchema>;
