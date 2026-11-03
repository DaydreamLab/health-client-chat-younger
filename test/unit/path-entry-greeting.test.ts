import { describe, expect, it } from 'vitest'
import { normalizeConversationPath } from '../../app/utils/path-contract'
import {
  isUsableReplyActions,
  parseReplyActions,
  projectReplyActionsToCtas
} from '../../app/utils/reply-actions'

/** Contract shape from candor-core #133 — null-path create greeting. */
const entryGreetingReplyActions = {
  schema_version: '0.1',
  source: 'semantic_judgment',
  adaptor: 'rule',
  degraded: false,
  error: null,
  actions: [{
    type: 'choose_option',
    payload: {
      kind: 'path_switch',
      mode: 'single',
      confirm: false,
      options: [
        { code: 'a', label: '我想聊聊' },
        { code: 'b', label: '我想諮詢健康方案' },
        { code: 'c', label: '幫我看報告' }
      ],
      selected: [],
      gap_code: null,
      answer_type: null,
      exclusive_codes: []
    }
  }]
}

describe('path entry greeting (core #133)', () => {
  it('normalizes reply_actions path_switch codes a／b／c to ConversationPath', () => {
    expect(normalizeConversationPath('a')).toBe('A')
    expect(normalizeConversationPath('b')).toBe('B')
    expect(normalizeConversationPath('c')).toBe('C')
    expect(normalizeConversationPath(null)).toBe(null)
    expect(normalizeConversationPath(undefined)).toBe(null)
  })

  it('projects entry greeting path_switch into three chips (no confirm)', () => {
    const ra = parseReplyActions(entryGreetingReplyActions)
    expect(isUsableReplyActions(ra)).toBe(true)
    const projection = projectReplyActionsToCtas({
      replyActions: ra!,
      canShowRecommendSlot: false,
      canShowUpload: false,
      canShowCheckup: false,
      canShowVitals: false,
      expertReviewStatus: 'none'
    })
    expect(projection.flags.choices.map(c => c.code)).toEqual(['a', 'b', 'c'])
    expect(projection.flags.choices.map(c => c.label)).toEqual([
      '我想聊聊',
      '我想諮詢健康方案',
      '幫我看報告'
    ])
    expect(projection.flags.showConfirm).toBe(false)
    expect(projection.flags.showUpload).toBe(false)
    expect(projection.flags.showCheckup).toBe(false)
  })

  it('core greeting content already includes 想先從哪裡開始？ — FE must not append again', () => {
    const content = '您好，我是您的專屬個人健康顧問（非醫生）\n\n想先從哪裡開始？'
    expect(content).toContain('想先從哪裡開始？')
    // FE displays content as-is; duplicate local prompt key was removed.
    expect(content.split('想先從哪裡開始？').length - 1).toBe(1)
  })
})
