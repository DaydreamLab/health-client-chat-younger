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

const goalOptions = [
  { code: 'sleep_quality', label: '睡眠品質' },
  { code: 'vitality', label: '精神元氣' },
  { code: 'body_composition', label: '體態管理' },
  { code: 'skin_complexion', label: '皮膚氣色' },
  { code: 'athletic_function', label: '運動機能' },
  { code: 'digestive_function', label: '消化道機能' },
  { code: 'joint_bone', label: '關節骨骼' }
]

export type CandorMockOptions = {
  /** When true, first questions/next returns a quiz item; after one answer, done. */
  profileQuiz?: boolean
  /** Include package on create conversation. */
  withPackage?: boolean
}

/** Mock candor-core auth + chat/report/profile so e2e does not need a live API. */
export async function mockCandorAuth(page: Page, options: CandorMockOptions = {}) {
  let quizAnswered = false
  let goalsSet = false

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
    const postData = route.request().postDataJSON() as { package_code?: string } | null
    const includePackage = options.withPackage || Boolean(postData?.package_code)
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          id: conversationId,
          report_id: null,
          ...(includePackage
            ? {
                package: {
                  code: postData?.package_code || 'care_basic',
                  name_zh: '基礎保養',
                  price: 1280,
                  confirmed: false
                }
              }
            : {}),
          greeting: {
            message_id: 'greet-e2e',
            role: 'assistant',
            content: '您好，我是健康報告解讀助理。請先選擇改善方向。',
            options: goalOptions,
            selected: []
          }
        }
      })
    })
  })

  await page.route(`**/api/v1/conversations/${conversationId}/goals`, async (route) => {
    const body = route.request().postDataJSON() as { goals?: string[], raw_text?: string } | null
    if (body?.raw_text) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            saved: false,
            diverted: true,
            prompt: '基礎保養與完整調理的差異主要在品項數量與月費。請再選擇改善方向。',
            options: goalOptions
          }
        })
      })
      return
    }
    goalsSet = true
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { saved: true, goals: body?.goals || ['vitality'] }
      })
    })
  })

  await page.route(`**/api/v1/conversations/${conversationId}/package/confirm`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          id: conversationId,
          package: {
            code: 'care_basic',
            name_zh: '基礎保養',
            price: 1280,
            confirmed: true
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
          results: [
            {
              id: 'result-e2e-1',
              raw_name: 'Vitamin D3',
              raw_value: '31.8',
              value_numeric: 31.8,
              unit: 'ng/mL',
              ref_low: 50,
              ref_high: 80,
              needs_review: false
            },
            {
              id: 'result-e2e-2',
              raw_name: 'Vitamin B12',
              raw_value: '1275',
              value_numeric: 1275,
              unit: 'pg/mL',
              ref_low: 800,
              ref_high: 1200,
              needs_review: false
            }
          ]
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
    if (options.profileQuiz && goalsSet && !quizAnswered) {
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
            options: [
              { code: 'M', label: '男' },
              { code: 'F', label: '女' }
            ]
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
