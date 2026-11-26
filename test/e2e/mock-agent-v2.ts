import type { Page } from '@playwright/test'

const conversationId = 'v2cccccccc-cccc-cccc-cccc-cccccccccccc'

export type AgentV2MockMode = 'gathering' | 'ready'

/**
 * Mock `/api/v2/conversations*` only. Does not call a real model.
 * `ready` = three requirements done + offer_recommend action.
 */
export async function mockAgentV2Api(
  page: Page,
  mode: AgentV2MockMode = 'ready'
) {
  const missing = mode === 'ready' ? [] : ['profile', 'report', 'goals']
  const actions = mode === 'ready'
    ? [{ key: 'offer_recommend', label: '取得專屬保健品方案' }]
    : []
  const greeting = mode === 'ready'
    ? '三要件都齊了。可以取得專屬保健品方案。'
    : '先從基本資料、報告與目標開始。'

  let messages: Array<{ id: string, role: 'user' | 'assistant', text: string }> = [
    { id: 'm-asst-1', role: 'assistant', text: greeting }
  ]

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
          state: mode === 'ready' ? 'ready' : 'gathering',
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
      messages = [
        ...messages,
        { id: `m-user-${messages.length}`, role: 'user', text },
        {
          id: `m-asst-${messages.length + 1}`,
          role: 'assistant',
          text: mode === 'ready'
            ? '已收到。三要件齊全，可取得方案。'
            : '已收到，請繼續補齊三要件。'
        }
      ]
      await ok({
        conversation_id: conversationId,
        state: mode === 'ready' ? 'ready' : 'gathering',
        missing,
        reply: { text: messages[messages.length - 1]!.text },
        actions
      })
      return
    }

    // POST …/actions
    const actionsMatch = path.match(/\/api\/v2\/conversations\/([^/]+)\/actions\/?$/)
    if (method === 'POST' && actionsMatch) {
      const body = request.postDataJSON() as { key?: string }
      const key = String(body?.key ?? '')
      const label = key === 'offer_recommend' ? '取得專屬保健品方案' : key
      messages = [
        ...messages,
        {
          id: `m-asst-action-${messages.length}`,
          role: 'assistant',
          text: `已選擇：${label}`
        }
      ]
      await ok({
        conversation_id: conversationId,
        state: 'ready',
        missing: [],
        reply: { text: messages[messages.length - 1]!.text },
        actions: [{ key: 'offer_recommend', label: '取得專屬保健品方案' }]
      })
      return
    }

    // GET /api/v2/conversations/{id}
    const getMatch = path.match(/\/api\/v2\/conversations\/([^/]+)\/?$/)
    if (method === 'GET' && getMatch) {
      await ok({
        conversation: {
          id: conversationId,
          state: mode === 'ready' ? 'ready' : 'gathering',
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
