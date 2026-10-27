import { describe, expect, it } from 'vitest'
import {
  appendVitalsDigit,
  backspaceVitalsDigits,
  canConfirmVitals,
  isVitalsValueInRange,
  parseVitalsDigits,
  vitalsGapCodeForField,
  vitalsInputStatus
} from '../../app/utils/vitals-input'

describe('vitals-input', () => {
  it('parses integer digits only', () => {
    expect(parseVitalsDigits('')).toBeNull()
    expect(parseVitalsDigits('12')).toBe(12)
    expect(parseVitalsDigits('12.5')).toBeNull()
    expect(parseVitalsDigits('0')).toBe(0)
  })

  it('validates ranges', () => {
    expect(isVitalsValueInRange('age', 30)).toBe(true)
    expect(isVitalsValueInRange('age', 0)).toBe(false)
    expect(isVitalsValueInRange('height', 175)).toBe(true)
    expect(isVitalsValueInRange('height', 12)).toBe(false)
    expect(isVitalsValueInRange('weight', 68)).toBe(true)
    expect(isVitalsValueInRange('weight', 301)).toBe(false)
  })

  it('numpad append / backspace stay integer', () => {
    expect(appendVitalsDigit('', '1')).toBe('1')
    expect(appendVitalsDigit('17', '5')).toBe('175')
    expect(appendVitalsDigit('175', '0')).toBe('175')
    expect(appendVitalsDigit('0', '8')).toBe('8')
    expect(backspaceVitalsDigits('175')).toBe('17')
    expect(backspaceVitalsDigits('')).toBe('')
  })

  it('status machine covers empty / input / error / pending / submitted', () => {
    expect(vitalsInputStatus('height', '')).toBe('empty')
    expect(vitalsInputStatus('height', '175')).toBe('input')
    expect(vitalsInputStatus('height', '12')).toBe('error')
    expect(vitalsInputStatus('height', '175', { pending: true })).toBe('pending')
    expect(vitalsInputStatus('height', '175', { submitted: true })).toBe('submitted')
  })

  it('confirm requires in-range integer', () => {
    expect(canConfirmVitals('age', '30')).toBe(true)
    expect(canConfirmVitals('height', '')).toBe(false)
    expect(canConfirmVitals('height', '12')).toBe(false)
  })

  it('gap_code prefers payload for single field, else field id', () => {
    expect(vitalsGapCodeForField('age', ['age'], 'age_years')).toBe('age_years')
    expect(vitalsGapCodeForField('age', ['age', 'height'], 'age_years')).toBe('age_years')
    expect(vitalsGapCodeForField('height', ['age', 'height'], 'age_years')).toBe('height')
    expect(vitalsGapCodeForField('weight', ['weight'], null)).toBe('weight')
  })
})
