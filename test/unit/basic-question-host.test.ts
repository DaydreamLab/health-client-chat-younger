import { describe, expect, it } from 'vitest'
import {
  basicQuestionFollowsUserTurn,
  decideBasicQuestionHost,
  peelAppendedPrompt,
  shouldWriteBankPromptToHost
} from '../../app/utils/basic-question-host'

const uploadInvite = '好的，請上傳近期健檢／血檢報告；若暫時不傳，也可以改走諮詢方案。'
const heightPrompt = '請問您的身高（公分）？'
const modelHeightAsk = '方便告訴我身高大概幾公分嗎？'

describe('basicQuestionFollowsUserTurn', () => {
  it('true after a direct upload user turn', () => {
    expect(basicQuestionFollowsUserTurn('user')).toBe(true)
  })

  it('false while the assistant bubble is still the latest', () => {
    expect(basicQuestionFollowsUserTurn('assistant')).toBe(false)
    expect(basicQuestionFollowsUserTurn(undefined)).toBe(false)
  })
})

describe('peelAppendedPrompt', () => {
  it('splits a height question spliced onto the upload invite', () => {
    const existing = `${uploadInvite}\n\n${heightPrompt}`
    expect(peelAppendedPrompt(existing, heightPrompt)).toBe(uploadInvite)
  })

  it('leaves a standalone height question in place', () => {
    expect(peelAppendedPrompt(heightPrompt, heightPrompt)).toBeNull()
  })

  it('leaves copy that does not contain the prompt', () => {
    expect(peelAppendedPrompt(uploadInvite, heightPrompt)).toBeNull()
  })
})

describe('decideBasicQuestionHost — decision-driven (gap_code)', () => {
  it('after user turn opens a new empty bubble (no bank stem)', () => {
    expect(decideBasicQuestionHost({
      lastMessageRole: 'user',
      lastAssistantText: `${uploadInvite}\n\n${heightPrompt}`,
      lastAssistantGapCode: 'height',
      lastAssistantHasRequiredBasicAsk: true,
      nextGapCode: 'height',
      nextPrompt: heightPrompt,
      decisionDriven: true
    })).toEqual({ kind: 'append', text: '' })
  })

  it('reuses last assistant when same gap_code already hosts the ask', () => {
    expect(decideBasicQuestionHost({
      lastMessageRole: 'assistant',
      lastAssistantText: modelHeightAsk,
      lastAssistantGapCode: 'height',
      lastAssistantHasRequiredBasicAsk: true,
      nextGapCode: 'height',
      nextPrompt: heightPrompt,
      decisionDriven: true
    })).toEqual({ kind: 'reuse' })
  })

  it('reuses model prose bubble even when bank prompt text differs', () => {
    expect(decideBasicQuestionHost({
      lastMessageRole: 'assistant',
      lastAssistantText: modelHeightAsk,
      lastAssistantGapCode: null,
      lastAssistantHasRequiredBasicAsk: false,
      nextGapCode: 'height',
      nextPrompt: heightPrompt,
      decisionDriven: true
    })).toEqual({ kind: 'reuse' })
  })

  it('does not peel by prompt text when decision-driven', () => {
    const decision = decideBasicQuestionHost({
      lastMessageRole: 'user',
      lastAssistantText: `${uploadInvite}\n\n${heightPrompt}`,
      lastAssistantGapCode: null,
      lastAssistantHasRequiredBasicAsk: false,
      nextGapCode: 'height',
      nextPrompt: heightPrompt,
      decisionDriven: true
    })
    expect(decision.kind).toBe('append')
    expect(decision).not.toMatchObject({ kind: 'peel_then_append' })
  })
})

describe('decideBasicQuestionHost — legacy prompt text', () => {
  it('peels bank prompt after user turn then appends', () => {
    expect(decideBasicQuestionHost({
      lastMessageRole: 'user',
      lastAssistantText: `${uploadInvite}\n\n${heightPrompt}`,
      lastAssistantGapCode: null,
      lastAssistantHasRequiredBasicAsk: false,
      nextGapCode: null,
      nextPrompt: heightPrompt,
      decisionDriven: false
    })).toEqual({
      kind: 'peel_then_append',
      peeledText: uploadInvite,
      appendText: heightPrompt
    })
  })

  it('reuses when existing text equals prompt', () => {
    expect(decideBasicQuestionHost({
      lastMessageRole: 'assistant',
      lastAssistantText: heightPrompt,
      lastAssistantGapCode: null,
      lastAssistantHasRequiredBasicAsk: true,
      nextGapCode: null,
      nextPrompt: heightPrompt,
      decisionDriven: false
    })).toEqual({ kind: 'reuse' })
  })

  it('appends when prompt is absent from host', () => {
    expect(decideBasicQuestionHost({
      lastMessageRole: 'assistant',
      lastAssistantText: uploadInvite,
      lastAssistantGapCode: null,
      lastAssistantHasRequiredBasicAsk: false,
      nextGapCode: null,
      nextPrompt: heightPrompt,
      decisionDriven: false
    })).toEqual({ kind: 'append', text: heightPrompt })
  })
})

describe('shouldWriteBankPromptToHost', () => {
  it('never writes bank stem when decision-driven', () => {
    expect(shouldWriteBankPromptToHost({
      decisionDriven: true,
      existingText: modelHeightAsk,
      prompt: heightPrompt
    })).toBe(false)
    expect(shouldWriteBankPromptToHost({
      decisionDriven: true,
      existingText: '',
      prompt: heightPrompt
    })).toBe(false)
  })

  it('legacy appends when stem missing', () => {
    expect(shouldWriteBankPromptToHost({
      decisionDriven: false,
      existingText: uploadInvite,
      prompt: heightPrompt
    })).toBe(true)
  })

  it('legacy skips when stem already present', () => {
    expect(shouldWriteBankPromptToHost({
      decisionDriven: false,
      existingText: heightPrompt,
      prompt: heightPrompt
    })).toBe(false)
  })
})
