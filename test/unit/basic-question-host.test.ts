import { describe, expect, it } from 'vitest'
import {
  basicQuestionFollowsUserTurn,
  peelAppendedPrompt
} from '../../app/utils/basic-question-host'

const uploadInvite = '好的，請上傳近期健檢／血檢報告；若暫時不傳，也可以改走諮詢方案。'
const heightPrompt = '請問您的身高（公分）？'

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
