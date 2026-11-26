import type { Page } from '@playwright/test'

const conversationId = 'v2cccccccc-cccc-cccc-cccc-cccccccccccc'

export type AgentV2MockMode = 'gathering' | 'ready' | 'collecting_actions' | 'goals'

type MockAction = {
  key: string
  label: string
  payload?: Record<string, unknown>
}

/**
 * Mock `/api/v2/conversations*` only. Does not call a real model.
 * `ready` = three requirements done + offer_recommend action.
 * `gathering` = missing all three, no CTAs.
 * `collecting_actions` = collecting with ask_vitals／ask_report／ask_goal／confirm_report_date.
 */
export async function mockAgentV2Api(
  page: Page,
  mode: AgentV2MockMode = 'ready'
) {
  const missing = mode === 'ready'
    ? []
    : mode === 'goals'
      ? ['goals']
      : ['profile', 'report', 'goals']
  const state = mode === 'ready' ? 'cta_offered' : 'collecting'

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

  const goalsOnlyActions: MockAction[] = [
    { key: 'ask_goal', label: '選擇健康目標' }
  ]

  const actions: MockAction[] = mode === 'ready'
    ? [{ key: 'offer_recommend', label: '取得專屬保健品方案' }]
    : mode === 'collecting_actions'
      ? collectingActions
      : mode === 'goals'
        ? goalsOnlyActions
        : []

  const greeting = mode === 'ready'
    ? '三要件都齊了。可以取得專屬保健品方案。'
    : mode === 'collecting_actions'
      ? '請補齊基本資料與報告。也可先確認報告日期。'
      : mode === 'goals'
        ? '請選擇健康目標。'
        : '先從基本資料、報告與目標開始。'

  let messages: Array<{ id: string, role: 'user' | 'assistant', text: string }> = [
    { id: 'm-asst-1', role: 'assistant', text: greeting }
  ]
  let lastActions = actions

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

    // POST /api/v2/conversations
    if (method === 'POST' && /\/api\/v2\/conversations\/?$/.test(path)) {
      await ok({
        conversation: {
          id: conversationId,
          state,
          missing
        }
      })
      return
    }

    // POST …/messages
    const messagesMatch = path.match(/\/api\/v2\/conversations\/([^/]+)\/messages\/?$/)
    if (method === 'POST' && messagesMatch) {
      const body = request.postDataJSON() as { text?: string }
      const text = String(body?.text ?? '').trim() || '（空白）'
      const replyText = mode === 'ready'
        ? '已收到。三要件齊全，可取得方案。'
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
          text: replyText
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
        : `已選擇：${label}`
      messages = [
        ...messages,
        {
          id: `m-asst-action-${messages.length}`,
          role: 'assistant',
          text: replyText
        }
      ]
      // After confirm_report_date, drop that CTA; keep collecting actions otherwise.
      if (key === 'confirm_report_date') {
        lastActions = collectingActions.filter(action => action.key !== 'confirm_report_date')
      } else if (key === 'offer_recommend') {
        lastActions = [{ key: 'offer_recommend', label: '取得專屬保健品方案' }]
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

    // GET /api/v2/conversations/{id}
    const getMatch = path.match(/\/api\/v2\/conversations\/([^/]+)\/?$/)
    if (method === 'GET' && getMatch) {
      await ok({
        conversation: {
          id: conversationId,
          state,
          missing
        },
        messages
      })
      return
    }

    await route.fallback()
  })
}

export { conversationId as AGENT_V2_MOCK_CONVERSATION_ID }
