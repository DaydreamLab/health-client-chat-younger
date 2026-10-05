import { describe, expect, it } from 'vitest'
import { shouldIgnoreComposerEnter } from '../../app/utils/composer-enter'

describe('shouldIgnoreComposerEnter', () => {
  it('ignores Enter while a composition session is still open', () => {
    expect(shouldIgnoreComposerEnter({ isComposing: false, keyCode: 13 }, true)).toBe(true)
  })

  it('ignores Enter while the key event is still composing', () => {
    expect(shouldIgnoreComposerEnter({ isComposing: true, keyCode: 13 }, false)).toBe(true)
  })

  it('ignores the IME processing key', () => {
    expect(shouldIgnoreComposerEnter({ isComposing: false, keyCode: 229 }, false)).toBe(true)
  })

  it('sends on a normal Enter', () => {
    expect(shouldIgnoreComposerEnter({ isComposing: false, keyCode: 13 }, false)).toBe(false)
  })

  it('ignores the Enter that confirms a candidate just after compositionend', () => {
    expect(shouldIgnoreComposerEnter(
      { isComposing: false, keyCode: 13, timeStamp: 1000 },
      false,
      980
    )).toBe(true)
  })

  it('sends when Enter comes after the confirm window', () => {
    expect(shouldIgnoreComposerEnter(
      { isComposing: false, keyCode: 13, timeStamp: 1200 },
      false,
      1000
    )).toBe(false)
  })

  it('sends when the Enter was recorded before compositionend', () => {
    expect(shouldIgnoreComposerEnter(
      { isComposing: false, keyCode: 13, timeStamp: 500 },
      false,
      1000
    )).toBe(false)
  })
})
