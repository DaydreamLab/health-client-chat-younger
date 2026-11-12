import { describe, expect, it } from 'vitest'
import {
  planPathEntrySubmit,
  shouldClearComposerOnSubmit
} from '../../app/utils/path-entry-submit'

describe('planPathEntrySubmit', () => {
  it('ignores empty／whitespace and does not clear', () => {
    const plan = planPathEntrySubmit({
      content: '   ',
      pending: false,
      pathEntryPending: true
    })
    expect(plan).toEqual({ type: 'ignore' })
    expect(shouldClearComposerOnSubmit(plan)).toBe(false)
  })

  it('ignores while pending／readonly／escalated (keeps typed text)', () => {
    expect(planPathEntrySubmit({
      content: '聊聊睡眠',
      pending: true,
      pathEntryPending: false
    }).type).toBe('ignore')
    expect(planPathEntrySubmit({
      content: '聊聊睡眠',
      pending: false,
      readonly: true,
      pathEntryPending: false
    }).type).toBe('ignore')
    expect(planPathEntrySubmit({
      content: '聊聊睡眠',
      pending: false,
      escalated: true,
      pathEntryPending: false
    }).type).toBe('ignore')
  })

  it('pathEntryPending + typed text → implicit path A (not silent drop)', () => {
    const plan = planPathEntrySubmit({
      content: '  想問睡眠  ',
      pending: false,
      pathEntryPending: true
    })
    expect(plan).toEqual({ type: 'implicit_path_a', content: '想問睡眠' })
    expect(shouldClearComposerOnSubmit(plan)).toBe(true)
  })

  it('normal send when path already chosen', () => {
    const plan = planPathEntrySubmit({
      content: '繼續聊',
      pending: false,
      pathEntryPending: false
    })
    expect(plan).toEqual({ type: 'send', content: '繼續聊' })
    expect(shouldClearComposerOnSubmit(plan)).toBe(true)
  })
})
