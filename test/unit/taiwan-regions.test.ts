import { describe, expect, it } from 'vitest'
import {
  TAIWAN_CITIES,
  composeTaiwanAddress,
  districtsForCity
} from '../../app/utils/taiwan-regions'

describe('taiwan-regions', () => {
  it('lists major cities and nested districts', () => {
    expect(TAIWAN_CITIES).toContain('台北市')
    expect(districtsForCity('台北市')).toContain('大安區')
    expect(districtsForCity('')).toEqual([])
  })

  it('composes full recipient address', () => {
    expect(composeTaiwanAddress('台北市', '大安區', '忠孝東路四段1號'))
      .toBe('台北市大安區忠孝東路四段1號')
  })
})
