import { describe, expect, it } from 'vitest'
import { demoAssistantReply } from '../../app/utils/chat-demo'

describe('demoAssistantReply', () => {
  it('explains plans in Traditional Chinese', () => {
    expect(demoAssistantReply({ question: '三個方案差在哪？', locale: 'zh-TW' })).toContain('一般適合')
  })

  it('routes a no-report question to collection guidance', () => {
    expect(demoAssistantReply({ question: 'I don\'t have a report yet', locale: 'en' })).toContain('Mid arranges collection')
  })
})
