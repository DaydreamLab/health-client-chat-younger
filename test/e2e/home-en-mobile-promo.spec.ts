import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

const PROMO_TITLES = [
  'Hemagenics iron protein complex',
  'Iron glycinate',
  'Active B complex'
] as const

/** Wait until Embla transform stops changing (~300ms stable). */
async function waitCarouselSettled(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    const root = document.querySelector('[data-testid="home-carousel"]')
    if (!root) {
      return
    }
    const candidates = [...root.querySelectorAll('*')] as HTMLElement[]
    const el = candidates.find(node => (node.style.transform || '').includes('translate'))
      || candidates.find((node) => {
        const t = getComputedStyle(node).transform
        return t !== 'none' && t.includes('matrix')
      })
    if (!el) {
      await new Promise(resolve => setTimeout(resolve, 500))
      return
    }
    let stable = 0
    let last = el.style.transform || getComputedStyle(el).transform
    for (let i = 0; i < 50; i++) {
      await new Promise(resolve => setTimeout(resolve, 50))
      const cur = el.style.transform || getComputedStyle(el).transform
      if (cur === last) {
        stable++
        if (stable >= 6) {
          return
        }
      } else {
        stable = 0
        last = cur
      }
    }
  })
}

function findVisibleSlideMetrics() {
  return (root: Element, expected: string) => {
    const vw = window.innerWidth
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
    const audience = slide?.querySelector('[data-testid="home-promo-audience"]') as HTMLElement | null
    const detail = slide?.querySelector('[data-testid="home-promo-detail"]') as HTMLElement | null
    if (!slide || !copy || !audience || !detail) {
      return null
    }
    const slideBox = slide.getBoundingClientRect()
    const copyBox = copy.getBoundingClientRect()
    const titleBox = heading.getBoundingClientRect()
    const others = ([...root.querySelectorAll('[data-testid="home-promo-slide"]')] as HTMLElement[])
      .filter(node => node !== slide)
      .filter((node) => {
        const box = node.getBoundingClientRect()
        return box.width > 16 && box.right > 4 && box.left < vw - 4
      })
      .length
    return {
      vw,
      slideLeft: slideBox.left,
      slideRight: slideBox.right,
      others,
      copyScrollHeight: copy.scrollHeight,
      copyClientHeight: copy.clientHeight,
      titleTop: titleBox.top,
      titleBottom: titleBox.bottom,
      copyTop: copyBox.top,
      copyBottom: copyBox.bottom,
      audienceScrollWidth: audience.scrollWidth,
      audienceClientWidth: audience.clientWidth,
      detailScrollWidth: detail.scrollWidth,
      detailClientWidth: detail.clientWidth
    }
  }
}

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
    await waitCarouselSettled(page)

    const metrics = await carousel.evaluate(findVisibleSlideMetrics(), title)
    expect(metrics, `metrics for "${title}"`).not.toBeNull()
    expect(metrics!.others, `"${title}" must not show neighbor slides`).toBe(0)
    expect(metrics!.slideLeft, `"${title}" left edge`).toBeGreaterThanOrEqual(-2)
    expect(metrics!.slideLeft, `"${title}" left edge`).toBeLessThanOrEqual(2)
    expect(metrics!.slideRight, `"${title}" right edge`).toBeGreaterThanOrEqual(metrics!.vw - 2)
    expect(metrics!.slideRight, `"${title}" right edge`).toBeLessThanOrEqual(metrics!.vw + 2)
    expect(metrics!.copyScrollHeight, `"${title}" copy overflow`).toBeLessThanOrEqual(metrics!.copyClientHeight + 1)
    expect(metrics!.titleTop).toBeGreaterThanOrEqual(metrics!.copyTop - 1)
    expect(metrics!.titleBottom).toBeLessThanOrEqual(metrics!.copyBottom + 1)
    expect(metrics!.audienceScrollWidth, `"${title}" audience overflow`)
      .toBeLessThanOrEqual(metrics!.audienceClientWidth + 1)
    expect(metrics!.detailScrollWidth, `"${title}" detail overflow`)
      .toBeLessThanOrEqual(metrics!.detailClientWidth + 1)
  }

  // Slides 2 and 3 get an extra settled pass (user-reported mid-transition shots).
  for (const index of [1, 2] as const) {
    const title = PROMO_TITLES[index]!
    await dots.nth(index).click()
    await expect(carousel.getByTestId('home-promo-title').filter({ hasText: title }).first())
      .toBeVisible({ timeout: 10_000 })
    await waitCarouselSettled(page)
    const metrics = await carousel.evaluate(findVisibleSlideMetrics(), title)
    expect(metrics, `settled metrics for slide ${index + 1}`).not.toBeNull()
    expect(metrics!.others).toBe(0)
    expect(metrics!.slideLeft).toBeGreaterThanOrEqual(-2)
    expect(metrics!.slideLeft).toBeLessThanOrEqual(2)
    expect(metrics!.slideRight).toBeGreaterThanOrEqual(metrics!.vw - 2)
    expect(metrics!.slideRight).toBeLessThanOrEqual(metrics!.vw + 2)
    expect(metrics!.audienceScrollWidth).toBeLessThanOrEqual(metrics!.audienceClientWidth + 1)
    expect(metrics!.detailScrollWidth).toBeLessThanOrEqual(metrics!.detailClientWidth + 1)
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
  // Let trust-in fade finish before asserting layout.
  await page.waitForTimeout(400)
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
      lastHeight: lastBox.height,
      opacity: Number(getComputedStyle(root).opacity)
    }
  })
  expect(paceMetrics).not.toBeNull()
  expect(paceMetrics!.lastHeight).toBeGreaterThan(0)
  expect(paceMetrics!.lastBottom).toBeLessThanOrEqual(paceMetrics!.rootBottom + 1)
  expect(paceMetrics!.scrollHeight).toBeLessThanOrEqual(paceMetrics!.clientHeight + 1)
  expect(paceMetrics!.opacity).toBeGreaterThanOrEqual(0.99)
})
