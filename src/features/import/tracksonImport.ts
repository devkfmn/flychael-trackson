import type { TracksonExport } from '../export/tracksonExport';

export function isTracksonExport(parsed: unknown): parsed is TracksonExport {
  return (
    parsed != null &&
    typeof parsed === 'object' &&
    (parsed as TracksonExport).format === 'trackson'
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** Validates and returns a Trackson export file. Throws on invalid input. */
export function parseTracksonExport(parsed: unknown): TracksonExport {
  if (!isTracksonExport(parsed)) {
    throw new Error('Not a Trackson backup file.');
  }
  if (parsed.version !== 1) {
    throw new Error(`Unsupported Trackson backup version: ${parsed.version}.`);
  }
  if (!isObject(parsed.settings)) {
    throw new Error('Trackson backup is missing settings.');
  }
  if (!isArray(parsed.equipment)) {
    throw new Error('Trackson backup is missing equipment.');
  }
  if (!isArray(parsed.flights)) {
    throw new Error('Trackson backup is missing flights.');
  }
  if (!isArray(parsed.expenses)) {
    throw new Error('Trackson backup is missing expenses.');
  }
  if (typeof parsed.exportedAt !== 'number') {
    throw new Error('Trackson backup is missing exportedAt.');
  }
  return parsed;
}
