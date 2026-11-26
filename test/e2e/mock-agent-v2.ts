import type { Page } from '@playwright/test'

const conversationId = 'v2cccccccc-cccc-cccc-cccc-cccccccccccc'

export type AgentV2MockMode
  = 'gathering'
    | 'ready'
    | 'collecting_actions'
    | 'goals'
    | 'sex'
    | 'fail_once'
    | 'citations'

type MockAction = {
  key: string
  label: string
  payload?: Record<string, unknown>
}

type MockMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  actions?: MockAction[]
}

type MockCtaAnswer = {
  action_key?: string
  gap_code?: string
  value?: unknown
}

/**
 * Real core sex CTA shape (not kind:'profile'):
 * kind:"sex", gaps:["sex"], gap_code, action_key + zh option labels.
 */
const sexActions: MockAction[] = [
  {
    key: 'choose_option',
    label: '生理性別',
    payload: {
      kind: 'sex',
      gaps: ['sex'],
      gap_code: 'sex',
      action_key: 'choose_option',
      mode: 'single',
      confirm: false,
      options: [
        { code: 'male', label: '生理男' },
        { code: 'female', label: '生理女' }
      ]
    }
  }
]

/**
 * Mock `/api/v2/conversations*` only. Does not call a real model.
 * `ready` = three requirements done + offer_recommend action.
 * `gathering` = missing all three, no CTAs.
 * `collecting_actions` = collecting with ask_vitals／ask_report／confirm_report_date.
 * `goals` = ask_goals; CTA answers advance to sex → vitals (cta_answer path).
 * `sex` = real-shape sex choose_option first (kind:"sex"); answers → vitals.
 * `fail_once` = first POST messages returns 500; subsequent succeed (LY5 retry).
 */
export async function mockAgentV2Api(
  page: Page,
  mode: AgentV2MockMode = 'ready'
) {
  let missing = mode === 'ready' || mode === 'fail_once' || mode === 'citations'
    ? [] as string[]
    : mode === 'goals'
      ? ['goals']
      : mode === 'sex'
        ? ['profile']
        : ['profile', 'report', 'goals']
  let state = mode === 'ready' || mode === 'fail_once' || mode === 'citations'
    ? 'cta_offered'
    : 'collecting'

  // One turn: vitals + upload + date confirm.
  // ask_goal alone would set goalSelectActive and hide upload (same as v1 gate);
  // goals projection is covered in unit tests + a dedicated e2e below.
  const collectingActions: MockAction[] = [
    {
      key: 'ask_vitals',
      label: '基本身體資料',
      payload: { fields: ['age', 'height', 'weight'] }
    },
    { key: 'ask_report', label: '上傳健康報告' },
    { key: 'confirm_report_date', label: '確認報告日期無誤' }
  ]

  // Mirrors candor-core GreetingComposer ask_goals payload (ConsultationGoal catalog).
  const goalsOnlyActions: MockAction[] = [
    {
      key: 'ask_goals',
      label: '選擇健康目標',
      payload: {
        kind: 'consultation_goals',
        gaps: ['goals'],
        gap_code: 'goals',
        action_key: 'ask_goals',
        min: 1,
        options: [
          { code: 'sleep', label: '睡眠' },
          { code: 'weight_loss', label: '減重' },
          { code: 'immune_boost', label: '免疫提升' },
          { code: 'cognitive_function', label: '認知功能' },
          { code: 'gastrointestinal', label: '腸胃道' }
        ]
      }
    }
  ]

  const vitalsAgeOnly: MockAction[] = [
    {
      key: 'ask_vitals',
      label: '基本身體資料',
      payload: {
        fields: ['age'],
        gaps: ['age'],
        gap_code: 'age',
        action_key: 'ask_vitals'
      }
    }
  ]

  const actions: MockAction[] = mode === 'ready' || mode === 'fail_once'
    ? [{ key: 'offer_recommend', label: '取得專屬保健品方案' }]
    : mode === 'citations'
      ? [
          { key: 'offer_recommend', label: '取得專屬保健品方案' },
          {
            key: 'show_citations',
            label: '參考資料',
            payload: {
              hits: [
                {
                  excerpt: '維生素 D 與骨密度相關',
                  source_url: 'https://example.com/vit-d'
                }
              ]
            }
          },
          { key: 'offer_expert_booking', label: '預約專家諮詢' }
        ]
      : mode === 'collecting_actions'
        ? collectingActions
        : mode === 'goals'
          ? goalsOnlyActions
          : mode === 'sex'
            ? sexActions
            : []

  const greeting = mode === 'ready' || mode === 'fail_once'
    ? '三要件都齊了。可以取得專屬保健品方案。'
    : mode === 'citations'
      ? '這是帶引用與專家入口的回覆。'
      : mode === 'collecting_actions'
        ? '請補齊基本資料與報告。也可先確認報告日期。'
        : mode === 'goals'
          ? '請選擇健康目標。'
          : mode === 'sex'
            ? '請問生理性別？'
            : '先從基本資料、報告與目標開始。'

  let messages: MockMessage[] = [
    {
      id: 'm-asst-1',
      role: 'assistant',
      text: greeting,
      ...(actions.length > 0 ? { actions } : {})
    }
  ]
  let lastActions = actions
  let messagesFailRemaining = mode === 'fail_once' ? 1 : 0

  function nextAfterCta(cta: MockCtaAnswer | undefined): {
    replyText: string
    nextActions: MockAction[]
  } {
    const actionKey = String(cta?.action_key ?? '')
    const gapCode = String(cta?.gap_code ?? '')

    if (actionKey === 'ask_goals' || gapCode === 'goals') {
      missing = missing.filter(item => item !== 'goals')
      return {
        replyText: '已記下目標。請問生理性別？',
        nextActions: sexActions
      }
    }

    if (actionKey === 'choose_option' || gapCode === 'sex') {
      missing = missing.includes('profile') ? missing : [...missing, 'profile']
      return {
        replyText: '已記下性別。請填年齡。',
        nextActions: vitalsAgeOnly
      }
    }

    if (actionKey === 'ask_vitals' || ['age', 'height', 'weight'].includes(gapCode)) {
      if (gapCode === 'age') {
        return {
          replyText: '已記下年齡。請填身高。',
          nextActions: [{
            key: 'ask_vitals',
            label: '基本身體資料',
            payload: {
              fields: ['height'],
              gaps: ['height'],
              gap_code: 'height',
              action_key: 'ask_vitals'
            }
          }]
        }
      }
      if (gapCode === 'height') {
        return {
          replyText: '已記下身高。請填體重。',
          nextActions: [{
            key: 'ask_vitals',
            label: '基本身體資料',
            payload: {
              fields: ['weight'],
              gaps: ['weight'],
              gap_code: 'weight',
              action_key: 'ask_vitals'
            }
          }]
        }
      }
      missing = missing.filter(item => item !== 'profile')
      return {
        replyText: '基本資料已齊。可上傳報告或確認日期。',
        nextActions: collectingActions.filter(action => action.key !== 'ask_vitals')
      }
    }

    // Free text / unknown: keep current pending CTAs for the mode.
    if (mode === 'ready' || mode === 'fail_once') {
      return {
        replyText: '已收到。三要件齊全，可取得方案。',
        nextActions: lastActions
      }
    }
    if (mode === 'citations') {
      return {
        replyText: '已收到。請參考下方資料。',
        nextActions: lastActions
      }
    }
    if (mode === 'collecting_actions') {
      return {
        replyText: '已收到。請用下方按鈕補資料或確認日期。',
        nextActions: lastActions.length > 0 ? lastActions : collectingActions
      }
    }
    if (mode === 'goals') {
      return {
        replyText: '已收到。請選擇目標後確認。',
        nextActions: lastActions.length > 0 ? lastActions : goalsOnlyActions
      }
    }
    if (mode === 'sex') {
      return {
        replyText: '已收到。請問生理性別？',
        nextActions: lastActions.length > 0 ? lastActions : sexActions
      }
    }
    return {
      replyText: '已收到，請繼續補齊三要件。',
      nextActions: lastActions
    }
  }

  await page.route('**/api/v2/conversations**', async (route) => {
    const request = route.request()
    const method = request.method()
    const url = new URL(request.url())
    const path = url.pathname

    const ok = (data: unknown) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data })
    })

    const fail = (status: number, errorCode: string, message: string) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'failed',
          error_code: errorCode,
          error_message: message
        })
      })

    // POST /api/v2/conversations — LY5 greeting + actions on create
    if (method === 'POST' && /\/api\/v2\/conversations\/?$/.test(path)) {
      await ok({
        conversation: {
          id: conversationId,
          state,
          missing
        },
        messages,
        actions: lastActions
      })
      return
    }

    // POST …/messages (plain text or content + cta_answer)
    const messagesMatch = path.match(/\/api\/v2\/conversations\/([^/]+)\/messages\/?$/)
    if (method === 'POST' && messagesMatch) {
      if (messagesFailRemaining > 0) {
        messagesFailRemaining -= 1
        await fail(500, 'upstream_error', 'mock fail once')
        return
      }
      const body = request.postDataJSON() as {
        text?: string
        content?: string
        cta_answer?: MockCtaAnswer
      }
      const text = String(body?.content ?? body?.text ?? '').trim() || '（空白）'
      const { replyText, nextActions } = nextAfterCta(body?.cta_answer)
      lastActions = nextActions
      if (nextActions.some(action => action.key === 'offer_recommend')
        && missing.length === 0) {
        state = 'cta_offered'
      }
      messages = [
        ...messages,
        { id: `m-user-${messages.length}`, role: 'user', text },
        {
          id: `m-asst-${messages.length + 1}`,
          role: 'assistant',
          text: replyText,
          ...(nextActions.length > 0 ? { actions: nextActions } : {})
        }
      ]
      await ok({
        conversation_id: conversationId,
        state,
        missing,
        reply: { text: replyText },
        actions: lastActions
      })
      return
    }

    // POST …/actions
    const actionsMatch = path.match(/\/api\/v2\/conversations\/([^/]+)\/actions\/?$/)
    if (method === 'POST' && actionsMatch) {
      const body = request.postDataJSON() as { key?: string }
      const key = String(body?.key ?? '')
      const label = key === 'offer_recommend'
        ? '取得專屬保健品方案'
        : key === 'confirm_report_date'
          ? '已確認報告日期'
          : key
      const replyText = key === 'confirm_report_date'
        ? '謝謝，報告日期已記下（僅 v2 meta，未改 health_reports）。'
        : key === 'explain_highlights'
          ? '以下是報告重點說明（mock classify／interpret）。'
          : `已選擇：${label}`
      messages = [
        ...messages,
        {
          id: `m-asst-action-${messages.length}`,
          role: 'assistant',
          text: replyText,
          ...(key === 'explain_highlights' && mode === 'citations'
            ? { actions }
            : {})
        }
      ]
      // After confirm_report_date, drop that CTA; keep collecting actions otherwise.
      if (key === 'confirm_report_date') {
        lastActions = collectingActions.filter(action => action.key !== 'confirm_report_date')
      } else if (key === 'offer_recommend') {
        lastActions = [{ key: 'offer_recommend', label: '取得專屬保健品方案' }]
      } else if (key === 'explain_highlights') {
        lastActions = actions
      }
      await ok({
        conversation_id: conversationId,
        state: key === 'offer_recommend' ? 'recommend_requested' : state,
        missing: key === 'offer_recommend' ? [] : missing,
        reply: { text: replyText },
        actions: lastActions
      })
      return
    }

    // GET /api/v2/conversations/{id} — LY5 hydrate with per-message／bundle actions
    const getMatch = path.match(/\/api\/v2\/conversations\/([^/]+)\/?$/)
    if (method === 'GET' && getMatch) {
      await ok({
        conversation: {
          id: conversationId,
          state,
          missing
        },
        messages,
        actions: lastActions
      })
      return
    }

    await route.fallback()
  })
}

export { conversationId as AGENT_V2_MOCK_CONVERSATION_ID }
