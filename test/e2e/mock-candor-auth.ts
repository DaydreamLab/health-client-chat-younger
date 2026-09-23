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

/** Mock candor-core auth so e2e does not need a live API. */
export async function mockCandorAuth(page: Page) {
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
}
