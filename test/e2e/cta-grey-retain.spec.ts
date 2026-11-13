import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

/**
 * Design B v3 / core #186 — historical reply_actions stay visible with
 * selected／disabled tones; typing greys the current round.
 * All routes are stubbed (no live model).
 */
test.describe('CTA grey retain (design B v3)', () => {
  test('history: selected chip emphasized, others grey; vitals stored／empty', async ({
    page,
    goto
  }) => {
    test.setTimeout(90_000)
    const conversationId = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
    await mockCandorAuth(page, { asMember: true, replyActions: 'none' })
    await page.setViewportSize({ width: 390, height: 844 })

    await page.route(`**/api/v1/conversation/${conversationId}/messages`, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback()
        return
      }
      if (route.request().url().includes('/messages/stream')) {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            conversation_id: conversationId,
            path: 'b',
            messages: [
              {
                id: 'asst-path',
                role: 'assistant',
                content: '你想先從哪裡開始？',
                reply_actions: {
                  schema_version: '0.1',
                  source: 'path_entry',
                  adaptor: 'fake',
                  degraded: false,
                  error: null,
                  interaction: {
                    round_status: 'historical',
                    outcome: 'option_selected'
                  },
                  actions: [{
                    type: 'choose_option',
                    payload: {
                      kind: 'path_switch',
                      mode: 'single',
                      confirm: false,
                      options: [
                        { code: 'a', label: '我想聊聊', status: 'disabled' },
                        { code: 'b', label: '我想諮詢健康方案', status: 'selected' },
                        { code: 'c', label: '幫我看報告', status: 'disabled' }
                      ]
                    }
                  }]
                }
              },
              { id: 'u-path', role: 'user', content: '我想諮詢健康方案' },
              {
                id: 'asst-age-selected',
                role: 'assistant',
                content: '請問你的年紀是？',
                reply_actions: {
                  schema_version: '0.1',
                  interaction: {
                    round_status: 'historical',
                    outcome: 'option_selected'
                  },
                  actions: [{
                    type: 'ask_vitals',
                    payload: {
                      fields: ['age'],
                      gap_code: 'age',
                      status: 'selected',
                      has_stored_value: true,
                      stored_value: 36
                    }
                  }]
                }
              },
              { id: 'u-age', role: 'user', content: '36' },
              {
                id: 'asst-age-empty',
                role: 'assistant',
                content: '請問你的年紀是？',
                reply_actions: {
                  schema_version: '0.1',
                  interaction: {
                    round_status: 'historical',
                    outcome: 'free_text'
                  },
                  actions: [{
                    type: 'ask_vitals',
                    payload: {
                      fields: ['age'],
                      gap_code: 'age',
                      status: 'disabled',
                      has_stored_value: false,
                      stored_value: null
                    }
                  }]
                }
              },
              { id: 'u-skip', role: 'user', content: '我不太確定。' },
              {
                id: 'asst-current',
                role: 'assistant',
                content: '這次最想改善的是？',
                reply_actions: {
                  schema_version: '0.1',
                  interaction: {
                    round_status: 'current',
                    outcome: null
                  },
                  actions: [{
                    type: 'choose_option',
                    payload: {
                      kind: 'consultation_goals',
                      mode: 'multi',
                      confirm: true,
                      confirm_status: 'current',
                      options: [
                        { code: 'sleep', label: '睡眠', status: 'current' },
                        { code: 'energy', label: '精神元氣', status: 'current' },
                        { code: 'gi', label: '腸胃道', status: 'current' },
                        { code: 'weight_loss', label: '減重', status: 'current' }
                      ]
                    }
                  }]
                }
              }
            ]
          }
        })
      })
    })

    await page.addInitScript((journey) => {
      localStorage.setItem('candor.unpaid.journey', JSON.stringify(journey))
    }, {
      conversationId,
      messages: [{
        id: 'stale',
        role: 'assistant',
        parts: [{ type: 'text', text: 'stale' }]
      }],
      hasAnalysis: false,
      selectedPackageCode: null,
      reportId: null,
      reportDockOpen: false,
      reportDockCollapsed: true,
      reportInterpretSent: false,
      selectedPackage: null,
      packageConfirmed: false,
      goalSelectActive: false,
      goalOptions: [],
      selectedCodes: [],
      quizActive: false,
      activeQuestion: null,
      postQuizGuided: false,
      profileGaps: [],
      clarifyingGoals: [],
      expertReviewStatus: 'none',
      conversationPath: 'B'
    })

    await goto('/chat', { waitUntil: 'hydration' })

    const selectedChip = page.getByTestId('chat-quiz-option-b')
    await expect(selectedChip).toBeVisible({ timeout: 15_000 })
    await expect(selectedChip).toHaveAttribute('data-cta-status', 'selected')
    await expect(selectedChip).toBeDisabled()
    await expect(page.getByTestId('chat-quiz-option-a')).toHaveAttribute('data-cta-status', 'disabled')
    await expect(page.getByTestId('chat-quiz-option-a')).toBeDisabled()

    const selectedBg = await selectedChip.evaluate(el => getComputedStyle(el).backgroundColor)
    // #F0F7FA ≈ rgb(240, 247, 250)
    expect(selectedBg).toMatch(/240,\s*247,\s*250/)

    const greyChip = page.getByTestId('chat-quiz-option-a')
    const greyBg = await greyChip.evaluate(el => getComputedStyle(el).backgroundColor)
    // #F1F4F7 ≈ rgb(241, 244, 247)
    expect(greyBg).toMatch(/241,\s*244,\s*247/)

    await page.locator('[data-testid="chat-quiz-option-b"]').scrollIntoViewIfNeeded()
    await page.screenshot({
      path: '/opt/cursor/artifacts/cta-grey-retain-selected.png',
      fullPage: false
    })

    const storedCard = page.locator('[data-testid="chat-vitals-card"][data-has-stored-value="true"]').first()
    await expect(storedCard).toBeVisible()
    await expect(storedCard).toContainText('36')
    await expect(storedCard).toHaveAttribute('data-vitals-status', 'selected')
    await storedCard.scrollIntoViewIfNeeded()
    await page.screenshot({
      path: '/opt/cursor/artifacts/cta-grey-retain-vitals-stored.png',
      fullPage: false
    })

    const emptyCard = page.locator('[data-testid="chat-vitals-card"][data-has-stored-value="false"]').first()
    await expect(emptyCard).toBeVisible()
    await expect(emptyCard).toHaveAttribute('data-vitals-status', 'disabled')
    await expect(emptyCard).toHaveText('')
    await emptyCard.scrollIntoViewIfNeeded()
    await page.screenshot({
      path: '/opt/cursor/artifacts/cta-grey-retain-vitals-empty.png',
      fullPage: false
    })

    // Current goals chips are clickable until the user types.
    const currentSleep = page.getByTestId('chat-last-reply').getByTestId('chat-quiz-option-sleep')
    await expect(currentSleep).toBeEnabled()
    await expect(currentSleep).toHaveAttribute('data-cta-status', 'current')

    // Typing greys the current round.
    await page.getByTestId('chat-input').fill('想先了解可以怎麼調理')
    await expect(page.getByTestId('chat-turn-actions').last()).toHaveAttribute('data-composer-typing', 'true')
    await expect(currentSleep).toBeDisabled()
    await expect(currentSleep).toHaveAttribute('data-cta-status', 'disabled')
    await currentSleep.scrollIntoViewIfNeeded()
    await page.screenshot({
      path: '/opt/cursor/artifacts/cta-grey-retain-typing-grey.png',
      fullPage: false
    })

    // Free-text historical all-grey chips (path round already disabled).
    await page.getByTestId('chat-quiz-option-a').scrollIntoViewIfNeeded()
    await page.screenshot({
      path: '/opt/cursor/artifacts/cta-grey-retain-grey.png',
      fullPage: false
    })
  })

  test('POST answers includes source_message_id; 409 stale_cta reloads history', async ({
    page,
    goto
  }) => {
    test.setTimeout(90_000)
    const conversationId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    let historyLoads = 0
    let sawSourceMessageId = false

    await mockCandorAuth(page, { asMember: true, replyActions: 'none' })
    await page.setViewportSize({ width: 390, height: 844 })

    await page.route(`**/api/v1/conversation/${conversationId}/messages`, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback()
        return
      }
      if (route.request().url().includes('/messages/stream')) {
        await route.fallback()
        return
      }
      historyLoads += 1
      const historical = historyLoads > 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            conversation_id: conversationId,
            path: 'b',
            messages: [
              {
                id: 'asst-sex',
                role: 'assistant',
                content: '請問生理性別？',
                reply_actions: {
                  schema_version: '0.1',
                  interaction: historical
                    ? { round_status: 'historical', outcome: 'option_selected' }
                    : { round_status: 'current', outcome: null },
                  actions: [{
                    type: 'choose_option',
                    payload: {
                      kind: 'profile',
                      mode: 'single',
                      gap_code: 'sex',
                      answer_type: 'enum',
                      options: [
                        {
                          code: 'M',
                          label: '生理男',
                          status: historical ? 'selected' : 'current'
                        },
                        {
                          code: 'F',
                          label: '生理女',
                          status: historical ? 'disabled' : 'current'
                        }
                      ]
                    }
                  }]
                }
              },
              ...(historical
                ? [
                    { id: 'u-sex', role: 'user', content: '生理男' },
                    {
                      id: 'asst-next',
                      role: 'assistant',
                      content: '已記下。',
                      reply_actions: {
                        schema_version: '0.1',
                        interaction: { round_status: 'current', outcome: null },
                        actions: [{ type: 'none', payload: {} }]
                      }
                    }
                  ]
                : [])
            ]
          }
        })
      })
    })

    await page.route('**/api/v1/profile/answers', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback()
        return
      }
      const body = route.request().postDataJSON() as { source_message_id?: string }
      if (body.source_message_id === 'asst-sex') {
        sawSourceMessageId = true
      }
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'failed',
          error_message: 'CTA is stale.',
          error_code: 'stale_cta',
          error_data: null
        })
      })
    })

    await page.addInitScript((journey) => {
      localStorage.setItem('candor.unpaid.journey', JSON.stringify(journey))
    }, {
      conversationId,
      messages: [{
        id: 'stale',
        role: 'assistant',
        parts: [{ type: 'text', text: 'stale' }]
      }],
      hasAnalysis: false,
      selectedPackageCode: null,
      reportId: null,
      reportDockOpen: false,
      reportDockCollapsed: true,
      reportInterpretSent: false,
      selectedPackage: null,
      packageConfirmed: false,
      goalSelectActive: false,
      goalOptions: [],
      selectedCodes: [],
      quizActive: false,
      activeQuestion: null,
      postQuizGuided: false,
      profileGaps: ['sex'],
      clarifyingGoals: [],
      expertReviewStatus: 'none',
      conversationPath: 'B'
    })

    await goto('/chat', { waitUntil: 'hydration' })
    await expect(page.getByTestId('chat-quiz-option-M')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('chat-quiz-option-M').click()

    await expect.poll(() => sawSourceMessageId, { timeout: 10_000 }).toBe(true)
    // After 409, history reloads and selected state is retained (no crash).
    await expect(page.getByTestId('chat-quiz-option-M')).toHaveAttribute(
      'data-cta-status',
      'selected',
      { timeout: 15_000 }
    )
    await expect(page.getByTestId('chat-quiz-option-M')).toBeDisabled()
    expect(historyLoads).toBeGreaterThan(1)
  })

  for (const route of [
    { path: 'A' as const, code: 'a', label: '我想聊聊' },
    { path: 'C' as const, code: 'c', label: '幫我看報告' }
  ]) {
    test(`route ${route.path}: opening chips retained after settle (selected＋grey)`, async ({
      page,
      goto
    }) => {
      test.setTimeout(90_000)
      await mockCandorAuth(page, {
        asMember: true,
        conversationPath: null,
        basicProfileComplete: true,
        replyActions: 'none'
      })
      await page.setViewportSize({ width: 390, height: 844 })
      await goto('/', { waitUntil: 'hydration' })
      await page.evaluate(() => {
        localStorage.removeItem('candor.unpaid.journey')
      })
      await goto('/chat', { waitUntil: 'hydration' })
      await expect(page.getByTestId('chat-quiz-option-a')).toBeVisible({ timeout: 15_000 })

      await page.getByTestId(`chat-quiz-option-${route.code}`).click()

      const retained = page.locator(
        '[data-testid="chat-turn-actions"][data-round-status="historical"]'
      )
      const selected = retained.getByTestId(`chat-quiz-option-${route.code}`)
      await expect(selected).toBeVisible({ timeout: 15_000 })
      await expect(selected).toHaveAttribute('data-cta-status', 'selected')
      await expect(selected).toBeDisabled()
      await expect(selected).toHaveText(route.label)

      for (const other of ['a', 'b', 'c'].filter(code => code !== route.code)) {
        await expect(retained.getByTestId(`chat-quiz-option-${other}`)).toHaveAttribute(
          'data-cta-status',
          'disabled'
        )
        await expect(retained.getByTestId(`chat-quiz-option-${other}`)).toBeDisabled()
      }

      await retained.scrollIntoViewIfNeeded()
      await page.screenshot({
        path: `/opt/cursor/artifacts/cta-grey-retain-route-${route.code}-settled.png`,
        fullPage: false
      })
    })

    test(`route ${route.path}: opening chips retained after reload`, async ({
      page,
      goto
    }) => {
      test.setTimeout(90_000)
      // Avoid mock-candor-auth's fixed conversationId (aaaaaaaa-…).
      const conversationId = route.path === 'A'
        ? 'aa111111-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
        : 'cc333333-cccc-4ccc-8ccc-ccccccccccc3'
      await mockCandorAuth(page, { asMember: true, replyActions: 'none' })
      await page.setViewportSize({ width: 390, height: 844 })

      await page.route(`**/api/v1/conversation/${conversationId}/messages`, async (routeReq) => {
        if (routeReq.request().method() !== 'GET') {
          await routeReq.fallback()
          return
        }
        if (routeReq.request().url().includes('/messages/stream')) {
          await routeReq.fallback()
          return
        }
        await routeReq.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: {
              conversation_id: conversationId,
              path: route.code,
              messages: [
                {
                  id: `asst-open-${route.code}`,
                  role: 'assistant',
                  content: '想先從哪裡開始？',
                  reply_actions: {
                    schema_version: '0.1',
                    source: 'path_entry',
                    adaptor: 'fake',
                    degraded: false,
                    error: null,
                    interaction: {
                      round_status: 'historical',
                      outcome: 'option_selected'
                    },
                    actions: [{
                      type: 'choose_option',
                      payload: {
                        kind: 'path_switch',
                        mode: 'single',
                        confirm: false,
                        options: [
                          {
                            code: 'a',
                            label: '我想聊聊',
                            status: route.code === 'a' ? 'selected' : 'disabled'
                          },
                          {
                            code: 'b',
                            label: '我想諮詢健康方案',
                            status: 'disabled'
                          },
                          {
                            code: 'c',
                            label: '幫我看報告',
                            status: route.code === 'c' ? 'selected' : 'disabled'
                          }
                        ]
                      }
                    }]
                  }
                },
                {
                  id: `u-open-${route.code}`,
                  role: 'user',
                  content: route.label
                },
                {
                  id: `asst-follow-${route.code}`,
                  role: 'assistant',
                  content: route.path === 'C'
                    ? '請上傳血檢或健檢報告。'
                    : '好的，我們先聊聊。',
                  reply_actions: {
                    schema_version: '0.1',
                    interaction: { round_status: 'current', outcome: null },
                    actions: route.path === 'C'
                      ? [
                          { type: 'ask_report', payload: { option_codes: ['upload'] } },
                          {
                            type: 'choose_option',
                            payload: {
                              kind: 'path_switch',
                              mode: 'single',
                              confirm: false,
                              options: [
                                { code: 'a', label: '我想聊聊', status: 'current' },
                                { code: 'b', label: '我想諮詢健康方案', status: 'current' }
                              ]
                            }
                          }
                        ]
                      : [{ type: 'none', payload: {} }]
                  }
                }
              ]
            }
          })
        })
      })

      await page.addInitScript((journey) => {
        localStorage.setItem('candor.unpaid.journey', JSON.stringify(journey))
      }, {
        conversationId,
        messages: [{
          id: 'stale',
          role: 'assistant',
          parts: [{ type: 'text', text: 'stale' }]
        }],
        hasAnalysis: false,
        selectedPackageCode: null,
        reportId: null,
        reportDockOpen: false,
        reportDockCollapsed: true,
        reportInterpretSent: false,
        selectedPackage: null,
        packageConfirmed: false,
        goalSelectActive: false,
        goalOptions: [],
        selectedCodes: [],
        quizActive: false,
        activeQuestion: null,
        postQuizGuided: false,
        profileGaps: [],
        clarifyingGoals: [],
        expertReviewStatus: 'none',
        conversationPath: route.path
      })

      await goto('/chat', { waitUntil: 'hydration' })

      const retained = page.locator(
        '[data-testid="chat-turn-actions"][data-round-status="historical"]'
      )
      const selected = retained.getByTestId(`chat-quiz-option-${route.code}`)
      await expect(selected).toBeVisible({ timeout: 15_000 })
      await expect(selected).toHaveAttribute('data-cta-status', 'selected')
      await expect(selected).toBeDisabled()
      await expect(retained.getByTestId('chat-quiz-option-a')).toBeVisible()
      await expect(retained.getByTestId('chat-quiz-option-b')).toBeVisible()
      await expect(retained.getByTestId('chat-quiz-option-c')).toBeVisible()

      await retained.scrollIntoViewIfNeeded()
      await page.screenshot({
        path: `/opt/cursor/artifacts/cta-grey-retain-route-${route.code}-reload.png`,
        fullPage: false
      })
    })
  }
})
