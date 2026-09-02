import { describe, expect, it } from 'vitest'
import { availablePlans } from '../../app/utils/plans'

describe('availablePlans', () => {
  it('offers basic and premium when the guest already has a report', () => {
    expect(availablePlans({ hasReport: true })).toEqual(['basic', 'premium'])
  })

  it('offers mid and premium when the guest has no report', () => {
    expect(availablePlans({ hasReport: false })).toEqual(['mid', 'premium'])
  })
})
