// Date helpers. The legacy Parafolio data uses Swiss formatting:
//   - dates as `dd.MM.yyyy`
//   - timestamps as `dd.MM.yyyy HH:mm`
// We normalize everything to ISO: calendar dates `yyyy-MM-dd`, times `HH:mm`.

const SWISS_DATE = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
const SWISS_DATETIME = /^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})$/;

function isValidYmd(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Parse `dd.MM.yyyy` into an ISO `yyyy-MM-dd` string, or null if invalid/empty. */
export function parseSwissDate(input: string | null | undefined): string | null {
  if (input == null) return null;
  const trimmed = input.trim();
  if (trimmed === '') return null;
  const m = SWISS_DATE.exec(trimmed);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (!isValidYmd(year, month, day)) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export interface ParsedSwissDateTime {
  dateISO: string;
  time: string;
}

/**
 * Parse `dd.MM.yyyy HH:mm` into `{ dateISO, time }`, or null if invalid/empty.
 */
export function parseSwissDateTime(
  input: string | null | undefined,
): ParsedSwissDateTime | null {
  if (input == null) return null;
  const trimmed = input.trim();
  if (trimmed === '') return null;
  const m = SWISS_DATETIME.exec(trimmed);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const hours = Number(m[4]);
  const minutes = Number(m[5]);
  if (!isValidYmd(year, month, day)) return null;
  if (hours > 23 || minutes > 59) return null;
  return {
    dateISO: `${year}-${pad2(month)}-${pad2(day)}`,
    time: `${pad2(hours)}:${pad2(minutes)}`,
  };
}

/** Format an ISO `yyyy-MM-dd` date as Swiss `dd.MM.yyyy` for display. */
export function formatSwissDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return '';
  return `${day}.${month}.${year}`;
}

/** Today as an ISO `yyyy-MM-dd` string in local time. */
export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** Whole calendar months between two ISO dates (b - a). Negative if b < a. */
export function monthsBetween(aISO: string, bISO: string): number {
  const a = isoToUtc(aISO);
  const b = isoToUtc(bISO);
  if (!a || !b) return 0;
  return (
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
    (b.getUTCMonth() - a.getUTCMonth()) -
    (b.getUTCDate() < a.getUTCDate() ? 1 : 0)
  );
}

/** Whole calendar days between two ISO dates (b - a). */
export function daysBetween(aISO: string, bISO: string): number {
  const a = isoToUtc(aISO);
  const b = isoToUtc(bISO);
  if (!a || !b) return 0;
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / 86_400_000);
}

/** Add months to an ISO date, returning a new ISO date. */
export function addMonthsISO(iso: string, months: number): string {
  const d = isoToUtc(iso);
  if (!d) return iso;
  const target = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate()),
  );
  return `${target.getUTCFullYear()}-${pad2(target.getUTCMonth() + 1)}-${pad2(
    target.getUTCDate(),
  )}`;
}

function isoToUtc(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!isValidYmd(year, month, day)) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

/** Year (number) of an ISO date, or null. */
export function yearOf(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const m = /^(\d{4})-/.exec(iso.trim());
  return m ? Number(m[1]) : null;
}
