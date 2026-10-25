import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

test.describe('guest notifications', () => {
  test.beforeEach(async ({ page }) => {
    await mockCandorAuth(page)
  })

  test('guest sees H1 and dashed AuthGate on /app/notifications', async ({ page, goto }) => {
    await goto('/app/notifications', { waitUntil: 'hydration' })
    await expect(page.getByRole('heading', { name: '通知' })).toBeVisible()
    await expect(page.getByTestId('nav-notifications')).toBeVisible()
    await expect(page.getByTestId('notifications-auth-gate')).toBeVisible()
    await expect(page.getByTestId('notifications-list')).toHaveCount(0)
    await expect(page.getByTestId('notifications-login')).toBeVisible()
    await expect(page.getByTestId('notifications-register')).toBeVisible()
    await expect(page.getByTestId('notifications-back-chat')).toBeVisible()
    await expect(page.getByTestId('nav-logout')).toHaveCount(0)
    await expect(page.getByTestId('guest-login-rail')).toBeVisible()
    await page.getByTestId('notifications-login').click()
    await expect(page).toHaveURL(/\/login/)
    expect(page.url()).toContain('redirect=')
    expect(decodeURIComponent(new URL(page.url()).searchParams.get('redirect') || '')).toMatch(
      /\/app\/notifications/
    )
  })

  test('guest rail has notifications item without unread badge', async ({ page, goto }) => {
    await goto('/app/orders', { waitUntil: 'hydration' })
    await expect(page.getByTestId('nav-notifications')).toBeVisible()
    await expect(page.getByTestId('nav-notifications')).toContainText('通知')
    await expect(page.locator('[data-testid="nav-notifications"] .app-nav-count-badge')).toHaveCount(0)
    await expect(page.getByTestId('nav-notifications-badge-mobile')).toHaveCount(0)
  })
})

test.describe('member notifications', () => {
  test.beforeEach(async ({ page }) => {
    await mockCandorAuth(page, { asMember: true })
  })

  test('member sees sample list, filters, and rail unread badge', async ({ page, goto }) => {
    await goto('/app/notifications', { waitUntil: 'hydration' })
    await expect(page.getByTestId('notifications-auth-gate')).toHaveCount(0)
    await expect(page.getByTestId('notifications-sample-badge')).toBeVisible()
    await expect(page.getByTestId('notifications-list')).toBeVisible()
    await expect(page.getByTestId('notification-card-demo-notif-expert-finalized')).toBeVisible()
    await expect(page.getByTestId('notification-card-demo-notif-member-welcome')).toBeVisible()
    await expect(page.getByTestId('notification-card-demo-notif-expert-finalized')).toHaveAttribute(
      'data-read',
      'false'
    )
    await expect(page.getByText('已讀範例')).toHaveCount(0)

    await expect(page.getByTestId('notifications-filter-all')).toContainText('2')
    await expect(page.getByTestId('notifications-filter-unread')).toContainText('2')

    const railBadge = page.locator('[data-testid="nav-notifications"] .app-nav-count-badge')
    await expect(railBadge).toBeVisible()
    await expect(railBadge).toHaveText('2')
  })

  test('member can force empty with ?demo=empty and badge hides', async ({ page, goto }) => {
    await goto('/app/notifications?demo=empty', { waitUntil: 'hydration' })
    await expect(page.getByTestId('notifications-empty')).toBeVisible()
    await expect(page.getByTestId('notifications-empty')).toContainText('目前沒有通知')
    await expect(page.getByTestId('notifications-list')).toHaveCount(0)
    await expect(page.locator('[data-testid="nav-notifications"] .app-nav-count-badge')).toHaveCount(0)
  })

  test('row click marks read and deep-links; mark-all clears badge', async ({ page, goto }) => {
    await goto('/app/notifications', { waitUntil: 'hydration' })
    await page.getByTestId('notification-card-demo-notif-expert-finalized').click()
    await expect(page).toHaveURL(/\/app\/?$/)

    await goto('/app/notifications', { waitUntil: 'hydration' })
    await expect(page.getByTestId('notification-card-demo-notif-expert-finalized')).toHaveAttribute(
      'data-read',
      'true'
    )
    await expect(page.locator('[data-testid="nav-notifications"] .app-nav-count-badge')).toHaveText('1')

    await page.getByTestId('notifications-filter-unread').click()
    await expect(page.getByTestId('notification-card-demo-notif-expert-finalized')).toHaveCount(0)
    await expect(page.getByTestId('notification-card-demo-notif-member-welcome')).toBeVisible()

    await page.getByTestId('notifications-filter-all').click()
    await page.getByTestId('notifications-mark-all-read').click()
    await expect(page.locator('[data-testid="nav-notifications"] .app-nav-count-badge')).toHaveCount(0)
    await expect(page.getByTestId('notifications-mark-all-read')).toHaveCount(0)
  })

  test('welcome row deep-links to profile', async ({ page, goto }) => {
    await goto('/app/notifications', { waitUntil: 'hydration' })
    await page.getByTestId('notification-card-demo-notif-member-welcome').click()
    await expect(page).toHaveURL(/\/app\/me/)
  })

  test('mobile drawer shows count badge and hamburger red dot', async ({ page, goto }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await goto('/app/notifications', { waitUntil: 'hydration' })
    await expect(page.getByTestId('user-nav-toggle-unread-dot')).toBeVisible()
    await page.getByTestId('user-nav-toggle').click()
    await expect(page.getByTestId('nav-notifications-mobile')).toBeVisible()
    await expect(page.getByTestId('nav-notifications-badge-mobile')).toHaveText('2')
    await page.getByTestId('nav-notifications-mobile').click()
    await expect(page).toHaveURL(/\/app\/notifications/)
  })
})
