import { describe, expect, it } from 'vitest'
import type { ChatMessage } from '../../app/utils/first-order'
import {
  buildTurnActionsVisibility,
  checkupCtaVisible,
  type ChatTurnUiContext,
  DEFAULT_CONSULTATION_GOAL_OPTIONS,
  recommendCtaVisible,
  reportDockBarVisibility,
  resolveEffectiveGoalOptions,
  turnConfirmVisible,
  wantMoreTestsCtaVisible
} from '../../app/utils/chat-turn-actions'
import { findIntakeAssistantMessage } from '../../app/utils/chat-intake'

const goals = [
  { code: 'sleep', label: '睡眠' },
  { code: 'weight', label: '減重' }
]

function assistant(id: string, extra: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id,
    role: 'assistant',
    parts: [{ type: 'text', text: 'reply' }],
    ...extra
  }
}

function baseCtx(overrides: Partial<ChatTurnUiContext> = {}): ChatTurnUiContext {
  return {
    readonlyMode: false,
    escalated: false,
    pending: false,
    goalSelectActive: false,
    reportAskActive: false,
    hasReportAnalysis: false,
    reportRetry: false,
    checkupLinkReady: true,
    lastAssistantId: 'latest',
    ...overrides
  }
}

function visibility(
  message: ChatMessage,
  ctx: ChatTurnUiContext,
  extra: {
    goalOptions?: typeof goals
    goalSelectActive?: boolean
    needsMultiConfirm?: boolean
    messages?: ChatMessage[]
    expertReviewStatus?: 'none' | 'awaiting_review' | 'reviewed'
    flow?: 'standard'
  } = {}
) {
  const goalSelectActive = extra.goalSelectActive ?? ctx.goalSelectActive
  const list = extra.messages ?? [message]
  const intake = findIntakeAssistantMessage(list, {
    goalSelectActive,
    lastAssistantId: ctx.lastAssistantId
  })
  return buildTurnActionsVisibility({
    message,
    ctx: { ...ctx, goalSelectActive },
    intake,
    goalOptions: extra.goalOptions ?? goals,
    needsMultiConfirm: extra.needsMultiConfirm ?? goalSelectActive,
    expertReviewStatus: extra.expertReviewStatus,
    flow: extra.flow
  })
}

describe('recommendCtaVisible', () => {
  const base = {
    readonlyMode: false,
    escalated: false,
    goalSelectActive: false,
    reportAskActive: false,
    profileQuestionActive: false,
    isLatestAssistant: true,
    reportRetry: false
  }

  it('blocks while goals or report ask still active (三要件未齊)', () => {
    expect(recommendCtaVisible({ ...base, goalSelectActive: true })).toBe(false)
    expect(recommendCtaVisible({ ...base, reportAskActive: true })).toBe(false)
    expect(
      recommendCtaVisible({
        ...base,
        goalSelectActive: true,
        hasReportAnalysis: true
      })
    ).toBe(false)
  })

  it('blocks on non-latest, pending, profile question, retry', () => {
    expect(recommendCtaVisible({ ...base, isLatestAssistant: false })).toBe(false)
    expect(recommendCtaVisible({ ...base, pending: true })).toBe(false)
    expect(recommendCtaVisible({ ...base, profileQuestionActive: true })).toBe(false)
    expect(recommendCtaVisible({ ...base, reportRetry: true })).toBe(false)
  })
})

describe('buildTurnActionsVisibility — journey matrix', () => {
  it('opening goal select: chips on intake only, no recommend', () => {
    const greeting = assistant('greeting', { options: goals })
    const ctx = baseCtx({ goalSelectActive: true, lastAssistantId: 'greeting' })
    const onGreeting = visibility(greeting, ctx, {
      goalSelectActive: true,
      messages: [greeting]
    })
    expect(onGreeting.choices.map(o => o.code)).toEqual(['sleep', 'weight'])
    expect(onGreeting.showConfirm).toBe(true)
    expect(onGreeting.showRecommend).toBe(false)
    expect(onGreeting.showWantMoreTests).toBe(false)
  })

  it('post-interpret goal select: chips only; no invented recommend without usable RA', () => {
    const greeting = assistant('greeting', { options: goals })
    const interpret = assistant('latest', {
      options: goals,
      wantMoreTestsOffer: true
    })
    const ctx = baseCtx({
      goalSelectActive: true,
      hasReportAnalysis: true,
      lastAssistantId: 'latest'
    })
    const onLatest = visibility(interpret, ctx, {
      goalSelectActive: true,
      messages: [greeting, interpret],
      expertReviewStatus: 'none'
    })
    expect(onLatest.choices.length).toBe(2)
    expect(onLatest.showConfirm).toBe(true)
    // 完成 CTA 依 usable RA；無 RA 不硬掛提交專家判讀
    expect(onLatest.showSubmitReview).toBe(false)
    expect(onLatest.showViewRecommend).toBe(false)
    expect(onLatest.showRecommend).toBe(false)
    expect(onLatest.showWantMoreTests).toBe(false)
    const onGreeting = visibility(greeting, ctx, {
      goalSelectActive: true,
      messages: [greeting, interpret]
    })
    expect(onGreeting.choices).toEqual([])
    expect(onGreeting.showRecommend).toBe(false)
  })

  it('usable offer_recommend after 三要件: submit vs view by expert status', () => {
    const interpret = assistant('latest', {
      replyActions: {
        schema_version: '0.1',
        source: 'semantic_judgment',
        adaptor: 'llm',
        degraded: false,
        error: null,
        actions: [{ type: 'offer_recommend' }]
      }
    })
    const ctx = baseCtx({
      hasReportAnalysis: true,
      lastAssistantId: 'latest'
    })
    const submit = visibility(interpret, ctx, {
      messages: [interpret],
      expertReviewStatus: 'none'
    })
    expect(submit.showSubmitReview).toBe(true)
    expect(submit.showViewRecommend).toBe(false)

    const viewed = visibility(interpret, ctx, {
      messages: [interpret],
      expertReviewStatus: 'reviewed'
    })
    expect(viewed.showSubmitReview).toBe(false)
    expect(viewed.showViewRecommend).toBe(true)
  })

  it('standard flow: usable offer_recommend → view recommend, never submit', () => {
    const interpret = assistant('latest', {
      replyActions: {
        schema_version: '0.1',
        source: 'semantic_judgment',
        adaptor: 'llm',
        degraded: false,
        error: null,
        actions: [{ type: 'offer_recommend' }]
      }
    })
    const ctx = baseCtx({ hasReportAnalysis: true, lastAssistantId: 'latest' })
    for (const expertReviewStatus of ['none', 'awaiting_review', 'reviewed'] as const) {
      const onLatest = visibility(interpret, ctx, {
        messages: [interpret],
        expertReviewStatus,
        flow: 'standard'
      })
      expect(onLatest.showSubmitReview).toBe(false)
      expect(onLatest.showViewRecommend).toBe(true)
      expect(onLatest.showRecommend).toBe(true)
    }
  })

  it('awaiting_review hides both recommend CTAs even with usable offer_recommend', () => {
    const interpret = assistant('latest', {
      replyActions: {
        schema_version: '0.1',
        source: 'semantic_judgment',
        adaptor: 'llm',
        degraded: false,
        error: null,
        actions: [{ type: 'offer_recommend' }]
      }
    })
    const ctx = baseCtx({ hasReportAnalysis: true, lastAssistantId: 'latest' })
    const onLatest = visibility(interpret, ctx, {
      messages: [interpret],
      expertReviewStatus: 'awaiting_review'
    })
    expect(onLatest.showSubmitReview).toBe(false)
    expect(onLatest.showViewRecommend).toBe(false)
    expect(onLatest.showRecommend).toBe(false)
  })

  it('legacy wantMoreTestsOffer never paints bubble want-more (RA-only)', () => {
    const interpret = assistant('old', { wantMoreTestsOffer: true })
    const followUp = assistant('latest', { wantMoreTestsOffer: true })
    const ctx = baseCtx({ hasReportAnalysis: true, lastAssistantId: 'latest' })
    const stale = visibility(interpret, ctx, { messages: [interpret, followUp] })
    expect(stale.showWantMoreTests).toBe(false)
    expect(stale.showRecommend).toBe(false)
    expect(wantMoreTestsCtaVisible(ctx, interpret)).toBe(false)
    expect(wantMoreTestsCtaVisible(ctx, followUp)).toBe(false)
    expect(visibility(followUp, ctx, { messages: [interpret, followUp] }).showWantMoreTests).toBe(false)
  })

  it('profile quiz on latest: options chips, no recommend', () => {
    const quiz = assistant('latest', {
      turnType: 'profile',
      profileQuestion: { gap_code: 'diet', answer_type: 'enum' },
      options: [{ code: 'a', label: 'A' }]
    })
    const ctx = baseCtx({ lastAssistantId: 'latest' })
    const v = visibility(quiz, ctx, {
      messages: [quiz],
      needsMultiConfirm: false
    })
    expect(v.choices).toHaveLength(1)
    expect(v.showRecommend).toBe(false)
    expect(v.showUpload).toBe(false)
  })

  it('legacy uploadOffer never paints bubble upload (ask_report only)', () => {
    const msg = assistant('latest', { uploadOffer: true })
    const ctx = baseCtx({ lastAssistantId: 'latest' })
    expect(visibility(msg, ctx, { messages: [msg] }).showUpload).toBe(false)
    const withRa = assistant('latest', {
      replyActions: {
        schema_version: '0.1',
        source: 'semantic_judgment',
        adaptor: 'llm',
        degraded: false,
        error: null,
        actions: [{ type: 'ask_report' }]
      }
    })
    expect(visibility(withRa, ctx, { messages: [withRa] }).showUpload).toBe(true)
  })

  it('legacy checkupOffer never paints bubble checkup (RA-only #18)', () => {
    const old = assistant('old', { checkupOffer: true })
    const latest = assistant('latest', { checkupOffer: true })
    const ctx = baseCtx({ lastAssistantId: 'latest' })
    expect(visibility(old, ctx, { messages: [old, latest] }).showCheckup).toBe(false)
    expect(visibility(latest, ctx, { messages: [old, latest] }).showCheckup).toBe(false)
    expect(checkupCtaVisible(ctx, old)).toBe(false)
  })

  it('usable reply_actions offer_checkup still paints bubble checkup', () => {
    const msg = assistant('latest', {
      replyActions: {
        schema_version: '0.1',
        source: 'semantic_judgment',
        adaptor: 'llm',
        degraded: false,
        error: null,
        actions: [{ type: 'offer_checkup', payload: { url: 'https://example.com/check' } }]
      }
    })
    const ctx = baseCtx({ lastAssistantId: 'latest' })
    const v = visibility(msg, ctx, { messages: [msg] })
    expect(v.fromReplyActions).toBe(true)
    expect(v.showCheckup).toBe(true)
    expect(v.checkupUrlOverride).toBe('https://example.com/check')
  })

  it('pending hides recommend on latest even with usable offer_recommend', () => {
    const msg = assistant('latest', {
      replyActions: {
        schema_version: '0.1',
        source: 'semantic_judgment',
        adaptor: 'llm',
        degraded: false,
        error: null,
        actions: [{ type: 'offer_recommend' }]
      }
    })
    const ctx = baseCtx({ pending: true, lastAssistantId: 'latest' })
    expect(visibility(msg, ctx, { messages: [msg] }).showRecommend).toBe(false)
  })

  it('empty goalOptions falls back to defaults; no confirm without chips', () => {
    const latest = assistant('latest')
    const ctx = baseCtx({ goalSelectActive: true, lastAssistantId: 'latest' })
    const withFallback = visibility(latest, ctx, {
      goalSelectActive: true,
      goalOptions: [],
      messages: [latest]
    })
    expect(withFallback.choices.length).toBe(DEFAULT_CONSULTATION_GOAL_OPTIONS.length)
    expect(withFallback.showConfirm).toBe(true)

    expect(
      resolveEffectiveGoalOptions({
        goalSelectActive: true,
        goalOptions: [],
        intake: assistant('x', { options: [] })
      })
    ).toEqual(DEFAULT_CONSULTATION_GOAL_OPTIONS)

    expect(turnConfirmVisible(0, true)).toBe(false)
  })

  it('without usable RA, missing checkup url does not invent recommend', () => {
    const msg = assistant('latest')
    const ctx = baseCtx({
      checkupLinkReady: false,
      hasReportAnalysis: true,
      lastAssistantId: 'latest'
    })
    const v = visibility(msg, ctx, { messages: [msg] })
    expect(v.showRecommend).toBe(false)
    expect(v.showWantMoreTests).toBe(false)
    expect(v.showCheckup).toBe(false)
  })
})

describe('reportDockBarVisibility', () => {
  it('keeps explain highlights visible on result dock; disables when blocked', () => {
    const ctx = baseCtx({ hasReportAnalysis: true })
    expect(
      reportDockBarVisibility({
        ctx,
        profileQuestionActive: false,
        reportInterpretSent: false,
        promptMode: false
      })
    ).toEqual({
      showExplainHighlights: true,
      explainHighlightsDisabled: false,
      showWantMoreTestsLink: true
    })
    // Irice 2026-10-28：點過後仍常駐（不因 reportInterpretSent 隱藏）
    expect(
      reportDockBarVisibility({
        ctx,
        profileQuestionActive: false,
        reportInterpretSent: true,
        promptMode: false
      }).showExplainHighlights
    ).toBe(true)
    expect(
      reportDockBarVisibility({
        ctx,
        profileQuestionActive: false,
        reportInterpretSent: true,
        promptMode: false
      }).explainHighlightsDisabled
    ).toBe(false)
    // pending／readonly 等：可見但 disabled
    expect(
      reportDockBarVisibility({
        ctx: { ...ctx, pending: true },
        profileQuestionActive: false,
        reportInterpretSent: false,
        promptMode: false
      })
    ).toMatchObject({
      showExplainHighlights: true,
      explainHighlightsDisabled: true
    })
    expect(
      reportDockBarVisibility({
        ctx,
        profileQuestionActive: true,
        reportInterpretSent: false,
        promptMode: false
      })
    ).toMatchObject({
      showExplainHighlights: true,
      explainHighlightsDisabled: true
    })
    expect(
      reportDockBarVisibility({
        ctx: { ...ctx, readonlyMode: true },
        profileQuestionActive: false,
        reportInterpretSent: false,
        promptMode: false
      })
    ).toMatchObject({
      showExplainHighlights: true,
      explainHighlightsDisabled: true
    })
  })

  it('hides explain highlights on empty prompt dock', () => {
    const ctx = baseCtx({ hasReportAnalysis: false })
    expect(
      reportDockBarVisibility({
        ctx,
        profileQuestionActive: false,
        reportInterpretSent: false,
        promptMode: true
      })
    ).toEqual({
      showExplainHighlights: false,
      explainHighlightsDisabled: false,
      showWantMoreTestsLink: false
    })
  })

  it('want-more on dock requires checkup url', () => {
    const ctx = baseCtx({ hasReportAnalysis: true, checkupLinkReady: false })
    expect(
      reportDockBarVisibility({
        ctx,
        profileQuestionActive: false,
        reportInterpretSent: false,
        promptMode: false
      }).showWantMoreTestsLink
    ).toBe(false)
    expect(
      reportDockBarVisibility({
        ctx: { ...ctx, checkupLinkReady: true },
        profileQuestionActive: false,
        reportInterpretSent: false,
        promptMode: false
      }).showWantMoreTestsLink
    ).toBe(true)
  })
})
