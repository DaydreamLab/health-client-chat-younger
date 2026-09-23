import type { Page } from '@playwright/test'

const guestUser = {
  id: '11111111-1111-1111-1111-111111111111',
  role: 'guest' as const,
  email: null,
  display_name: null
}

const memberUser = {
  id: '22222222-2222-2222-2222-222222222222',
  role: 'member' as const,
  email: 'guest@example.com',
  display_name: 'Guest'
}

const conversationId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const reportId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

export type CandorMockOptions = {
  /** When true, first questions/next returns a quiz item; after one answer, done. */
  profileQuiz?: boolean
}

/** Mock candor-core auth + chat/report/profile so e2e does not need a live API. */
export async function mockCandorAuth(page: Page, options: CandorMockOptions = {}) {
  let quizAnswered = false

  await page.route('**/api/v1/auth/guest', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { token: 'e2e-guest-token', expires_in: 3600, user: guestUser }
      })
    })
  })

  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { token: 'e2e-guest-token', expires_in: 3600, user: guestUser }
      })
    })
  })

  await page.route('**/api/v1/users/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { ...guestUser, created_at: '2026-01-01T00:00:00Z' }
      })
    })
  })

  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { token: 'e2e-member-token', expires_in: 3600, user: memberUser }
      })
    })
  })

  await page.route('**/api/v1/auth/register', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { token: 'e2e-member-token', expires_in: 3600, user: memberUser }
      })
    })
  })

  await page.route('**/api/v1/conversations', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          id: conversationId,
          report_id: null,
          greeting: {
            message_id: 'greet-e2e',
            role: 'assistant',
            content: '你好，我是坦見的諮詢助理。',
            options: [{ code: 'energy', label: '體力與精神' }]
          }
        }
      })
    })
  })

  await page.route(`**/api/v1/conversations/${conversationId}`, async (route) => {
    if (route.request().method() !== 'PATCH') {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { id: conversationId, report_id: reportId }
      })
    })
  })

  await page.route(`**/api/v1/conversations/${conversationId}/messages/stream`, async (route) => {
    const body = [
      'event: delta',
      'data: {"text":"依報告來看，基礎保養會是合適起點。"}',
      '',
      'event: done',
      `data: {"message_id":"msg-e2e-1","claim_guard":"passed","content":"依報告來看，基礎保養會是合適起點。"}`,
      '',
      ''
    ].join('\n')
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body
    })
  })

  await page.route('**/api/v1/health-reports', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { id: reportId, status: 'uploaded' }
      })
    })
  })

  await page.route(`**/api/v1/health-reports/${reportId}`, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          id: reportId,
          status: 'ready',
          page_count: 1,
          extraction_confidence: 0.9,
          results: []
        }
      })
    })
  })

  await page.route(`**/api/v1/health-reports/${reportId}/retry`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { id: reportId, status: 'uploaded', queued: true }
      })
    })
  })

  await page.route('**/api/v1/profile/questions/next**', async (route) => {
    if (options.profileQuiz && !quizAnswered) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            done: false,
            gap_code: 'sex',
            prompt: '請問您的生理性別？',
            answer_type: 'enum',
            options: ['F', 'M', 'other']
          }
        })
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { done: true }
      })
    })
  })

  await page.route('**/api/v1/profile/answers', async (route) => {
    quizAnswered = true
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { saved: true, profile_gaps: [] }
      })
    })
  })
}
