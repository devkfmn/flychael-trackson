// Minimal IGC parser. Extracts flight date, start time, airtime and basic
// altitude metadata from the B-records. Intentionally does NOT attempt to
// resolve takeoff/landing site names (no GPS autofill yet).

export interface IgcParseResult {
  dateISO: string | null;
  startTime: string | null;
  airtimeMinutes: number | null;
  maxAltitudeM: number | null;
  altitudeGainM: number | null;
  points: number;
  filename: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Parse the HFDTE header (both legacy and modern forms) to `yyyy-MM-dd`. */
function parseHeaderDate(content: string): string | null {
  // Modern: HFDTEDATE:DDMMYY,NN  | Legacy: HFDTEDDMMYY
  const modern = /HFDTEDATE:\s*(\d{2})(\d{2})(\d{2})/i.exec(content);
  const legacy = /HFDTE(\d{2})(\d{2})(\d{2})/i.exec(content);
  const m = modern ?? legacy;
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yy = Number(m[3]);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const year = 2000 + yy;
  return `${year}-${pad2(mm)}-${pad2(dd)}`;
}

interface Fix {
  seconds: number;
  altitude: number;
}

function parseBRecord(line: string): Fix | null {
  // B HHMMSS .... pressureAlt(25-29) gnssAlt(30-34)
  if (line.length < 35 || line[0] !== 'B') return null;
  const hh = Number(line.slice(1, 3));
  const mm = Number(line.slice(3, 5));
  const ss = Number(line.slice(5, 7));
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || !Number.isFinite(ss)) {
    return null;
  }
  const pressure = Number(line.slice(25, 30));
  const gnss = Number(line.slice(30, 35));
  const altitude =
    Number.isFinite(gnss) && gnss !== 0
      ? gnss
      : Number.isFinite(pressure)
        ? pressure
        : 0;
  return { seconds: hh * 3600 + mm * 60 + ss, altitude };
}

export function parseIgc(content: string, filename: string): IgcParseResult {
  const lines = content.split(/\r?\n/);
  const dateISO = parseHeaderDate(content);

  const fixes: Fix[] = [];
  for (const line of lines) {
    if (line[0] === 'B') {
      const fix = parseBRecord(line);
      if (fix) fixes.push(fix);
    }
  }

  if (fixes.length === 0) {
    return {
      dateISO,
      startTime: null,
      airtimeMinutes: null,
      maxAltitudeM: null,
      altitudeGainM: null,
      points: 0,
      filename,
    };
  }

  const first = fixes[0];
  const last = fixes[fixes.length - 1];
  let durationSeconds = last.seconds - first.seconds;
  if (durationSeconds < 0) durationSeconds += 86_400; // crossed midnight

  let maxAltitude = -Infinity;
  let runningMin = Infinity;
  let maxGain = 0;
  for (const f of fixes) {
    if (f.altitude > maxAltitude) maxAltitude = f.altitude;
    if (f.altitude < runningMin) runningMin = f.altitude;
    const gain = f.altitude - runningMin;
    if (gain > maxGain) maxGain = gain;
  }

  const startHours = Math.floor(first.seconds / 3600);
  const startMinutes = Math.floor((first.seconds % 3600) / 60);

  return {
    dateISO,
    startTime: `${pad2(startHours)}:${pad2(startMinutes)}`,
    airtimeMinutes: Math.round(durationSeconds / 60),
    maxAltitudeM: maxAltitude === -Infinity ? null : Math.round(maxAltitude),
    altitudeGainM: maxGain > 0 ? Math.round(maxGain) : null,
    points: fixes.length,
    filename,
  };
}
