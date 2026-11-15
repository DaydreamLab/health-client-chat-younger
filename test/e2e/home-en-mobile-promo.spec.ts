import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

const PROMO_TITLES = [
  'Hemagenics iron protein complex',
  'Iron glycinate',
  'Active B complex'
] as const

test('EN home at 390px: promo titles fully visible and pace last line shown', async ({ page, goto }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await mockCandorAuth(page)
  await goto('/en/', { waitUntil: 'hydration' })

  const carousel = page.getByTestId('home-carousel')
  await expect(carousel).toBeVisible()
  await carousel.scrollIntoViewIfNeeded()
  await carousel.hover()

  const dots = carousel.locator('[data-slot="dot"]')
  await expect(dots).toHaveCount(PROMO_TITLES.length)

  for (let i = 0; i < PROMO_TITLES.length; i++) {
    const title = PROMO_TITLES[i]!
    await dots.nth(i).click()
    await expect(carousel.getByTestId('home-promo-title').filter({ hasText: title }).first())
      .toBeVisible({ timeout: 10_000 })

    const metrics = await carousel.evaluate((root, expected) => {
      const titles = [...root.querySelectorAll('[data-testid="home-promo-title"]')] as HTMLElement[]
      const heading = titles.find((el) => {
        if (el.textContent?.trim() !== expected) {
          return false
        }
        const box = el.getBoundingClientRect()
        return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < window.innerHeight
      })
      if (!heading) {
        return null
      }
      const slide = heading.closest('[data-testid="home-promo-slide"]') as HTMLElement | null
      const copy = slide?.querySelector('[data-testid="home-promo-copy"]') as HTMLElement | null
      if (!slide || !copy) {
        return null
      }
      const copyBox = copy.getBoundingClientRect()
      const titleBox = heading.getBoundingClientRect()
      return {
        copyScrollHeight: copy.scrollHeight,
        copyClientHeight: copy.clientHeight,
        titleTop: titleBox.top,
        titleBottom: titleBox.bottom,
        copyTop: copyBox.top,
        copyBottom: copyBox.bottom
      }
    }, title)

    expect(metrics, `metrics for "${title}"`).not.toBeNull()
    expect(metrics!.copyScrollHeight, `"${title}" copy overflow`).toBeLessThanOrEqual(metrics!.copyClientHeight + 1)
    expect(metrics!.titleTop).toBeGreaterThanOrEqual(metrics!.copyTop - 1)
    expect(metrics!.titleBottom).toBeLessThanOrEqual(metrics!.copyBottom + 1)

    const textOverflow = await carousel.evaluate((root, expected) => {
      const titles = [...root.querySelectorAll('[data-testid="home-promo-title"]')] as HTMLElement[]
      const heading = titles.find((el) => {
        if (el.textContent?.trim() !== expected) {
          return false
        }
        const box = el.getBoundingClientRect()
        return box.width > 0 && box.height > 0
      })
      const slide = heading?.closest('[data-testid="home-promo-slide"]') as HTMLElement | null
      if (!slide) {
        return null
      }
      const nodes = [
        slide.querySelector('[data-testid="home-promo-title"]'),
        slide.querySelector('[data-testid="home-promo-audience"]'),
        slide.querySelector('[data-testid="home-promo-detail"]')
      ] as (HTMLElement | null)[]
      return nodes.map((el) => {
        if (!el) {
          return { ok: false }
        }
        return {
          ok: el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight
        }
      })
    }, title)
    expect(textOverflow).not.toBeNull()
    for (const row of textOverflow!) {
      expect(row.ok, `"${title}" child overflow ${JSON.stringify(row)}`).toBe(true)
    }
  }

  await page.getByTestId('home-trust').scrollIntoViewIfNeeded()
  await page.mouse.move(0, 0)
  for (let i = 0; i < 8; i++) {
    const key = await page.getByTestId('home-trust-slide').getAttribute('data-trust-key')
    if (key === 'pace') {
      break
    }
    await page.evaluate(() => {
      document.querySelector('.app-trust-progress')
        ?.dispatchEvent(new AnimationEvent('animationend', {
          animationName: 'app-trust-progress',
          bubbles: true
        }))
    })
  }
  await expect(page.getByTestId('home-trust-slide')).toHaveAttribute('data-trust-key', 'pace')
  const pace = page.getByTestId('home-trust-swatch')
  await expect(pace).toHaveAttribute('data-trust-frame', 'pace')
  const last = pace.getByTestId('home-trust-pace-last')
  await expect(last).toBeVisible()
  await expect(last).toHaveText('Trouble falling asleep')

  const paceMetrics = await pace.evaluate((root) => {
    const lastLine = root.querySelector('[data-testid="home-trust-pace-last"]') as HTMLElement | null
    if (!lastLine) {
      return null
    }
    const rootBox = root.getBoundingClientRect()
    const lastBox = lastLine.getBoundingClientRect()
    return {
      scrollHeight: root.scrollHeight,
      clientHeight: root.clientHeight,
      lastBottom: lastBox.bottom,
      rootBottom: rootBox.bottom,
      lastHeight: lastBox.height
    }
  })
  expect(paceMetrics).not.toBeNull()
  expect(paceMetrics!.lastHeight).toBeGreaterThan(0)
  expect(paceMetrics!.lastBottom).toBeLessThanOrEqual(paceMetrics!.rootBottom + 1)
  expect(paceMetrics!.scrollHeight).toBeLessThanOrEqual(paceMetrics!.clientHeight + 1)
})
