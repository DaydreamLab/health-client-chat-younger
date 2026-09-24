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
const sellableVitD = 'dddddddd-dddd-dddd-dddd-dddddddddd01'
const sellableIron = 'dddddddd-dddd-dddd-dddd-dddddddddd02'
const sellableVitC = 'dddddddd-dddd-dddd-dddd-dddddddddd03'
const sellableOmega = 'dddddddd-dddd-dddd-dddd-dddddddddd04'

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
  /** When true, stream after goals returns a profile sex turn until answered. */
  profileQuiz?: boolean
  /** Include package on create conversation. */
  withPackage?: boolean
  /** Pretend the session is already a member (email login). */
  asMember?: boolean
  /** Seed GET /orders with a paid order after checkout mock. */
  withOrder?: boolean
}

/** Mock candor-core auth + chat/report/profile so e2e does not need a live API. */
export async function mockCandorAuth(page: Page, options: CandorMockOptions = {}) {
  let quizAnswered = false
  let goalsSet = false
  let streamCount = 0
  let reportPollCount = 0
  const sessionUser = options.asMember ? memberUser : guestUser
  const sessionToken = options.asMember ? 'e2e-member-token' : 'e2e-guest-token'
  let placedOrder: {
    id: string
    order_no: string
    status: string
    payment_status: string
    amount_total: number
    package_plan_name: string
    created_at: string
  } | null = options.withOrder
    ? {
        id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        order_no: 'ORD-260101-000001',
        status: 'confirmed',
        payment_status: 'paid',
        amount_total: 1280,
        package_plan_name: '基礎保養',
        created_at: '2026-01-01T12:00:00Z'
      }
    : null

  await page.route('**/api/v1/package-plans', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          package_plans: [
            {
              code: 'basic',
              name: '基礎保養',
              name_en: 'Basic Care',
              price: 5000,
              period_days: 30,
              description: '對應異常指標的基礎補充'
            },
            {
              code: 'advance',
              name: '完整調理',
              name_en: 'Full Tune',
              price: 9000,
              period_days: 30,
              description: '基礎保養＋加強項目'
            }
          ]
        }
      })
    })
  })

  await page.route('**/api/v1/recommendations', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          run_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          report_id: reportId,
          weight_set: { id: 'ws-e2e', version: '0.1.0' },
          generated_at: '2026-01-01T00:00:00Z',
          copy_mode: 'template',
          summary: {
            top_domains: [{ domain_id: 'd1', name: '關節骨骼', severity: 0.7 }],
            data_gaps: [],
            profile_gaps: [],
            strategy_code: 'focus_abnormal',
            message: null
          },
          items: [
            {
              rank: 1,
              sellable_item_id: sellableVitD,
              sku: 'VITD-01',
              name: '維生素 D',
              score_raw: 1.2,
              score_norm: 1,
              tier: 'primary',
              copy: {
                headline: '日曬時間不足，可能影響骨骼與免疫。',
                body: '補充維生素 D，協助鈣吸收與日常防護。',
                disclaimer: '本建議僅供健康管理參考，非醫療診斷或療效保證。'
              }
            },
            {
              rank: 2,
              sellable_item_id: sellableIron,
              sku: 'IRON-01',
              name: '鐵蛋白調理',
              score_raw: 0.9,
              score_norm: 0.75,
              tier: 'primary',
              copy: {
                headline: '鐵蛋白偏低，可能與疲勞、氣色有關。',
                body: '針對這次血檢偏低的鐵蛋白做基礎補充。',
                disclaimer: '本建議僅供健康管理參考，非醫療診斷或療效保證。'
              }
            },
            {
              rank: 3,
              sellable_item_id: sellableVitC,
              sku: 'VITC-01',
              name: '維生素 C',
              score_raw: 0.6,
              score_norm: 0.5,
              tier: 'secondary',
              copy: {
                headline: '抗氧化與鐵吸收的基礎支持。',
                body: '日常抗氧化，並協助鐵的吸收。',
                disclaimer: '本建議僅供健康管理參考，非醫療診斷或療效保證。'
              }
            },
            {
              rank: 4,
              sellable_item_id: sellableOmega,
              sku: 'OMEGA-01',
              name: 'Omega-3',
              score_raw: 0.4,
              score_norm: 0.33,
              tier: 'secondary',
              copy: {
                headline: '血脂與日常防護的加強項目。',
                body: '完整調理方案的加強品項。',
                disclaimer: '本建議僅供健康管理參考，非醫療診斷或療效保證。'
              }
            }
          ],
          packages: [
            {
              package_plan_code: 'basic',
              package_plan_name: '基礎保養',
              price: 1280,
              period_days: 30,
              items: [
                {
                  rank: 1,
                  sellable_item_id: sellableVitD,
                  code: 'vitamin_d',
                  name: '維生素 D',
                  unit_price: 9,
                  daily_dose: 1,
                  daily_servings_min: 1,
                  daily_servings_max: 1,
                  monthly_cost: 280
                },
                {
                  rank: 2,
                  sellable_item_id: sellableIron,
                  code: 'iron',
                  name: '鐵蛋白調理',
                  unit_price: 17,
                  daily_dose: 1,
                  daily_servings_min: 1,
                  daily_servings_max: 1,
                  monthly_cost: 520
                },
                {
                  rank: 3,
                  sellable_item_id: sellableVitC,
                  code: 'vitamin_c',
                  name: '維生素 C',
                  unit_price: 16,
                  daily_dose: 1,
                  daily_servings_min: 1,
                  daily_servings_max: 1,
                  monthly_cost: 480
                }
              ],
              used_amount: 1280,
              remaining: 0,
              composition_hash: 'sha256:basic'
            },
            {
              package_plan_code: 'advance',
              package_plan_name: '完整調理',
              price: 1980,
              period_days: 30,
              items: [
                {
                  rank: 1,
                  sellable_item_id: sellableVitD,
                  code: 'vitamin_d',
                  name: '維生素 D',
                  unit_price: 9,
                  daily_dose: 1,
                  daily_servings_min: 1,
                  daily_servings_max: 1,
                  monthly_cost: 280
                },
                {
                  rank: 2,
                  sellable_item_id: sellableIron,
                  code: 'iron',
                  name: '鐵蛋白調理',
                  unit_price: 17,
                  daily_dose: 1,
                  daily_servings_min: 1,
                  daily_servings_max: 1,
                  monthly_cost: 520
                },
                {
                  rank: 3,
                  sellable_item_id: sellableVitC,
                  code: 'vitamin_c',
                  name: '維生素 C',
                  unit_price: 16,
                  daily_dose: 1,
                  daily_servings_min: 1,
                  daily_servings_max: 1,
                  monthly_cost: 480
                },
                {
                  rank: 4,
                  sellable_item_id: sellableOmega,
                  code: 'omega3',
                  name: 'Omega-3',
                  unit_price: 9,
                  daily_dose: 1,
                  daily_servings_min: 1,
                  daily_servings_max: 1,
                  monthly_cost: 280
                }
              ],
              used_amount: 1560,
              remaining: 420,
              composition_hash: 'sha256:advance'
            }
          ],
          excluded: []
        }
      })
    })
  })

  await page.route('**/api/v1/auth/guest', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { token: sessionToken, expires_in: 3600, user: sessionUser }
      })
    })
  })

  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { token: sessionToken, expires_in: 3600, user: sessionUser }
      })
    })
  })

  await page.route('**/api/v1/users/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { ...sessionUser, created_at: '2026-01-01T00:00:00Z' }
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
    const postData = route.request().postDataJSON() as { package_plan_code?: string } | null
    const includePackage = options.withPackage || Boolean(postData?.package_plan_code)
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
                package_plan: {
                  package_plan_code: postData?.package_plan_code || 'basic',
                  name_zh: '基礎保養',
                  price: 5000,
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

  await page.route(`**/api/v1/conversation/${conversationId}/goals`, async (route) => {
    const body = route.request().postDataJSON() as { goals?: string[], raw_text?: string } | null
    const goals = body?.goals || []
    if (goals.length > 0 && goals.length < 2 && !body?.raw_text) {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'failed',
          error_message: 'At least 2 valid goals are required.',
          error_code: 'invalid_request'
        })
      })
      return
    }
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
        data: { saved: true, goals: goals.length ? goals : ['vitality', 'sleep_quality'] }
      })
    })
  })

  await page.route(`**/api/v1/conversation/${conversationId}/package-plan/confirm`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          id: conversationId,
          package_plan: {
            package_plan_code: 'basic',
            name_zh: '基礎保養',
            price: 5000,
            confirmed: true
          }
        }
      })
    })
  })

  await page.route(`**/api/v1/conversation/${conversationId}`, async (route) => {
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

  await page.route(`**/api/v1/conversation/${conversationId}/messages/stream`, async (route) => {
    streamCount += 1
    let donePayload: Record<string, unknown> = {
      message_id: `msg-e2e-${streamCount}`,
      claim_guard: 'passed',
      content: '依報告來看，基礎保養會是合適起點。',
      options: [],
      turn: { type: 'message' },
      profile_question: null,
      external: null,
      profile_gaps: []
    }

    if (options.profileQuiz && goalsSet && !quizAnswered) {
      donePayload = {
        message_id: `msg-e2e-${streamCount}`,
        claim_guard: 'passed',
        content: '請問您的生理性別？',
        options: [
          { code: 'M', label: '男' },
          { code: 'F', label: '女' }
        ],
        turn: { type: 'profile' },
        profile_question: { gap_code: 'sex', answer_type: 'enum' },
        external: null,
        profile_gaps: ['sex', 'age', 'diet']
      }
    } else if (options.profileQuiz && goalsSet && quizAnswered && streamCount <= 2) {
      donePayload = {
        message_id: `msg-e2e-${streamCount}`,
        claim_guard: 'passed',
        content: '想先從哪一塊聊起？',
        options: [
          { code: 'opt_1', label: '睡眠' },
          { code: 'opt_2', label: '代謝' }
        ],
        turn: { type: 'message' },
        profile_question: null,
        external: null,
        profile_gaps: []
      }
    }

    const body = [
      'event: delta',
      `data: ${JSON.stringify({ text: donePayload.content })}`,
      '',
      'event: done',
      `data: ${JSON.stringify(donePayload)}`,
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
    reportPollCount += 1
    if (reportPollCount === 1) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            id: reportId,
            status: 'processing',
            page_count: null,
            extraction_confidence: null,
            results: []
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

  await page.route('**/api/v1/orders', async (route) => {
    if (route.request().method() === 'POST') {
      placedOrder = {
        id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        order_no: 'ORD-260101-000001',
        status: 'created',
        payment_status: 'pending',
        amount_total: 1280,
        package_plan_name: '基礎保養',
        created_at: '2026-01-01T12:00:00Z'
      }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            id: placedOrder.id,
            order_no: placedOrder.order_no,
            status: 'created',
            payment_status: 'pending',
            amount_total: 1280,
            payment: {
              id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
              method: 'card',
              status: 'pending',
              amount: 1280,
              redirect_url: 'https://sandbox.example/pay/sbx_e2e'
            }
          }
        })
      })
      return
    }
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            orders: placedOrder
              ? [{
                  id: placedOrder.id,
                  order_no: placedOrder.order_no,
                  status: placedOrder.status,
                  payment_status: placedOrder.payment_status,
                  amount_total: placedOrder.amount_total,
                  package_plan_name: placedOrder.package_plan_name,
                  created_at: placedOrder.created_at
                }]
              : []
          }
        })
      })
      return
    }
    await route.fallback()
  })

  await page.route('**/api/v1/order/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/message') || url.includes('/payment') || url.includes('/cancel')) {
      await route.fallback()
      return
    }
    if (route.request().method() !== 'GET') {
      await route.fallback()
      return
    }
    if (!placedOrder) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'failed', error_message: 'Not found', error_code: 'not_found', error_data: null })
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          id: placedOrder.id,
          order_no: placedOrder.order_no,
          status: placedOrder.status,
          payment_status: placedOrder.payment_status,
          amount_total: placedOrder.amount_total,
          package_plan_name: placedOrder.package_plan_name,
          package: {
            id: 'pkg-1',
            package_plan_code: 'basic',
            package_plan_name: '基礎保養',
            package_plan_price: 1280,
            period_days: 30,
            composition_hash: 'sha256:basic',
            used_amount: 1280,
            remaining: 0,
            components: [
              { id: 'c1', sellable_item_id: sellableVitD, sellable_item_code: 'vitamin_d', sellable_item_name: '維生素 D', unit_price: 9, daily_dose: 1, monthly_cost: 280, rank: 1 },
              { id: 'c2', sellable_item_id: sellableIron, sellable_item_code: 'iron', sellable_item_name: '鐵蛋白調理', unit_price: 17, daily_dose: 1, monthly_cost: 520, rank: 2 },
              { id: 'c3', sellable_item_id: sellableVitC, sellable_item_code: 'vitamin_c', sellable_item_name: '維生素 C', unit_price: 16, daily_dose: 1, monthly_cost: 480, rank: 3 }
            ]
          },
          lines: [],
          recipient: { name: '林晏婷', phone: '0912345678', address: '台北市大安區', email: 'guest@example.com' },
          invoice_type: 'member',
          created_at: placedOrder.created_at,
          confirmed_at: placedOrder.payment_status === 'paid' ? placedOrder.created_at : null,
          payments: []
        }
      })
    })
  })
}
