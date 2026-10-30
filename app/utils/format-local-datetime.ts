/**
 * Parse API / Postgres timestamptz strings and format in the viewer's timezone.
 * Optional `timeZone` is for tests only; UI callers omit it (browser default).
 */

export type FormatLocalDateTimeOptions = {
  /** IANA zone for tests; omit in UI so Intl uses the browser timezone. */
  timeZone?: string
  /** Locale for Intl (default zh-TW). */
  locale?: string
  /**
   * - `list` — MM/DD HH:mm
   * - `full` — YYYY-MM-DD HH:mm
   * - `intl-short` — dateStyle medium + timeStyle short
   * - `intl-numeric` — year/month/day + hour/minute numeric
   */
  style?: 'list' | 'full' | 'intl-short' | 'intl-numeric'
  /** Empty / missing fallback (default '—'). */
  empty?: string
}

/** Normalize Postgres / ISO instant strings so Date can parse them. */
export function normalizeInstantString(raw: string): string {
  let s = raw.trim()
  if (!s) {
    return s
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s
  }
  s = s.replace(/^(\d{4}-\d{2}-\d{2}) (\d)/, '$1T$2')
  s = s.replace(/([+-]\d{2})$/, '$1:00')
  s = s.replace(/([+-]\d{2})(\d{2})$/, '$1:$2')
  return s
}

export function parseInstant(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }
  const raw = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return null
  }
  const normalized = normalizeInstantString(raw)
  const ms = Date.parse(normalized)
  if (Number.isNaN(ms)) {
    return null
  }
  return new Date(ms)
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function partsInZone(
  date: Date,
  timeZone: string | undefined
): { y: number, m: number, d: number, h: number, min: number } {
  const opts: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }
  if (timeZone) {
    opts.timeZone = timeZone
  }
  const parts = new Intl.DateTimeFormat('en-US', opts).formatToParts(date)
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value ?? '0'
  return {
    y: Number(pick('year')),
    m: Number(pick('month')),
    d: Number(pick('day')),
    h: Number(pick('hour')),
    min: Number(pick('minute'))
  }
}

/**
 * Calendar Y/M/D + HH:mm in a zone (browser default when timeZone omitted).
 */
export function calendarPartsInZone(
  date: Date,
  timeZone?: string
): { y: number, m: number, d: number, time: string } {
  const p = partsInZone(date, timeZone)
  return {
    y: p.y,
    m: p.m,
    d: p.d,
    time: `${pad2(p.h)}:${pad2(p.min)}`
  }
}

export function civilDayNumber(y: number, m: number, d: number): number {
  return Math.floor(Date.UTC(y, m - 1, d, 12) / 86_400_000)
}

/**
 * Format an instant for display. Pure dates `YYYY-MM-DD` are returned unchanged.
 * Unparseable non-empty strings are returned as-is.
 */
export function formatLocalDateTime(
  value: unknown,
  options: FormatLocalDateTimeOptions = {}
): string {
  const empty = options.empty ?? '—'
  if (typeof value !== 'string' || !value.trim()) {
    return empty
  }
  const raw = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw
  }

  const date = parseInstant(raw)
  if (date === null) {
    return raw
  }

  const style = options.style ?? 'intl-short'
  const locale = options.locale ?? 'zh-TW'
  const timeZone = options.timeZone

  if (style === 'list' || style === 'full') {
    const p = partsInZone(date, timeZone)
    if (style === 'list') {
      return `${pad2(p.m)}/${pad2(p.d)} ${pad2(p.h)}:${pad2(p.min)}`
    }
    return `${p.y}-${pad2(p.m)}-${pad2(p.d)} ${pad2(p.h)}:${pad2(p.min)}`
  }

  const opts: Intl.DateTimeFormatOptions
    = style === 'intl-short'
      ? { dateStyle: 'medium', timeStyle: 'short' }
      : {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23'
        }
  if (timeZone) {
    opts.timeZone = timeZone
  }
  try {
    return new Intl.DateTimeFormat(locale, opts).format(date)
  } catch {
    return raw
  }
}
