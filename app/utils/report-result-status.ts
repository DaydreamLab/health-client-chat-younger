import type { HealthReportResult } from '~/utils/candor-api'

export type ResultStatusClass = 'ok' | 'warn' | 'alert' | 'unknown'

export function resultNumeric(r: HealthReportResult): number | null {
  if (r.value_numeric != null && !Number.isNaN(Number(r.value_numeric))) {
    return Number(r.value_numeric)
  }
  if (r.raw_value != null && r.raw_value !== '' && !Number.isNaN(Number(r.raw_value))) {
    return Number(r.raw_value)
  }
  return null
}

export function resultStatusClass(r: HealthReportResult): ResultStatusClass {
  const v = resultNumeric(r)
  if (v == null) {
    return r.needs_review ? 'warn' : 'unknown'
  }
  if (r.critical_low != null && v < Number(r.critical_low)) {
    return 'alert'
  }
  if (r.critical_high != null && v > Number(r.critical_high)) {
    return 'alert'
  }
  if (r.borderline_low != null && v < Number(r.borderline_low)) {
    return 'warn'
  }
  if (r.borderline_high != null && v > Number(r.borderline_high)) {
    return 'warn'
  }
  if (r.ref_low != null && v < Number(r.ref_low)) {
    return 'warn'
  }
  if (r.ref_high != null && v > Number(r.ref_high)) {
    return 'warn'
  }
  if (r.ref_low != null || r.ref_high != null) {
    return 'ok'
  }
  return r.needs_review ? 'warn' : 'unknown'
}

export function resultStatusLabel(cls: ResultStatusClass) {
  if (cls === 'ok') {
    return '最佳值'
  }
  if (cls === 'warn') {
    return '提醒值'
  }
  if (cls === 'alert') {
    return '警戒值'
  }
  return '待確認'
}

export function formatResultRef(r: HealthReportResult) {
  const low = r.ref_low
  const high = r.ref_high
  if (low == null && high == null) {
    return '—'
  }
  if (low != null && high != null) {
    return `${low} ~ ${high}`
  }
  if (low != null) {
    return `≥ ${low}`
  }
  return `≤ ${high}`
}

export function resultGaugePct(r: HealthReportResult): number | null {
  const v = resultNumeric(r)
  const low = r.ref_low != null ? Number(r.ref_low) : null
  const high = r.ref_high != null ? Number(r.ref_high) : null
  if (v == null || low == null || high == null || high <= low) {
    return null
  }
  const pad = (high - low) * 0.5
  const min = low - pad
  const max = high + pad
  return Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))
}

export type ResultScaleStatus = 'ok' | 'warn' | 'alert'

export interface ResultScaleBand {
  status: ResultScaleStatus
  /** 0 is the low end of the scale, 100 is the high end. */
  fromPct: number
  toPct: number
}

export interface ResultScale {
  min: number
  max: number
  valuePct: number | null
  bands: ResultScaleBand[]
}

const SCALE_PAD_RATIO = 0.5
const SCALE_EXTEND_RATIO = 0.15

function bound(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(Number(value))) {
    return null
  }
  return Number(value)
}

/** Vertical zone rail for a result card. Null when the optimal interval cannot be drawn. */
export function resultScale(r: HealthReportResult): ResultScale | null {
  const refLow = bound(r.ref_low)
  const refHigh = bound(r.ref_high)
  if (refLow == null || refHigh == null || refHigh <= refLow) {
    return null
  }

  const span = refHigh - refLow
  let min = refLow - span * SCALE_PAD_RATIO
  let max = refHigh + span * SCALE_PAD_RATIO
  const extras = [
    bound(r.borderline_low),
    bound(r.borderline_high),
    bound(r.critical_low),
    bound(r.critical_high),
    resultNumeric(r)
  ]
  for (const value of extras) {
    if (value == null) {
      continue
    }
    if (value < min) {
      min = value - span * SCALE_EXTEND_RATIO
    }
    if (value > max) {
      max = value + span * SCALE_EXTEND_RATIO
    }
  }

  const alertLow = bound(r.critical_low)
  const alertHigh = bound(r.critical_high)
  const lowCut = alertLow != null && alertLow < refLow ? alertLow : null
  const highCut = alertHigh != null && alertHigh > refHigh ? alertHigh : null
  const edges = [min]
  if (lowCut != null && lowCut > min && lowCut < refLow) {
    edges.push(lowCut)
  }
  edges.push(refLow, refHigh)
  if (highCut != null && highCut > refHigh && highCut < max) {
    edges.push(highCut)
  }
  edges.push(max)

  const bands: ResultScaleBand[] = []
  for (let i = 0; i < edges.length - 1; i++) {
    const start = edges[i]
    const end = edges[i + 1]
    if (start == null || end == null || end <= start) {
      continue
    }
    const mid = (start + end) / 2
    let status: ResultScaleStatus = 'ok'
    if ((lowCut != null && mid < lowCut) || (highCut != null && mid > highCut)) {
      status = 'alert'
    } else if (mid < refLow || mid > refHigh) {
      status = 'warn'
    }
    const fromPct = ((start - min) / (max - min)) * 100
    const toPct = ((end - min) / (max - min)) * 100
    const prev = bands[bands.length - 1]
    if (prev && prev.status === status) {
      prev.toPct = toPct
    } else {
      bands.push({ status, fromPct, toPct })
    }
  }

  const value = resultNumeric(r)
  const valuePct = value == null
    ? null
    : Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))

  return { min, max, valuePct, bands }
}

export function displayResultValue(r: HealthReportResult) {
  const v = resultNumeric(r)
  if (v != null) {
    return String(v)
  }
  return r.raw_value != null ? String(r.raw_value) : '—'
}
