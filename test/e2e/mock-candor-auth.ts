import type { Page } from '@playwright/test'

/** Flow v2 PR1：A／B／C create 共用 greeting.consult 開場白。 */
export const FLOW_V2_GREETING_CONSULT
  = '您好，我是您的專屬個人健康顧問（非醫生），您可以詢問各項醫療保健與健康問題，也可以上傳您的血檢、健診報告，讓我們為您分析健康狀態，並依據我們的了解提供您保健品的健康建議與訂購'

/** 取代 greeting.path_c_await_upload（後端文案；FE 空 content 時 i18n 對齊）。 */
export const FLOW_V2_PATH_C_AWAIT_UPLOAD
  = '請上傳血檢或健檢報告；若暫時沒有，也可以點『我想聊聊』隨意聊聊，或點『我想諮詢健康方案』進行健康諮詢。'

/** 取代 greeting.path_c_basics（後端文案）。 */
export const FLOW_V2_PATH_C_BASICS
  = '報告收到了，接下來問您幾個問題，先從您想改善的健康方向開始'

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
  { code: 'sleep', label: '睡眠' },
  { code: 'weight_loss', label: '減重' },
  { code: 'immune_boost', label: '免疫提升' },
  { code: 'cognitive_function', label: '認知功能' },
  { code: 'gastrointestinal', label: '腸胃道' }
]

export type PackagePlansMockMode
  = | 'legacy'
    | 'catalog'
    | 'no-strikethrough'
    | 'description-en'
    | 'description-en-null'

export type CandorMockOptions = {
  /** When true, stream after goals returns a profile sex turn until answered. */
  profileQuiz?: boolean
  /** Include package on create conversation. */
  withPackage?: boolean
  /** Pretend the session is already a member (email login). */
  asMember?: boolean
  /** Seed GET /orders with a paid order after checkout mock. */
  withOrder?: boolean
  /** GET /client-config individual_tests_url (empty hides hero labs CTA). */
  individualTestsUrl?: string
  /** GET /package-plans payload shape (default legacy = pre-catalog API). */
  packagePlans?: PackagePlansMockMode
  /**
   * Expert-review GET for checkout gates.
   * `none` → 404 (allow expert checkout). Default keeps legacy awaiting/reviewed mock.
   */
  expertReview?: 'none' | 'awaiting' | 'reviewed' | 'reviewed_with_order'
  /** Expert plans catalog: empty → F-08; single → preselect. */
  expertPlansCatalog?: 'default' | 'empty' | 'single'
  /**
   * GET /checkout/preview（與專家建單）回 422 questionnaire_incomplete。
   * `true` → 預設缺 sex／age／height／weight；或傳字串陣列覆寫 missing_fields。
   */
  questionnaireIncomplete?: boolean | string[]
  /**
   * core #146：已付款專家單 → GET /checkout/preview 與 POST /orders 回 409
   * `conversation_already_ordered`。
   * `true` → 帶 expert_case_id；`no_case` → 已付但無案件（仍有 order_id）；
   * `missing_order` → 缺 order_id（CTA 回對話，容錯）。
   */
  conversationAlreadyOrdered?: boolean | 'no_case' | 'missing_order'
  /**
   * core #146：未付款舊單 — preview 200 帶 `existing_order:{order_id,order_no}`；
   * POST /orders 仍 201（同方案 reuse）。
   */
  existingUnpaidOrder?: boolean
  /**
   * core #146：POST /orders 409 `expert_plan_reuse_mismatch`（方案與未付款舊單不同）。
   * preview 仍 200 並帶 `existing_order`。
   */
  expertPlanReuseMismatch?: boolean
  /**
   * Seed `candor.privacy.consent.version` before each navigation.
   * Default matches the mocked privacy-policy version so the cookie banner
   * does not cover other e2e flows. Pass `false` to leave storage empty
   * (first-visit banner tests), or an older string to force re-prompt.
   */
  privacyConsentVersion?: string | false
  /**
   * Attach reply_actions v0.1 on SSE `done` (plus conflicting legacy fields)
   * so FE dedupe / CTA projection can be asserted in e2e.
   *
   * `intake_hybrid`: after goals, history/stream choose_option(sex); answers
   * returns a non-done next_question (age int) that would lock legacy bank UI;
   * the next history/stream carries ask_vitals — FE must prefer reply_actions
   * over a local next_question bank bubble (and may skip covering stream when
   * history already has the gap CTA).
   */
  replyActions?:
    | 'offer_recommend'
    | 'ask_report'
    | 'ask_report_checkup'
    | 'lab_followup'
    /** Old-report triad: 上傳新報告／進行健康諮詢／進行血檢. */
    | 'lab_followup_stale'
    | 'ask_vitals'
    | 'degraded'
    | 'intake_hybrid'
    | 'consultation_goals'
    | 'none'
  /**
   * When true with usable reply_actions, dual-write legacy `checkup_offer: true`
   * so e2e can assert FE ignores it (RA-only checkup). Default false — do not
   * seed checkup_offer on every offer_recommend turn (core #99 / younger #30).
   */
  legacyCheckupOfferConflict?: boolean
  /**
   * Path contract A／B／C on POST /conversations.
   * Default `B` so existing e2e skip 進站三選 and keep goal chips.
   * Pass `null` for core #133 entry: create without path → greeting + path_switch a／b／c.
   */
  conversationPath?: 'A' | 'B' | 'C' | null
  /**
   * GET /profile returns filled sex／age／height／weight when true.
   * Default true so completion CTA / goal e2e are not blocked by required asks.
   * Pass false in path-contract specs that assert sex／age／height／weight 必問.
   */
  basicProfileComplete?: boolean
  /**
   * Flow v2 四條主流程 e2e（chat-flow-v2.spec.ts）。
   */
  chatFlowV2?: 'a-guide-15' | 'b-completion' | 'b-triad-asking' | 'c-completion' | 'turn-limit-20'
  /**
   * Pretend POST /goals already succeeded (A→B guide_switch must not re-ask).
   */
  goalsAlreadySet?: boolean
  /**
   * Terminal status after the first processing poll on GET /health-reports/{id}.
   * Default `ready`. Use `needs_review` to assert POST-attach stream ack.
   */
  reportTerminalStatus?: 'ready' | 'needs_review'
  /**
   * Path B create `flow_prompt` carries consultation_goals reply_actions
   * (core opening bank). Entry stream may still run; FE must paint RA first.
   */
  bOpeningFlowPromptRa?: boolean
  /**
   * Attach `flow_prompt` reply_actions shape. Default `consultation_goals`.
   * Use `lab_followup_stale` for old-report triad chips.
   */
  attachFlowPromptRa?: 'consultation_goals' | 'lab_followup_stale'
  /**
   * Fail the auto「我的報告已上傳」stream so FE must keep flow_prompt CTAs.
   */
  failReportUploadedAckStream?: boolean
}

/** Shared goals choose_option column for create／attach flow_prompt mocks. */
export function mockConsultationGoalsReplyActions() {
  return {
    schema_version: '0.1',
    source: 'rule',
    adaptor: 'rule',
    degraded: false,
    error: null,
    actions: [
      {
        type: 'choose_option',
        payload: {
          kind: 'consultation_goals',
          mode: 'multi',
          confirm: true,
          options: goalOptions,
          selected: [],
          gap_code: null,
          answer_type: 'multi_enum',
          exclusive_codes: []
        }
      }
    ]
  }
}

/** Old-report triad on attach flow_prompt (core lab_followup). */
export function mockStaleReportLabFollowupReplyActions() {
  return {
    schema_version: '0.1',
    source: 'rule',
    adaptor: 'rule',
    degraded: false,
    error: null,
    actions: [
      {
        type: 'choose_option',
        payload: {
          kind: 'lab_followup',
          mode: 'single',
          confirm: false,
          options: [
            { code: 'upload_new', label: '上傳新報告', maps_to: 'ask_report' },
            { code: 'consult', label: '進行健康諮詢', maps_to: 'continue_consultation' },
            { code: 'checkup', label: '進行血檢', maps_to: 'offer_checkup' }
          ],
          selected: [],
          gap_code: null,
          answer_type: null,
          exclusive_codes: []
        }
      }
    ]
  }
}

const legacyPackagePlans = [
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

const catalogPackagePlans = [
  {
    code: 'basic',
    name: '基礎保養',
    name_en: 'Basic Care',
    price: 5000,
    original_price: 8000,
    period_days: 30,
    description: '對應異常指標的基礎補充',
    features: ['API 基礎功能一', 'API 基礎功能二', 'API 基礎功能三'],
    features_en: ['API basic feature one', 'API basic feature two', 'API basic feature three'],
    badge: null,
    badge_en: null,
    highlight: false
  },
  {
    code: 'advance',
    name: '完整調理',
    name_en: 'Full Tune',
    price: 9000,
    original_price: 12000,
    period_days: 30,
    description: '基礎保養＋加強項目',
    features: ['API 進階功能一', 'API 進階功能二', 'API 進階功能三'],
    features_en: ['API advance feature one', 'API advance feature two', 'API advance feature three'],
    badge: '推薦',
    badge_en: 'Recommended',
    highlight: true
  }
]

const noStrikethroughPackagePlans = [
  {
    ...catalogPackagePlans[0],
    original_price: null
  },
  {
    ...catalogPackagePlans[1],
    original_price: 9000
  }
]

/** Post–core #49: field present but null → client i18n fallback. */
const descriptionEnNullPackagePlans = [
  {
    ...legacyPackagePlans[0],
    description_en: null
  },
  {
    ...legacyPackagePlans[1],
    description_en: null
  }
]

/** Distinct API copy so e2e can assert description_en wins over i18n. */
const descriptionEnDistinctPackagePlans = [
  {
    ...legacyPackagePlans[0],
    description_en: 'E2E API basic description_en'
  },
  {
    ...legacyPackagePlans[1],
    description_en: 'E2E API advance description_en'
  }
]

function packagePlansForMode(mode: PackagePlansMockMode = 'legacy') {
  if (mode === 'catalog') {
    return catalogPackagePlans
  }
  if (mode === 'no-strikethrough') {
    return noStrikethroughPackagePlans
  }
  if (mode === 'description-en') {
    return descriptionEnDistinctPackagePlans
  }
  if (mode === 'description-en-null') {
    return descriptionEnNullPackagePlans
  }
  return legacyPackagePlans
}

const MOCK_PRIVACY_POLICY_VERSION = '2026-10-24'
const PRIVACY_CONSENT_STORAGE_KEY = 'candor.privacy.consent.version'

/** Mock candor-core auth + chat/report/profile so e2e does not need a live API. */
export async function mockCandorAuth(page: Page, options: CandorMockOptions = {}) {
  let quizAnswered = false
  let goalsSet = Boolean(options.goalsAlreadySet)
  let streamCount = 0
  let chatFlowTurnCount = 0
  let mockEntryPath: 'a' | 'b' | 'c' = 'b'
  let reportPollCount = 0
  /** Hybrid intake: sex answered → next answers/stream should offer ask_vitals. */
  let hybridSexAnswered = false
  const asMember = Boolean(options.asMember)
  let sessionUser = asMember ? memberUser : guestUser

  // Keep cookie banner out of unrelated flows unless a test opts out / seeds a stale version.
  if (options.privacyConsentVersion !== false) {
    const version = options.privacyConsentVersion ?? MOCK_PRIVACY_POLICY_VERSION
    await page.addInitScript(({ key, value }) => {
      localStorage.setItem(key, value)
    }, { key: PRIVACY_CONSENT_STORAGE_KEY, value: version })
  }
  let sessionToken = asMember ? 'e2e-member-token' : 'e2e-guest-token'

  function identityFromAuthHeader(header: string | null): {
    user: typeof guestUser | typeof memberUser
    token: string
  } | null {
    if (!header || !/^Bearer\s+(\S+)$/i.test(header)) {
      return null
    }
    const token = header.replace(/^Bearer\s+/i, '')
    if (token === 'e2e-member-token') {
      return { user: memberUser, token }
    }
    if (token === 'e2e-guest-token' || token === sessionToken) {
      return { user: sessionUser, token }
    }
    return { user: sessionUser, token: sessionToken }
  }
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

  await page.route('**/api/v1/client-config', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          items: [],
          individual_tests_url: options.individualTestsUrl ?? ''
        }
      })
    })
  })

  await page.route('**/api/v1/legal/privacy-policy', async (route) => {
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
          title: '隱私權政策',
          body: '## 我們如何使用資料\n\n本服務使用**必要 Cookie** 與本機儲存以維持登入狀態。\n\n詳見版本說明。',
          version: MOCK_PRIVACY_POLICY_VERSION,
          updated_at: '2026-10-24T00:00:00Z'
        }
      })
    })
  })

  await page.route('**/api/v1/package-plans', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          package_plans: packagePlansForMode(options.packagePlans)
        }
      })
    })
  })

  await page.route('**/api/v1/expert-plans', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback()
      return
    }
    const catalog = options.expertPlansCatalog ?? 'default'
    const expertPlans = catalog === 'empty'
      ? []
      : catalog === 'single'
        ? [{
            id: 'ep-basic',
            code: 'basic',
            package_plan_id: 'pp-basic',
            name_zh: '基本方案',
            price: 6000,
            sort_order: 1,
            active: true
          }]
        : [
            {
              id: 'ep-basic',
              code: 'basic',
              package_plan_id: 'pp-basic',
              name_zh: '基本方案',
              price: 6000,
              sort_order: 1,
              active: true
            },
            {
              id: 'ep-advance',
              code: 'advance',
              package_plan_id: 'pp-advance',
              name_zh: '進階方案',
              price: 9000,
              sort_order: 2,
              active: true
            }
          ]
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { expert_plans: expertPlans }
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
                  daily_servings_max: 1,
                  monthly_cost: 280,
                  is_core: true,
                  image_url: 'https://cdn.example/catalog/vitamin_d.png',
                  display_reason: '無分組定稿原因'
                },
                {
                  rank: 2,
                  sellable_item_id: sellableIron,
                  code: 'iron',
                  name: '鐵蛋白調理',
                  unit_price: 17,
                  daily_dose: 1,
                  daily_servings_max: 1,
                  monthly_cost: 520,
                  is_core: false
                },
                {
                  rank: 3,
                  sellable_item_id: sellableVitC,
                  code: 'vitamin_c',
                  name: '維生素 C',
                  unit_price: 16,
                  daily_dose: 1,
                  daily_servings_max: 1,
                  monthly_cost: 480,
                  is_core: false,
                  display_reason: '顧問定稿原因'
                }
              ],
              used_amount: 1280,
              remaining: 0,
              composition_hash: 'sha256:basic',
              rationale: {
                headline: '評估與總覽',
                body: '關注免疫提升\n- 建議補充維生素C成份：維生素 C\n\n低密度脂蛋白 190 mg/dL 偏高\n- 建議補充維生素D成份：維生素 D\n- 建議補充鐵成份：鐵蛋白調理',
                disclaimer: '本建議僅供健康管理參考，非醫療診斷或療效保證。',
                copy_mode: 'template',
                groups: [
                  {
                    kind: 'goal',
                    key: 'goal:immune_boost',
                    title: '關注免疫提升',
                    entries: [
                      {
                        code: 'vitamin_c',
                        name: '維生素 C',
                        ingredient_label: '維生素C',
                        line: '建議補充維生素C成份：維生素 C',
                        claim_guard_hits: [{ term: '治癒', severity: 'blocked' }]
                      }
                    ]
                  },
                  {
                    kind: 'signal',
                    key: 'signal:LDL:190',
                    title: '低密度脂蛋白 190 mg/dL 偏高',
                    entries: [
                      {
                        code: 'iron',
                        name: '鐵蛋白調理',
                        ingredient_label: '鐵',
                        line: '建議補充鐵成份：鐵蛋白調理',
                        claim_guard_hits: []
                      }
                    ]
                  }
                ],
                items: [
                  {
                    code: 'vitamin_c',
                    name: '維生素 C',
                    reason: '建議補充維生素C成份：維生素 C',
                    claim_guard_hits: [{ term: '治癒', severity: 'blocked' }]
                  },
                  {
                    code: 'vitamin_d',
                    name: '維生素 D',
                    reason: '建議補充維生素D成份：維生素 D',
                    claim_guard_hits: []
                  },
                  {
                    code: 'iron',
                    name: '鐵蛋白調理',
                    reason: '建議補充鐵成份：鐵蛋白調理',
                    claim_guard_hits: []
                  }
                ],
                claim_guard_hits: [{ term: '治癒', severity: 'blocked' }]
              }
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
                  daily_servings_max: 1,
                  monthly_cost: 280,
                  is_core: true,
                  image_url: 'https://cdn.example/catalog/vitamin_d.png'
                },
                {
                  rank: 2,
                  sellable_item_id: sellableIron,
                  code: 'iron',
                  name: '鐵蛋白調理',
                  unit_price: 17,
                  daily_dose: 1,
                  daily_servings_max: 1,
                  monthly_cost: 520,
                  is_core: false
                },
                {
                  rank: 3,
                  sellable_item_id: sellableVitC,
                  code: 'vitamin_c',
                  name: '維生素 C',
                  unit_price: 16,
                  daily_dose: 1,
                  daily_servings_max: 1,
                  monthly_cost: 480,
                  is_core: false
                },
                {
                  rank: 4,
                  sellable_item_id: sellableOmega,
                  code: 'omega3',
                  name: 'Omega-3',
                  unit_price: 9,
                  daily_dose: 1,
                  daily_servings_max: 1,
                  monthly_cost: 280,
                  is_core: true
                }
              ],
              used_amount: 1560,
              remaining: 420,
              composition_hash: 'sha256:advance',
              rationale: {
                headline: '評估與總覽',
                body: '關注免疫提升\n- 建議補充維生素D成份：維生素 D\n- 建議補充魚油成份：Omega-3',
                disclaimer: '本建議僅供健康管理參考，非醫療診斷或療效保證。',
                copy_mode: 'template',
                groups: [
                  {
                    kind: 'goal',
                    key: 'goal:immune_boost',
                    title: '關注免疫提升',
                    entries: [
                      {
                        code: 'vitamin_d',
                        name: '維生素 D',
                        ingredient_label: '維生素D',
                        line: '建議補充維生素D成份：維生素 D',
                        claim_guard_hits: []
                      },
                      {
                        code: 'omega3',
                        name: 'Omega-3',
                        ingredient_label: '魚油',
                        line: '建議補充魚油成份：Omega-3',
                        claim_guard_hits: []
                      }
                    ]
                  }
                ],
                items: [
                  {
                    code: 'vitamin_d',
                    name: '維生素 D',
                    reason: '建議補充維生素D成份：維生素 D',
                    claim_guard_hits: []
                  },
                  {
                    code: 'omega3',
                    name: 'Omega-3',
                    reason: '建議補充魚油成份：Omega-3',
                    claim_guard_hits: []
                  }
                ],
                claim_guard_hits: []
              }
            }
          ],
          excluded: []
        }
      })
    })
  })

  const reviewedPackages = [
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
          monthly_cost: 280,
          is_core: true,
          image_url: 'https://cdn.example/catalog/vitamin_d.png',
          display_reason: '無分組定稿原因'
        },
        {
          rank: 2,
          sellable_item_id: sellableIron,
          code: 'iron',
          name: '鐵蛋白調理',
          unit_price: 17,
          daily_dose: 1,
          monthly_cost: 520,
          is_core: false
        },
        {
          rank: 3,
          sellable_item_id: sellableVitC,
          code: 'vitamin_c',
          name: '維生素 C',
          unit_price: 16,
          daily_dose: 1,
          monthly_cost: 480,
          is_core: false,
          display_reason: '顧問定稿原因'
        }
      ],
      used_amount: 1280,
      remaining: 0,
      composition_hash: 'sha256:basic',
      rationale: {
        headline: '評估與總覽',
        body: '關注免疫提升',
        disclaimer: '本建議僅供健康管理參考，非醫療診斷或療效保證。',
        copy_mode: 'template',
        groups: [
          {
            kind: 'goal',
            key: 'goal:immune_boost',
            title: '關注免疫提升',
            entries: [
              {
                code: 'vitamin_c',
                name: '維生素 C',
                ingredient_label: '維生素C',
                line: '建議補充維生素C成份：維生素 C',
                claim_guard_hits: [{ term: '治癒', severity: 'blocked' }]
              }
            ]
          }
        ],
        items: [],
        claim_guard_hits: [{ term: '治癒', severity: 'blocked' }]
      }
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
          monthly_cost: 280,
          is_core: true
        },
        {
          rank: 2,
          sellable_item_id: sellableOmega,
          code: 'omega3',
          name: 'Omega-3',
          unit_price: 9,
          daily_dose: 1,
          monthly_cost: 280,
          is_core: true
        }
      ],
      used_amount: 560,
      remaining: 1420,
      composition_hash: 'sha256:advance',
      rationale: {
        headline: '評估與總覽',
        body: '完整調理',
        disclaimer: '本建議僅供健康管理參考，非醫療診斷或療效保證。',
        copy_mode: 'template',
        groups: [],
        items: [],
        claim_guard_hits: []
      }
    }
  ]

  const expertReviewId = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
  let memberExpertReviewStatus: 'awaiting_review' | 'reviewed' = 'reviewed'

  await page.route('**/api/v1/expert-case-reviews**', async (route) => {
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
          expert_case_reviews: [
            {
              id: expertReviewId,
              conversation_id: conversationId,
              health_report_id: reportId,
              status: memberExpertReviewStatus,
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T01:00:00Z',
              reviewed_at: memberExpertReviewStatus === 'reviewed' ? '2026-01-01T01:00:00Z' : null
            }
          ]
        }
      })
    })
  })

  await page.route('**/api/v1/conversation/*/expert-review', async (route) => {
    const method = route.request().method()
    if (method !== 'GET' && method !== 'POST') {
      await route.fallback()
      return
    }
    if (method === 'POST') {
      memberExpertReviewStatus = 'awaiting_review'
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            id: expertReviewId,
            conversation_id: conversationId,
            health_report_id: reportId,
            status: 'awaiting_review',
            recommendation_run_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z'
          }
        })
      })
      return
    }
    const reviewMode = options.expertReview
    if (reviewMode === 'none') {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          error: { code: 'not_found', message: 'expert review not found' }
        })
      })
      return
    }
    const withOrder = reviewMode === 'reviewed_with_order'
    const status = reviewMode === 'awaiting'
      ? 'awaiting_review'
      : (reviewMode === 'reviewed' || withOrder || memberExpertReviewStatus === 'reviewed'
          ? 'reviewed'
          : memberExpertReviewStatus)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: status === 'reviewed'
          ? {
              id: expertReviewId,
              conversation_id: conversationId,
              health_report_id: reportId,
              status: 'reviewed',
              recommendation_run_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T01:00:00Z',
              reviewed_at: '2026-01-01T01:00:00Z',
              packages: reviewedPackages,
              weight_set: { id: 'ws-e2e', version: '0.1.0' },
              summary: {
                top_domains: [],
                data_gaps: [],
                profile_gaps: [],
                strategy_code: 'focus_abnormal',
                message: null
              },
              ...(withOrder
                ? { order_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', expert_plan_id: 'ep-basic' }
                : {})
            }
          : {
              id: expertReviewId,
              conversation_id: conversationId,
              health_report_id: reportId,
              status: 'awaiting_review',
              recommendation_run_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z'
            }
      })
    })
  })

  await page.route('**/api/v1/conversations/*/completion-choice', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }
    const convId = route.request().url().match(/conversations\/([^/]+)/)?.[1]
      ?? '00000000-0000-4000-8000-000000000001'
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          conversation_id: convId,
          chosen_at: new Date().toISOString()
        }
      })
    })
  })

  await page.route('**/api/v1/checkout/preview**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback()
      return
    }
    const url = new URL(route.request().url())
    const mode = url.searchParams.get('mode') === 'ai' ? 'ai' : 'expert'
    const conversationIdParam = url.searchParams.get('conversation_id')?.trim() ?? ''
    // core #143 f2795e9c: AI preview without conversation_id → 422 invalid_request
    if (mode === 'ai' && !conversationIdParam) {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'failed',
          error_message: 'conversation_id is required',
          error_code: 'invalid_request',
          error_data: null
        })
      })
      return
    }
    // core #145 92e7bbc: missing sex／age／height／weight → 422 questionnaire_incomplete
    if (options.questionnaireIncomplete) {
      const missingFields = Array.isArray(options.questionnaireIncomplete)
        ? options.questionnaireIncomplete
        : ['sex', 'age', 'height', 'weight']
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'failed',
          error_message: 'Basic profile fields are required: sex, age, height, weight.',
          error_code: 'questionnaire_incomplete',
          error_data: {
            missing_fields: missingFields,
            conversation_id: conversationIdParam || conversationId
          }
        })
      })
      return
    }
    // core #146：已付款專家單 → 409 conversation_already_ordered
    if (options.conversationAlreadyOrdered) {
      const mode409 = options.conversationAlreadyOrdered
      const errorData: Record<string, unknown> = {
        conversation_id: conversationIdParam || conversationId,
        order_no: 'ORD-260101-000001'
      }
      if (mode409 !== 'missing_order') {
        errorData.order_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
      }
      if (mode409 === true) {
        errorData.expert_case_id = expertReviewId
      }
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'failed',
          error_message: 'Conversation already has a valid expert-plan order.',
          error_code: 'conversation_already_ordered',
          error_data: errorData
        })
      })
      return
    }
    const packagePlanCode = url.searchParams.get('package_plan_code') || 'basic'
    const catalog = options.expertPlansCatalog ?? 'default'
    const expertPlans = catalog === 'empty'
      ? []
      : catalog === 'single'
        ? [{
            id: 'ep-basic',
            code: 'basic',
            package_plan_id: 'pp-basic',
            name_zh: '基本方案',
            price: 6000,
            sort_order: 1,
            active: true
          }]
        : [
            {
              id: 'ep-basic',
              code: 'basic',
              package_plan_id: 'pp-basic',
              name_zh: '基本方案',
              price: 6000,
              sort_order: 1,
              active: true
            },
            {
              id: 'ep-advance',
              code: 'advance',
              package_plan_id: 'pp-advance',
              name_zh: '進階方案',
              price: 9000,
              sort_order: 2,
              active: true
            }
          ]

    const reviewMode = options.expertReview
    let block: { code: string } | null = null
    let checkoutLocked = false
    let checkoutLockReason: string | null = null
    if (mode === 'expert') {
      if (reviewMode === 'reviewed_with_order') {
        checkoutLocked = true
        checkoutLockReason = 'order_submitted'
      } else if (reviewMode === 'awaiting' || reviewMode === 'reviewed') {
        block = { code: 'expert_case_exists' }
      } else if (catalog === 'empty') {
        block = { code: 'no_expert_plans' }
      }
    }

    const aiItems = [
      {
        rank: 1,
        sellable_item_id: sellableVitD,
        code: 'vitamin_d',
        name: '維生素 D',
        unit_price: 9,
        daily_dose: 1,
        daily_servings_max: 2,
        daily_price: 9,
        monthly_cost: 280,
        score_raw: 1,
        is_core: true,
        image_url: null
      },
      {
        rank: 2,
        sellable_item_id: sellableIron,
        code: 'iron',
        name: '鐵蛋白調理',
        unit_price: 17,
        daily_dose: 1,
        daily_servings_max: 1,
        daily_price: 17,
        monthly_cost: 520,
        score_raw: 0.8,
        is_core: false,
        image_url: null
      }
    ]

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          conversation_id: conversationId,
          mode,
          block,
          checkout_locked: checkoutLocked,
          checkout_lock_reason: checkoutLockReason,
          recipient: {
            name: '林晏婷',
            phone: '0912345678',
            address: '台北市大安區復興南路一段 100 號',
            address_city: '台北市',
            address_district: '大安區',
            address_detail: '復興南路一段 100 號',
            email: 'guest@example.com'
          },
          shipping: { fee: 0, free: true },
          invoice: {},
          payment_methods: [
            { code: 'card', available: true, status: null },
            { code: 'linepay', available: false, status: 'coming_soon' },
            { code: 'atm', available: false, status: 'coming_soon' }
          ],
          expert_plans: mode === 'expert' ? expertPlans : [],
          preselect_expert_plan_code: mode === 'expert' && expertPlans.length === 1
            ? expertPlans[0]?.code ?? null
            : null,
          ai: mode === 'ai'
            ? {
                package_plan_code: packagePlanCode,
                package_plan_name: packagePlanCode === 'advance' ? '完整調理' : '基礎保養',
                name_zh: packagePlanCode === 'advance' ? '完整調理' : '基礎保養',
                price: packagePlanCode === 'advance' ? 2980 : 1980,
                period_days: 30,
                item_count: aiItems.length,
                used_amount: 800,
                remaining: packagePlanCode === 'advance' ? 2180 : 1180,
                composition_hash: `sha256:${packagePlanCode}`,
                items: aiItems
              }
            : null,
          completion_choice: null,
          existing_order: mode === 'ai'
            ? null
            : (options.existingUnpaidOrder || options.expertPlanReuseMismatch
                ? {
                    order_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
                    order_no: 'ORD-260101-000001'
                  }
                : null)
        }
      })
    })
  })

  await page.route('**/api/v1/order/*/finalized-plan', async (route) => {
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
          order_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
          expert_case_id: expertReviewId,
          reviewed_at: '2026-01-01T01:00:00Z',
          packages: [
            {
              package_plan_code: 'basic',
              name_zh: '基礎保養',
              items: [
                {
                  sellable_item_code: 'vitamin_d',
                  name_zh: '維生素 D',
                  daily_dose: 1,
                  unit: '顆'
                },
                {
                  sellable_item_code: 'iron',
                  name_zh: '鐵蛋白調理',
                  daily_dose: 1,
                  unit: '顆'
                }
              ]
            }
          ]
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
    const identity = identityFromAuthHeader(route.request().headers().authorization ?? null)
    const user = identity?.user ?? sessionUser
    const token = identity?.token ?? sessionToken
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { token, expires_in: 3600, user }
      })
    })
  })

  await page.route('**/api/v1/users/me', async (route) => {
    const identity = identityFromAuthHeader(route.request().headers().authorization ?? null)
    const user = identity?.user ?? sessionUser
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON() as {
        default_recipient?: {
          name: string
          phone: string
          address_city: string
          address_district: string
          address_detail: string
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            ...user,
            created_at: '2026-01-01T00:00:00Z',
            default_recipient: body.default_recipient
              ? {
                  name: body.default_recipient.name,
                  phone: body.default_recipient.phone,
                  address_city: body.default_recipient.address_city,
                  address_district: body.default_recipient.address_district,
                  address_detail: body.default_recipient.address_detail
                }
              : null
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
        data: { ...user, created_at: '2026-01-01T00:00:00Z', default_recipient: null }
      })
    })
  })

  await page.route('**/api/v1/auth/login', async (route) => {
    sessionUser = memberUser
    sessionToken = 'e2e-member-token'
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { token: sessionToken, expires_in: 3600, user: sessionUser }
      })
    })
  })

  await page.route('**/api/v1/auth/register', async (route) => {
    sessionUser = memberUser
    sessionToken = 'e2e-member-token'
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { token: sessionToken, expires_in: 3600, user: sessionUser }
      })
    })
  })

  const resolvedConversationPath = options.conversationPath === undefined
    ? 'b' as const
    : options.conversationPath === null
      ? null
      : String(options.conversationPath).toLowerCase() as 'a' | 'b' | 'c'
  let resolvedBasicProfileComplete = options.basicProfileComplete ?? true
  /** Track null-path entry until POST …/path (core #133). */
  let mockEntryPathSelected: 'a' | 'b' | 'c' | null = resolvedConversationPath
  mockEntryPath = (resolvedConversationPath ?? 'b') as 'a' | 'b' | 'c'

  const entryPathSwitchReplyActions = {
    schema_version: '0.1',
    source: 'semantic_judgment',
    adaptor: 'rule',
    degraded: false,
    error: null,
    actions: [{
      type: 'choose_option',
      payload: {
        kind: 'path_switch',
        mode: 'single',
        confirm: false,
        options: [
          { code: 'a', label: '我想聊聊' },
          { code: 'b', label: '我想諮詢健康方案' },
          { code: 'c', label: '幫我看報告' }
        ],
        selected: [],
        gap_code: null,
        answer_type: null,
        exclusive_codes: []
      }
    }]
  }

  const pathCAwaitUploadReplyActions = {
    schema_version: '0.1',
    source: 'rule',
    adaptor: 'rule',
    degraded: false,
    error: null,
    actions: [
      { type: 'ask_report', payload: { option_codes: ['upload'] } },
      {
        type: 'choose_option',
        payload: {
          kind: 'path_switch',
          mode: 'single',
          confirm: false,
          // Empty labels: FE fills pathEntryA／B i18n (core omits copy).
          options: [
            { code: 'a', label: '' },
            { code: 'b', label: '' }
          ],
          selected: [],
          gap_code: null,
          answer_type: null,
          exclusive_codes: []
        }
      }
    ]
  }

  await page.route('**/api/v1/conversations', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }
    const postData = route.request().postDataJSON() as {
      package_plan_code?: string
      path?: string
      report_id?: string
    } | null
    const includePackage = options.withPackage || Boolean(postData?.package_plan_code)
    const bodyPath = typeof postData?.path === 'string'
      ? postData.path.trim().toLowerCase()
      : null
    const hasReport = Boolean(postData?.report_id)
    // Explicit path or report → forced path; else honor resolvedConversationPath
    // (null = entry without path per core #133).
    let path: 'a' | 'b' | 'c' | null
    if (hasReport) {
      path = 'c'
    } else if (bodyPath === 'a' || bodyPath === 'b' || bodyPath === 'c') {
      path = bodyPath
    } else if (resolvedConversationPath === null) {
      path = null
    } else {
      path = resolvedConversationPath ?? 'b'
    }
    mockEntryPathSelected = path
    mockEntryPath = (path ?? 'b') as 'a' | 'b' | 'c'
    const entryGreeting = path === null
    const greetingContent = entryGreeting
      ? `${FLOW_V2_GREETING_CONSULT}\n\n想先從哪裡開始？`
      : FLOW_V2_GREETING_CONSULT
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          id: conversationId,
          report_id: hasReport ? postData?.report_id : null,
          path,
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
            content: greetingContent,
            options: [],
            selected: [],
            ...(entryGreeting
              ? { reply_actions: entryPathSwitchReplyActions }
              : {})
          },
          ...(path === 'c' && !hasReport
            ? {
                flow_prompt: {
                  message_id: 'flow-c-await-e2e',
                  role: 'assistant',
                  content: FLOW_V2_PATH_C_AWAIT_UPLOAD,
                  options: [],
                  selected: [],
                  reply_actions: pathCAwaitUploadReplyActions
                }
              }
            : {}),
          ...(path === 'b' && options.bOpeningFlowPromptRa
            ? {
                flow_prompt: {
                  message_id: 'flow-b-goals-e2e',
                  role: 'assistant',
                  content: '先選您想改善的健康方向。',
                  options: [],
                  selected: [],
                  reply_actions: mockConsultationGoalsReplyActions()
                }
              }
            : {})
        }
      })
    })
  })

  await page.route(`**/api/v1/conversation/${conversationId}/path`, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }
    const body = route.request().postDataJSON() as { path?: string } | null
    const raw = typeof body?.path === 'string' ? body.path.trim().toLowerCase() : ''
    const nextPath = raw === 'a' || raw === 'b' || raw === 'c' ? raw : 'b'
    mockEntryPathSelected = nextPath
    mockEntryPath = nextPath
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          id: conversationId,
          path: nextPath,
          // Entry C without report: await-upload flow_prompt (core #133).
          ...(nextPath === 'c'
            ? {
                flow_prompt: {
                  message_id: 'flow-c-await-path-e2e',
                  role: 'assistant',
                  content: FLOW_V2_PATH_C_AWAIT_UPLOAD,
                  options: [],
                  selected: [],
                  reply_actions: pathCAwaitUploadReplyActions
                }
              }
            : {}),
          // core #140: A→B path ack may include opening flow_prompt＋goals RA.
          ...(nextPath === 'b' && !goalsSet
            ? {
                flow_prompt: {
                  message_id: 'flow-path-b-goals-e2e',
                  role: 'assistant',
                  content: '先選您想改善的健康方向。',
                  options: [],
                  selected: [],
                  reply_actions: mockConsultationGoalsReplyActions()
                }
              }
            : {})
        }
      })
    })
  })

  await page.route(`**/api/v1/conversation/${conversationId}/goals`, async (route) => {
    const body = route.request().postDataJSON() as { goals?: string[], raw_text?: string } | null
    const goals = body?.goals || []
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
    const nextQuestion = resolvedBasicProfileComplete
      ? { done: true }
      : {
          done: false,
          gap_code: 'sex',
          prompt: '請問您的生理性別？',
          answer_type: 'enum',
          options: [
            { code: 'M', label: '生理男' },
            { code: 'F', label: '生理女' }
          ]
        }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          saved: true,
          goals: goals.length ? goals : ['weight_loss', 'sleep'],
          next_question: nextQuestion
        }
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
        data: {
          id: conversationId,
          report_id: reportId,
          path: 'c',
          flow_prompt: {
            message_id: 'flow-c-basics-e2e',
            role: 'assistant',
            content: FLOW_V2_PATH_C_BASICS,
            options: [],
            selected: [],
            reply_actions: options.attachFlowPromptRa === 'lab_followup_stale'
              ? mockStaleReportLabFollowupReplyActions()
              : mockConsultationGoalsReplyActions()
          }
        }
      })
    })
  })

  await page.route(`**/api/v1/conversation/${conversationId}/continue-health-consultation`, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { id: conversationId, continue_health_consultation: true }
      })
    })
  })

  function buildReplyActionsPayload(
    mode: NonNullable<CandorMockOptions['replyActions']>
  ): Record<string, unknown> | null {
    if (mode === 'offer_recommend') {
      // 完成 CTA（三要件齊後之判讀結果）— 不含 ask_report，避免 report 必問擋 recommend。
      return {
        schema_version: '0.1',
        source: 'semantic_judgment',
        adaptor: 'fake',
        degraded: false,
        error: null,
        actions: [
          {
            type: 'offer_recommend',
            payload: {
              mode: 'view_recommendations',
              label: '查看推薦方案',
              path: '/app/recommendations'
            }
          }
        ]
      }
    }
    if (mode === 'ask_report') {
      return {
        schema_version: '0.1',
        source: 'semantic_judgment',
        adaptor: 'fake',
        degraded: false,
        error: null,
        actions: [
          { type: 'ask_report', payload: {} }
        ]
      }
    }
    if (mode === 'ask_report_checkup') {
      // Path B lab_report「無」形態 (b)：頂層 ask_report + offer_checkup
      return {
        schema_version: '0.1',
        source: 'semantic_judgment',
        adaptor: 'fake',
        degraded: false,
        error: null,
        actions: [
          { type: 'ask_report', payload: {} },
          { type: 'offer_checkup', payload: { url: 'https://example.test/checkup' } }
        ]
      }
    }
    if (mode === 'lab_followup') {
      // Path B lab_report「無」形態 (a)：choose_option kind=lab_followup
      return {
        schema_version: '0.1',
        source: 'semantic_judgment',
        adaptor: 'fake',
        degraded: false,
        error: null,
        actions: [
          {
            type: 'choose_option',
            payload: {
              kind: 'lab_followup',
              mode: 'single',
              confirm: false,
              options: [
                { code: 'upload', label: '上傳報告', maps_to: 'ask_report' },
                { code: 'checkup', label: '我想檢查', maps_to: 'offer_checkup' }
              ],
              selected: [],
              gap_code: null,
              answer_type: null,
              exclusive_codes: []
            }
          }
        ]
      }
    }
    if (mode === 'lab_followup_stale') {
      return mockStaleReportLabFollowupReplyActions()
    }
    if (mode === 'consultation_goals') {
      return mockConsultationGoalsReplyActions()
    }
    if (mode === 'none') {
      return {
        schema_version: '0.1',
        source: 'semantic_judgment',
        adaptor: 'fake',
        degraded: false,
        error: null,
        actions: [{ type: 'none' }]
      }
    }
    if (mode === 'ask_vitals') {
      return {
        schema_version: '0.1',
        source: 'semantic_judgment',
        adaptor: 'fake',
        degraded: false,
        error: null,
        actions: [
          { type: 'ask_vitals', payload: { fields: ['age', 'height', 'weight'], gap_code: 'age' } }
        ]
      }
    }
    if (mode === 'intake_hybrid') {
      if (!hybridSexAnswered) {
        return {
          schema_version: '0.1',
          source: 'questionnaire',
          adaptor: 'fake',
          degraded: false,
          error: null,
          actions: [
            {
              type: 'choose_option',
              payload: {
                kind: 'profile',
                mode: 'single',
                confirm: false,
                gap_code: 'sex',
                answer_type: 'enum',
                options: [
                  { code: 'M', label: '男' },
                  { code: 'F', label: '女' }
                ]
              }
            }
          ]
        }
      }
      return {
        schema_version: '0.1',
        source: 'questionnaire',
        adaptor: 'fake',
        degraded: false,
        error: null,
        actions: [
          { type: 'ask_vitals', payload: { fields: ['age', 'height', 'weight'], gap_code: 'age' } }
        ]
      }
    }
    if (mode === 'degraded') {
      return {
        schema_version: '0.1',
        source: 'semantic_judgment',
        adaptor: 'fake',
        degraded: true,
        error: 'timeout',
        actions: [{ type: 'none' }]
      }
    }
    return null
  }

  /** GET history — only returns transcript when replyActions mock mode is set. */
  await page.route(`**/api/v1/conversation/${conversationId}/messages`, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback()
      return
    }
    const url = route.request().url()
    if (url.includes('/messages/stream')) {
      await route.fallback()
      return
    }
    // Unselected-path entry: hydrate greeting + path_switch a／b／c (core #133).
    if (mockEntryPathSelected == null) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            conversation_id: conversationId,
            path: null,
            messages: [{
              id: 'greet-e2e',
              role: 'assistant',
              content: `${FLOW_V2_GREETING_CONSULT}\n\n想先從哪裡開始？`,
              options: [],
              turn: { type: 'message' },
              profile_question: null,
              profile_gaps: [],
              reply_actions: entryPathSwitchReplyActions
            }]
          }
        })
      })
      return
    }
    if (!options.replyActions) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            conversation_id: conversationId,
            path: mockEntryPath,
            messages: []
          }
        })
      })
      return
    }
    const replyActions = buildReplyActionsPayload(options.replyActions)
    // Hybrid: bank gap CTA content must match stream copy so answers→hydrate→skip-stream
    // still satisfies e2e text assertions (sex / vitals).
    let assistantContent = '依報告來看，基礎保養會是合適起點。'
    let assistantOptions: Array<{ code: string, label: string }> = options.replyActions !== 'degraded'
      && options.replyActions !== 'consultation_goals'
      && options.replyActions !== 'lab_followup_stale'
      ? [{ code: 'legacy_chip', label: '舊選項' }]
      : []
    let profileGaps: string[] = []
    if (options.replyActions === 'consultation_goals') {
      assistantContent = '先選您想改善的健康方向。'
      assistantOptions = []
    } else if (options.replyActions === 'lab_followup_stale') {
      assistantContent = '這份報告日期較舊，您可以上傳新報告、繼續諮詢，或安排血檢。'
      assistantOptions = []
    } else if (options.replyActions === 'intake_hybrid' && goalsSet) {
      if (!hybridSexAnswered) {
        assistantContent = '請問您的生理性別？'
        assistantOptions = [
          { code: 'M', label: '男' },
          { code: 'F', label: '女' }
        ]
        profileGaps = ['sex', 'age', 'height', 'weight']
      } else {
        assistantContent = '接著請補充年紀、身高與體重。'
        assistantOptions = []
        profileGaps = ['age', 'height', 'weight']
      }
    } else if (options.replyActions === 'ask_vitals') {
      assistantContent = '接著請補充年紀、身高與體重。'
      assistantOptions = [{ code: 'legacy_chip', label: '舊選項' }]
      profileGaps = ['age', 'height', 'weight']
    }
    const assistant: Record<string, unknown> = {
      id: 'msg-history-assistant',
      role: 'assistant',
      content: assistantContent,
      options: assistantOptions,
      turn: { type: 'message' },
      profile_question: null,
      profile_gaps: profileGaps,
      upload_offer: options.replyActions === 'ask_report' || options.replyActions === 'degraded',
      // checkup_offer only when a dedicated conflict test opts in.
      checkup_offer: Boolean(options.legacyCheckupOfferConflict),
      reply_actions: replyActions
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          conversation_id: conversationId,
          // Optional until core adds path; FE sync uses it after A→B continue-health.
          path: mockEntryPath,
          messages: [
            {
              id: 'msg-history-user',
              role: 'user',
              content: '請依報告給建議'
            },
            assistant
          ]
        }
      })
    })
  })

  await page.route(`**/api/v1/conversation/${conversationId}/messages/stream`, async (route) => {
    streamCount += 1
    chatFlowTurnCount += 1

    const streamBody = route.request().postDataJSON() as { content?: string } | null
    const streamText = typeof streamBody?.content === 'string' ? streamBody.content : ''

    // Path C upload ack failure: keep flow_prompt CTAs on the prior assistant bubble.
    if (options.failReportUploadedAckStream && streamText.includes('我的報告已上傳')) {
      const body = [
        'event: error',
        `data: ${JSON.stringify({ error: { code: 'stream_error', message: 'ack failed' } })}`,
        '',
        ''
      ].join('\n')
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body })
      return
    }

    // Path B entry / Path C post-attach ack: first stream carries consultation_goals
    // (create greeting has no goals; FE must not paint goals from GET next).
    // Only steal when the user message is an entry／attach ack — do not intercept
    // replyActions／profileQuiz follow-ups (e.g. lab_report=none →「無」+ after_answer).
    // Old-report attach may instead echo lab_followup_stale on the ack stream.
    const isEntryOrUploadAck = streamText === '我想聊聊'
      || streamText === '我想諮詢健康方案'
      || streamText === '幫我看報告'
      || streamText === '我的報告已上傳'
    if ((mockEntryPath === 'b' || mockEntryPath === 'c') && !goalsSet && isEntryOrUploadAck) {
      if (mockEntryPath === 'c' && options.attachFlowPromptRa === 'lab_followup_stale') {
        const content = '這份報告日期較舊，您可以上傳新報告、繼續諮詢，或安排血檢。'
        const donePayload = {
          message_id: `msg-e2e-stale-${streamCount}`,
          claim_guard: 'passed',
          content,
          options: [],
          turn: { type: 'message' },
          profile_question: null,
          external: null,
          profile_gaps: [],
          reply_actions: mockStaleReportLabFollowupReplyActions()
        }
        const body = [
          'event: delta',
          `data: ${JSON.stringify({ text: content })}`,
          '',
          'event: done',
          `data: ${JSON.stringify(donePayload)}`,
          '',
          ''
        ].join('\n')
        await route.fulfill({ status: 200, contentType: 'text/event-stream', body })
        return
      }
      const content = mockEntryPath === 'c'
        ? '報告已收到，先選您想改善的健康方向。'
        : '先選您想改善的健康方向。'
      const donePayload = {
        message_id: `msg-e2e-goals-${streamCount}`,
        claim_guard: 'passed',
        content,
        options: goalOptions,
        options_kind: 'consultation_goals',
        turn: { type: 'message' },
        profile_question: null,
        external: null,
        profile_gaps: [],
        reply_actions: mockConsultationGoalsReplyActions()
      }
      const body = [
        'event: delta',
        `data: ${JSON.stringify({ text: content })}`,
        '',
        'event: done',
        `data: ${JSON.stringify(donePayload)}`,
        '',
        ''
      ].join('\n')
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body })
      return
    }

    const completionGroupRa = {
      schema_version: '0.1',
      source: 'semantic_judgment',
      adaptor: 'fake',
      degraded: false,
      error: null,
      actions: [
        {
          type: 'offer_recommend',
          payload: {
            mode: 'view_recommendations',
            label: '查看推薦方案',
            path: '/app/recommendations'
          }
        },
        {
          type: 'choose_option',
          payload: {
            kind: 'continue_consultation',
            mode: 'single',
            confirm: false,
            options: [{ code: 'continue', label: '繼續健康諮詢' }],
            selected: [],
            gap_code: null,
            answer_type: null,
            exclusive_codes: []
          }
        },
        ...(mockEntryPath === 'b'
          ? [{ type: 'offer_checkup', payload: { url: 'https://example.test/checkup' } }]
          : [])
      ]
    }

    if (options.chatFlowV2 === 'a-guide-15' && mockEntryPath === 'a') {
      const guide = chatFlowTurnCount >= 15
      const reply_actions = guide
        ? {
            schema_version: '0.1',
            source: 'rule',
            adaptor: 'rule',
            degraded: false,
            error: null,
            actions: [
              {
                type: 'choose_option',
                payload: {
                  kind: 'open_question_reply',
                  mode: 'single',
                  confirm: false,
                  options: [
                    { code: 'no_more', label: '我沒有問題了' },
                    { code: 'suggest', label: '你有什麼建議' }
                  ],
                  selected: [],
                  gap_code: null,
                  answer_type: null,
                  exclusive_codes: []
                }
              },
              { type: 'offer_checkup', payload: { url: 'https://example.test/checkup' } },
              {
                type: 'choose_option',
                payload: {
                  kind: 'path_switch',
                  mode: 'single',
                  confirm: false,
                  // Empty label: FE fills chat.pathSwitchToConsult (not code "b").
                  options: [{ code: 'b', label: '' }],
                  selected: [],
                  gap_code: null,
                  answer_type: null,
                  exclusive_codes: []
                }
              }
            ]
          }
        : {
            schema_version: '0.1',
            source: 'semantic_judgment',
            adaptor: 'fake',
            degraded: false,
            error: null,
            actions: [{ type: 'none' }]
          }
      const content = guide
        ? '若想取得專屬保健品方案，可以繼續諮詢健康方案。'
        : `聊聊第 ${chatFlowTurnCount} 輪`
      const donePayload = {
        message_id: `msg-v2-a-${chatFlowTurnCount}`,
        claim_guard: 'passed',
        content,
        options: [],
        turn: { type: 'message' },
        profile_question: null,
        external: null,
        profile_gaps: [],
        reply_actions
      }
      const body = [
        'event: delta',
        `data: ${JSON.stringify({ text: content })}`,
        '',
        'event: done',
        `data: ${JSON.stringify(donePayload)}`,
        '',
        ''
      ].join('\n')
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body })
      return
    }

    if (options.chatFlowV2 === 'turn-limit-20' && chatFlowTurnCount >= 20) {
      const content = mockEntryPath === 'a'
        ? '這個對話已到上限，請開啟新對話或是進行您的健康諮詢'
        : '這個對話已到上限，請開啟新對話或是繼續您的健康諮詢'
      const reply_actions = mockEntryPath === 'a'
        ? {
            schema_version: '0.1',
            source: 'rule',
            adaptor: 'rule',
            degraded: false,
            error: null,
            actions: [
              {
                type: 'choose_option',
                payload: {
                  kind: 'path_switch',
                  mode: 'single',
                  confirm: false,
                  // Solo path_switch: empty label → FE i18n pathSwitchToConsult
                  options: [{ code: 'b', label: '' }],
                  selected: [],
                  gap_code: null,
                  answer_type: null,
                  exclusive_codes: []
                }
              },
              { type: 'offer_checkup', payload: {} }
            ]
          }
        : completionGroupRa
      const donePayload = {
        message_id: `msg-v2-limit-${chatFlowTurnCount}`,
        claim_guard: 'passed',
        content,
        options: [],
        turn: { type: 'message' },
        profile_question: null,
        external: null,
        profile_gaps: [],
        reply_actions
      }
      const body = [
        'event: delta',
        `data: ${JSON.stringify({ text: content })}`,
        '',
        'event: done',
        `data: ${JSON.stringify(donePayload)}`,
        '',
        ''
      ].join('\n')
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body })
      return
    }

    if (options.chatFlowV2 === 'b-completion' && goalsSet && mockEntryPath === 'b') {
      const content = '依目前資料可以為您規劃專屬方案。'
      const donePayload = {
        message_id: `msg-v2-b-${streamCount}`,
        claim_guard: 'passed',
        content,
        options: [],
        turn: { type: 'message' },
        profile_question: null,
        external: null,
        profile_gaps: [],
        reply_actions: completionGroupRa
      }
      const body = [
        'event: delta',
        `data: ${JSON.stringify({ text: content })}`,
        '',
        'event: done',
        `data: ${JSON.stringify(donePayload)}`,
        '',
        ''
      ].join('\n')
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body })
      return
    }

    // core #135 triad asking summary: open_question_reply + continue_consultation + completion CTA
    if (options.chatFlowV2 === 'b-triad-asking' && goalsSet && mockEntryPath === 'b') {
      const content = '目前整理如下，還有想釐清的嗎？'
      const donePayload = {
        message_id: `msg-v2-b-triad-${streamCount}`,
        claim_guard: 'passed',
        content,
        options: [],
        turn: { type: 'message' },
        profile_question: null,
        external: null,
        profile_gaps: [],
        reply_actions: {
          schema_version: '0.1',
          source: 'semantic_judgment',
          adaptor: 'rule',
          degraded: false,
          error: null,
          actions: [
            {
              type: 'offer_recommend',
              payload: {
                mode: 'view_recommendations',
                label: '查看推薦方案',
                path: '/app/recommendations'
              }
            },
            { type: 'ask_report', payload: {} },
            {
              type: 'choose_option',
              payload: {
                kind: 'open_question_reply',
                mode: 'single',
                confirm: false,
                options: [
                  { code: 'no_more', label: '我沒有問題了' },
                  { code: 'suggest', label: '你有什麼建議' }
                ],
                selected: [],
                gap_code: null,
                answer_type: null,
                exclusive_codes: []
              }
            },
            {
              type: 'choose_option',
              payload: {
                kind: 'continue_consultation',
                mode: 'single',
                confirm: false,
                options: [{ code: 'continue', label: '繼續健康諮詢' }],
                selected: [],
                gap_code: null,
                answer_type: null,
                exclusive_codes: []
              }
            },
            { type: 'offer_checkup', payload: { url: 'https://example.test/checkup' } }
          ]
        }
      }
      const body = [
        'event: delta',
        `data: ${JSON.stringify({ text: content })}`,
        '',
        'event: done',
        `data: ${JSON.stringify(donePayload)}`,
        '',
        ''
      ].join('\n')
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body })
      return
    }

    if (options.chatFlowV2 === 'c-completion' && goalsSet && mockEntryPath === 'c') {
      const content = '依報告與問卷可以規劃專屬方案。'
      const donePayload = {
        message_id: `msg-v2-c-${streamCount}`,
        claim_guard: 'passed',
        content,
        options: [],
        turn: { type: 'message' },
        profile_question: null,
        external: null,
        profile_gaps: [],
        reply_actions: {
          ...completionGroupRa,
          actions: completionGroupRa.actions.filter(a => a.type !== 'offer_checkup')
        }
      }
      const body = [
        'event: delta',
        `data: ${JSON.stringify({ text: content })}`,
        '',
        'event: done',
        `data: ${JSON.stringify(donePayload)}`,
        '',
        ''
      ].join('\n')
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body })
      return
    }

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

    // Default completion CTA: when no replyActions mode, still attach usable
    // offer_recommend (plan_offer / legacy upload_offer must not invent recommend).
    if (!options.replyActions) {
      donePayload = {
        ...donePayload,
        reply_actions: {
          schema_version: '0.1',
          source: 'semantic_judgment',
          adaptor: 'fake',
          degraded: false,
          error: null,
          actions: [{
            type: 'offer_recommend',
            payload: {
              mode: 'view_recommendations',
              label: '查看推薦方案',
              path: '/app/recommendations'
            }
          }]
        }
      }
    }

    if (options.replyActions === 'ask_vitals') {
      donePayload = {
        message_id: `msg-e2e-${streamCount}`,
        claim_guard: 'passed',
        content: '接著請補充年紀、身高與體重。',
        options: [],
        turn: { type: 'message' },
        profile_question: null,
        external: null,
        profile_gaps: ['age', 'height', 'weight']
      }
    } else if (options.replyActions === 'intake_hybrid' && goalsSet) {
      if (!hybridSexAnswered) {
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
          profile_gaps: ['sex', 'age', 'height', 'weight']
        }
      } else {
        donePayload = {
          message_id: `msg-e2e-${streamCount}`,
          claim_guard: 'passed',
          content: '接著請補充年紀、身高與體重。',
          options: [],
          turn: { type: 'message' },
          profile_question: null,
          external: null,
          profile_gaps: ['age', 'height', 'weight']
        }
      }
    } else if (options.profileQuiz && goalsSet && !quizAnswered) {
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
    } else if (options.profileQuiz && goalsSet && quizAnswered && streamCount <= 3) {
      // Allow streamCount 3: entry path select may consume stream #1 for goals,
      // then goals→sex (#2), sex→follow-up chips (#3).
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

    if (options.replyActions) {
      const replyActions = buildReplyActionsPayload(options.replyActions)
      const paintLegacyConflict = options.replyActions === 'offer_recommend'
        || options.replyActions === 'ask_report'
        || options.replyActions === 'ask_vitals'
      donePayload = {
        ...donePayload,
        options: paintLegacyConflict
          ? [{ code: 'legacy_chip', label: '舊選項' }]
          : (options.replyActions === 'degraded' || options.replyActions === 'none'
              ? []
              : donePayload.options),
        // Legacy offer flags kept only to assert FE does **not** paint from them.
        upload_offer: options.replyActions === 'ask_report'
          || options.replyActions === 'degraded'
          || options.replyActions === 'none',
        // checkup_offer only when a dedicated conflict test opts in.
        checkup_offer: Boolean(options.legacyCheckupOfferConflict),
        reply_actions: replyActions
      }
    }

    // Mirror core stripOfferRecommend on path A — FE no longer hides by path.
    if (mockEntryPath === 'a' && donePayload.reply_actions
      && typeof donePayload.reply_actions === 'object') {
      const ra = donePayload.reply_actions as {
        actions?: Array<{ type?: string }>
      }
      if (Array.isArray(ra.actions)) {
        donePayload.reply_actions = {
          ...ra,
          actions: ra.actions.filter(action => action.type !== 'offer_recommend')
        }
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
    const method = route.request().method()
    const path = new URL(route.request().url()).pathname.replace(/\/$/, '')
    if (method === 'GET' && path.endsWith('/health-reports')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { reports: [] }
        })
      })
      return
    }
    if (method !== 'POST' || !path.endsWith('/health-reports')) {
      await route.fallback()
      return
    }
    const uploader = identityFromAuthHeader(route.request().headers().authorization ?? null)
    if (uploader?.user.role !== 'member') {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'failed',
          error_code: 'member_required',
          error_message: 'Member authentication required to upload reports.'
        })
      })
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

  await page.route('**/api/v1/profile', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/\/$/, '')
    if (!path.endsWith('/profile')) {
      await route.fallback()
      return
    }
    const method = route.request().method()
    if (method === 'DELETE') {
      resolvedBasicProfileComplete = false
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            sex: null,
            age_years: null,
            height_cm: null,
            weight_kg: null,
            diet: null,
            goals: []
          }
        })
      })
      return
    }
    if (method !== 'GET') {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: resolvedBasicProfileComplete
          ? {
              sex: 'F',
              age_years: 35,
              height_cm: 165,
              weight_kg: 55,
              diet: null,
              goals: asMember ? ['sleep', 'immune_boost'] : []
            }
          : {
              sex: null,
              age_years: null,
              height_cm: null,
              weight_kg: null,
              diet: null,
              goals: asMember ? ['sleep', 'immune_boost'] : []
            }
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
    const terminalStatus = options.reportTerminalStatus === 'needs_review'
      ? 'needs_review'
      : 'ready'
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          id: reportId,
          status: terminalStatus,
          page_count: 1,
          extraction_confidence: terminalStatus === 'needs_review' ? 0.55 : 0.9,
          results: [
            {
              id: 'result-e2e-1',
              raw_name: 'Vitamin D3',
              name_zh: '維生素 D3',
              name_zh_source: 'dictionary',
              raw_value: '31.8',
              value_numeric: 31.8,
              unit: 'ng/mL',
              ref_low: 50,
              ref_high: 80,
              needs_review: terminalStatus === 'needs_review',
              range_status: 'low',
              description: '維生素 D 與骨骼與免疫狀態相關的常見指標。',
              possible_causes: '偏低可能與日照不足或攝取不足有關。',
              possible_risks: '偏低時部分人可能需要留意相關健康狀態。'
            },
            {
              id: 'result-e2e-2',
              raw_name: 'Vitamin B12',
              name_zh: '維生素 B12',
              name_zh_source: 'dictionary',
              raw_value: '1275',
              value_numeric: 1275,
              unit: 'pg/mL',
              ref_low: 800,
              ref_high: 1200,
              needs_review: false,
              range_status: 'high',
              description: '維生素 B12 是常見營養相關檢驗指標。',
              possible_causes: '偏高可能與補充劑使用或檢測條件有關。',
              possible_risks: '偏高時部分人可能需要留意相關健康狀態。'
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
    const body = route.request().postDataJSON() as { gap_code?: string } | null
    // Hybrid trap: answers still returns a non-done next_question (age int) like
    // live beta. FE must stream anyway and take ask_vitals from reply_actions —
    // not present a local bank bubble without CTA.
    if (options.replyActions === 'intake_hybrid' && body?.gap_code === 'sex') {
      hybridSexAnswered = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            saved: true,
            profile_gaps: ['age', 'height', 'weight'],
            next_question: {
              done: false,
              gap_code: 'age',
              prompt: '請問您的年紀？',
              answer_type: 'int',
              options: []
            }
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
        data: { saved: true, profile_gaps: [], next_question: { done: true } }
      })
    })
  })

  await page.route('**/api/v1/orders', async (route) => {
    if (route.request().method() === 'POST') {
      if (options.questionnaireIncomplete) {
        const missingFields = Array.isArray(options.questionnaireIncomplete)
          ? options.questionnaireIncomplete
          : ['sex', 'age', 'height', 'weight']
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'failed',
            error_message: 'Basic profile fields are required: sex, age, height, weight.',
            error_code: 'questionnaire_incomplete',
            error_data: {
              missing_fields: missingFields,
              conversation_id: conversationId
            }
          })
        })
        return
      }
      if (options.conversationAlreadyOrdered) {
        const mode409 = options.conversationAlreadyOrdered
        const errorData: Record<string, unknown> = {
          conversation_id: conversationId,
          order_no: 'ORD-260101-000001'
        }
        if (mode409 !== 'missing_order') {
          errorData.order_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
        }
        if (mode409 === true) {
          errorData.expert_case_id = expertReviewId
        }
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'failed',
            error_message: 'Conversation already has a valid expert-plan order.',
            error_code: 'conversation_already_ordered',
            error_data: errorData
          })
        })
        return
      }
      if (options.expertPlanReuseMismatch) {
        let requestedCode = 'advance'
        try {
          const body = route.request().postDataJSON() as { expert_plan_code?: string } | null
          if (typeof body?.expert_plan_code === 'string' && body.expert_plan_code.trim()) {
            requestedCode = body.expert_plan_code.trim()
          }
        } catch {
          // ignore parse errors — keep default requested code
        }
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'failed',
            error_message: 'Requested expert plan does not match the unpaid order.',
            error_code: 'expert_plan_reuse_mismatch',
            error_data: {
              conversation_id: conversationId,
              order_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
              order_no: 'ORD-260101-000001',
              existing_expert_plan_code: 'basic',
              existing_expert_plan_price: 6000,
              requested_expert_plan_code: requestedCode
            }
          })
        })
        return
      }
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

  let refundRequestStatus: 'requested' | 'refunded' | 'rejected' | null = null

  await page.route('**/api/v1/order/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/message')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            conversation_id: conversationId,
            messages: [
              { id: 'om-1', role: 'assistant', content: '已依你的目標組成一個月方案。', seq: 1 },
              { id: 'om-2', role: 'user', content: '好，幫我下單。', seq: 2 }
            ]
          }
        })
      })
      return
    }
    if (url.includes('/refund-request') && route.request().method() === 'POST') {
      refundRequestStatus = 'requested'
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            id: 'rr-1',
            order_id: placedOrder?.id ?? 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
            status: 'requested',
            refund_request_status: 'requested',
            refund_request_display: '退款申請中'
          }
        })
      })
      return
    }
    if (url.includes('/payment') || url.includes('/cancel')) {
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
              { id: 'c1', sellable_item_id: sellableVitD, sellable_item_code: 'vitamin_d', sellable_item_name: '維生素 D', unit_price: 9, daily_dose: 1, monthly_cost: 280, rank: 1, is_core: true, image_url: 'https://cdn.example/catalog/vitamin_d.png' },
              { id: 'c2', sellable_item_id: sellableIron, sellable_item_code: 'iron', sellable_item_name: '鐵蛋白調理', unit_price: 17, daily_dose: 1, monthly_cost: 520, rank: 2, is_core: false, image_url: null },
              { id: 'c3', sellable_item_id: sellableVitC, sellable_item_code: 'vitamin_c', sellable_item_name: '維生素 C', unit_price: 16, daily_dose: 1, monthly_cost: 480, rank: 3, is_core: false }
            ]
          },
          lines: placedOrder.package_plan_name?.includes('專家')
            ? [{ kind: 'expert_plan', expert_plan_code: 'basic', expert_plan_name: placedOrder.package_plan_name }]
            : [],
          recipient: { name: '林晏婷', phone: '0912345678', address: '台北市大安區', email: 'guest@example.com' },
          invoice_type: 'member',
          created_at: placedOrder.created_at,
          confirmed_at: placedOrder.payment_status === 'paid' ? placedOrder.created_at : null,
          payments: [],
          refund_request_status: refundRequestStatus,
          refund_status: refundRequestStatus,
          refund_request_display: refundRequestStatus === 'requested' ? '退款申請中' : null,
          refund_blocked_reason: (() => {
            if (refundRequestStatus === 'requested') {
              return 'refund_request_exists'
            }
            if (refundRequestStatus === 'rejected') {
              return 'refund_rejected'
            }
            if (!placedOrder.package_plan_name?.includes('專家')
              || placedOrder.payment_status !== 'paid') {
              return null
            }
            return null
          })(),
          expert_case_id: placedOrder.package_plan_name?.includes('專家') ? expertReviewId : null,
          expert_case_status: placedOrder.package_plan_name?.includes('專家') ? 'reviewed' : null,
          expert_case_phase: placedOrder.package_plan_name?.includes('專家') ? 'finalized' : null,
          expert_case_review: placedOrder.package_plan_name?.includes('專家')
            ? {
                id: expertReviewId,
                status: 'reviewed',
                conversation_id: conversationId
              }
            : null,
          refund_rejection_reason: refundRequestStatus === 'rejected' ? '不符合退款條件' : null,
          // Expert refund window: no shipment yet after finalize; AI demo keeps picking.
          shipment_status: placedOrder.package_plan_name?.includes('專家') ? null : 'picking'
        }
      })
    })
  })

  // Member inbox (candor-core #90). Guest → 403 member_required.
  const inboxRows: Array<{
    id: string
    type: string
    title: string
    body: string
    created_at: string
    read_at: string | null
    deep_link: string
  }> = asMember
    ? [
        {
          id: 'notif-expert-1',
          type: 'expert_review_completed',
          title: '專家已完成判讀定稿',
          body: '營養專家已確認您的健康報告判讀。可在「我的健康」查看。',
          created_at: '2026-10-25T14:20:00+08:00',
          read_at: null,
          deep_link: '/app'
        },
        {
          id: 'notif-welcome-1',
          type: 'member_registered',
          title: '歡迎加入 Candor',
          body: '建議先完善顯示名稱與常用收件。',
          created_at: '2026-10-24T10:00:00+08:00',
          read_at: null,
          deep_link: '/app/me'
        }
      ]
    : []

  await page.route('**/api/v1/notifications/unread-count', async (route) => {
    const identity = identityFromAuthHeader(route.request().headers().authorization ?? null)
    const user = identity?.user ?? sessionUser
    if (user.role !== 'member') {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'failed',
          error_message: 'Member required',
          error_code: 'member_required',
          error_data: null
        })
      })
      return
    }
    const unread = inboxRows.filter(row => !row.read_at).length
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { unread_count: unread }
      })
    })
  })

  await page.route('**/api/v1/notifications/*/read', async (route) => {
    const identity = identityFromAuthHeader(route.request().headers().authorization ?? null)
    const user = identity?.user ?? sessionUser
    if (user.role !== 'member') {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'failed',
          error_message: 'Member required',
          error_code: 'member_required',
          error_data: null
        })
      })
      return
    }
    const url = route.request().url()
    const match = url.match(/\/notifications\/([^/]+)\/read/)
    const id = match?.[1] ? decodeURIComponent(match[1]) : ''
    const row = inboxRows.find(item => item.id === id)
    const readAt = new Date().toISOString()
    if (row && !row.read_at) {
      row.read_at = readAt
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { id, read_at: row?.read_at ?? readAt }
      })
    })
  })

  await page.route('**/api/v1/notifications', async (route) => {
    const identity = identityFromAuthHeader(route.request().headers().authorization ?? null)
    const user = identity?.user ?? sessionUser
    if (user.role !== 'member') {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'failed',
          error_message: 'Member required',
          error_code: 'member_required',
          error_data: null
        })
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { notifications: inboxRows }
      })
    })
  })
}
