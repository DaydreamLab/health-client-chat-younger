import { describe, expect, it } from 'vitest'
import {
  TAIWAN_CITIES,
  TAIWAN_CITY_EN,
  composeTaiwanAddress,
  districtsForCity,
  taiwanCityLabel
} from '../../app/utils/taiwan-regions'

describe('taiwan-regions', () => {
  it('lists major cities and nested districts', () => {
    expect(TAIWAN_CITIES).toContain('台北市')
    expect(districtsForCity('台北市')).toContain('大安區')
    expect(districtsForCity('')).toEqual([])
  })

  it('maps all 22 cities to official English labels', () => {
    expect(TAIWAN_CITIES).toHaveLength(22)
    expect(Object.keys(TAIWAN_CITY_EN)).toHaveLength(22)
    for (const city of TAIWAN_CITIES) {
      expect(TAIWAN_CITY_EN[city]).toBeTruthy()
    }
    expect(taiwanCityLabel('台北市', 'en')).toBe('Taipei City')
    expect(taiwanCityLabel('連江縣', 'en')).toBe('Lienchiang County')
    expect(taiwanCityLabel('台北市', 'zh-TW')).toBe('台北市')
  })

  it('composes full recipient address', () => {
    expect(composeTaiwanAddress('台北市', '大安區', '忠孝東路四段1號'))
      .toBe('台北市大安區忠孝東路四段1號')
  })
})
