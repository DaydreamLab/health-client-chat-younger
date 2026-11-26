import type { Page } from '@playwright/test'

const conversationId = 'v2cccccccc-cccc-cccc-cccc-cccccccccccc'

export type AgentV2MockMode
  = 'gathering'
    | 'ready'
    | 'collecting_actions'
    | 'goals'
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

/**
 * Mock `/api/v2/conversations*` only. Does not call a real model.
 * `ready` = three requirements done + offer_recommend action.
 * `gathering` = missing all three, no CTAs.
 * `collecting_actions` = collecting with ask_vitals／ask_report／ask_goal／confirm_report_date.
 * `fail_once` = first POST messages returns 500; subsequent succeed (LY5 retry).
 */
export async function mockAgentV2Api(
  page: Page,
  mode: AgentV2MockMode = 'ready'
) {
  const missing = mode === 'ready' || mode === 'fail_once' || mode === 'citations'
    ? []
    : mode === 'goals'
      ? ['goals']
      : ['profile', 'report', 'goals']
  const state = mode === 'ready' || mode === 'fail_once' || mode === 'citations'
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
          : []

  const greeting = mode === 'ready' || mode === 'fail_once'
    ? '三要件都齊了。可以取得專屬保健品方案。'
    : mode === 'citations'
      ? '這是帶引用與專家入口的回覆。'
      : mode === 'collecting_actions'
        ? '請補齊基本資料與報告。也可先確認報告日期。'
        : mode === 'goals'
          ? '請選擇健康目標。'
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

    // POST …/messages
    const messagesMatch = path.match(/\/api\/v2\/conversations\/([^/]+)\/messages\/?$/)
    if (method === 'POST' && messagesMatch) {
      if (messagesFailRemaining > 0) {
        messagesFailRemaining -= 1
        await fail(500, 'upstream_error', 'mock fail once')
        return
      }
      const body = request.postDataJSON() as { text?: string }
      const text = String(body?.text ?? '').trim() || '（空白）'
      const replyText = mode === 'ready' || mode === 'fail_once'
        ? '已收到。三要件齊全，可取得方案。'
        : mode === 'citations'
          ? '已收到。請參考下方資料。'
          : mode === 'collecting_actions'
            ? '已收到。請用下方按鈕補資料或確認日期。'
            : mode === 'goals'
              ? '已收到。請選擇目標後確認。'
              : '已收到，請繼續補齊三要件。'
      messages = [
        ...messages,
        { id: `m-user-${messages.length}`, role: 'user', text },
        {
          id: `m-asst-${messages.length + 1}`,
          role: 'assistant',
          text: replyText,
          ...(actions.length > 0 ? { actions } : {})
        }
      ]
      lastActions = actions
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
