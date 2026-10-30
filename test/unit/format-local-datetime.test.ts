import { describe, expect, it } from 'vitest'
import {
  formatLocalDateTime,
  normalizeInstantString,
  parseInstant
} from '../../app/utils/format-local-datetime'

describe('format-local-datetime', () => {
  it('normalizes Postgres-style timestamps', () => {
    expect(normalizeInstantString('2026-10-25 06:22:00+00')).toBe('2026-10-25T06:22:00+00:00')
  })

  it('formats in Asia/Taipei and UTC', () => {
    const iso = '2026-10-25T06:22:00Z'
    expect(formatLocalDateTime(iso, { timeZone: 'Asia/Taipei', style: 'list' })).toBe('10/25 14:22')
    expect(formatLocalDateTime(iso, { timeZone: 'UTC', style: 'list' })).toBe('10/25 06:22')
  })

  it('leaves pure dates unchanged', () => {
    expect(formatLocalDateTime('2026-10-25')).toBe('2026-10-25')
  })

  it('parses Postgres +00', () => {
    expect(parseInstant('2026-10-25 06:22:00+00')?.toISOString()).toBe('2026-10-25T06:22:00.000Z')
  })
})
