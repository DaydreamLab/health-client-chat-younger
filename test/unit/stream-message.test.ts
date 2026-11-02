import { describe, expect, it } from 'vitest'
import {
  STREAM_INTENT_AFTER_ANSWER,
  buildStreamRequestBody
} from '../../app/utils/stream-message'

describe('buildStreamRequestBody (candor-core #134)', () => {
  it('profile/answers echo follow-up: { content, intent: "after_answer" } same-level fields', () => {
    const body = buildStreamRequestBody('無', STREAM_INTENT_AFTER_ANSWER)
    expect(body).toEqual({
      content: '無',
      intent: 'after_answer'
    })
    expect(JSON.parse(JSON.stringify(body))).toEqual({
      content: '無',
      intent: 'after_answer'
    })
    expect(STREAM_INTENT_AFTER_ANSWER).toBe('after_answer')
  })

  it('typed composer: omits intent key when unset', () => {
    expect(buildStreamRequestBody('我想了解維生素D')).toEqual({
      content: '我想了解維生素D'
    })
    expect(buildStreamRequestBody('你好', null)).toEqual({ content: '你好' })
    expect(buildStreamRequestBody('你好', undefined)).toEqual({ content: '你好' })
    expect(buildStreamRequestBody('你好', '')).toEqual({ content: '你好' })
    expect(Object.hasOwn(buildStreamRequestBody('你好'), 'intent')).toBe(false)
  })

  it('preserves other intents such as interpret (no overwrite)', () => {
    expect(buildStreamRequestBody('請判讀報告重點', 'interpret')).toEqual({
      content: '請判讀報告重點',
      intent: 'interpret'
    })
  })
})
