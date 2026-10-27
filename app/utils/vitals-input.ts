import type { VitalsField } from '~/utils/reply-actions'

export interface VitalsFieldRange {
  min: number
  max: number
  /** Default selection for age picker. */
  defaultValue: number
}

/** Frontend validation ranges (backend remains authoritative). */
export const VITALS_FIELD_RANGE: Record<VitalsField, VitalsFieldRange> = {
  age: { min: 1, max: 120, defaultValue: 30 },
  height: { min: 80, max: 250, defaultValue: 170 },
  weight: { min: 20, max: 300, defaultValue: 60 }
}

export type VitalsInputStatus = 'empty' | 'input' | 'error' | 'pending' | 'submitted'

export function parseVitalsDigits(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }
  if (!/^\d+$/.test(trimmed)) {
    return null
  }
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

export function isVitalsValueInRange(field: VitalsField, value: number): boolean {
  const range = VITALS_FIELD_RANGE[field]
  return Number.isInteger(value) && value >= range.min && value <= range.max
}

export function vitalsInputStatus(
  field: VitalsField,
  raw: string,
  opts?: { pending?: boolean, submitted?: boolean }
): VitalsInputStatus {
  if (opts?.submitted) {
    return 'submitted'
  }
  if (opts?.pending) {
    return 'pending'
  }
  const trimmed = raw.trim()
  if (!trimmed) {
    return 'empty'
  }
  const n = parseVitalsDigits(trimmed)
  if (n === null || !isVitalsValueInRange(field, n)) {
    return 'error'
  }
  return 'input'
}

export function canConfirmVitals(field: VitalsField, raw: string): boolean {
  const n = parseVitalsDigits(raw)
  return n !== null && isVitalsValueInRange(field, n)
}

/** Append a digit (or reject) for integer-only numpad. */
export function appendVitalsDigit(raw: string, digit: string, maxDigits = 3): string {
  if (!/^\d$/.test(digit)) {
    return raw
  }
  if (raw === '0') {
    return digit
  }
  if (raw.length >= maxDigits) {
    return raw
  }
  return `${raw}${digit}`
}

export function backspaceVitalsDigits(raw: string): string {
  return raw.slice(0, -1)
}

export function agePickerValues(): number[] {
  const { min, max } = VITALS_FIELD_RANGE.age
  const values: number[] = []
  for (let i = min; i <= max; i += 1) {
    values.push(i)
  }
  return values
}

/** Prefer payload gap_code when single field; else use field id as gap_code. */
export function vitalsGapCodeForField(
  field: VitalsField,
  fields: VitalsField[],
  payloadGapCode: string | null | undefined
): string {
  if (payloadGapCode && fields.length === 1) {
    return payloadGapCode
  }
  if (payloadGapCode && fields[0] === field) {
    return payloadGapCode
  }
  return field
}
