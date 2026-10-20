export interface HealthTrendChartPoint {
  key: string
  value: number
  label?: string
  /** When set, X-axis uses locale-aware weekday (Mon–Sun / 週一–週日) instead of `label`. */
  weekdayIndex?: number
}

export interface PlottedTrendPoint extends HealthTrendChartPoint {
  x: number
  y: number
}

export const HEALTH_TREND_CHART_WIDTH = 420
const baseHeight = 212
const padX = 28
const basePadTop = 48
const padBottom = 36

/** Show per-point value labels up to this many points; denser series rely on tooltips. */
export const HEALTH_TREND_VALUE_LABEL_MAX_POINTS = 7

const LABEL_LINE_HEIGHT = 13
const LABEL_MARGIN_TOP = 3
const LABEL_MIN_GAP_FROM_POINT = 11

export interface TrendValueLabelBox {
  index: number
  x: number
  y: number
  text: string
  above: boolean
  left: number
  right: number
  top: number
  bottom: number
}

export function plotHealthTrend(
  points: HealthTrendChartPoint[],
  extraPadTop = 0
): {
  plotted: PlottedTrendPoint[]
  linePoints: string
  areaPath: string
  padBottom: number
  padTop: number
  height: number
  width: number
} {
  if (points.length < 2) {
    throw new Error('Health trend chart requires at least two points')
  }
  const height = baseHeight + extraPadTop
  const padTop = basePadTop + extraPadTop
  const width = HEALTH_TREND_CHART_WIDTH
  const values = points.map(item => item.value)
  const min = Math.min(...values) - 8
  const max = Math.max(...values) + 4
  const plotted = points.map((item, index) => {
    const x = padX + (index / (points.length - 1)) * (width - padX * 2)
    const y = padTop + (1 - (item.value - min) / (max - min)) * (height - padTop - padBottom)
    return { ...item, x, y }
  })
  const linePoints = plotted.map(point => `${point.x},${point.y}`).join(' ')
  const areaPath = `M ${plotted[0]!.x} ${height - padBottom} L ${plotted.map(point => `${point.x} ${point.y}`).join(' L ')} L ${plotted.at(-1)!.x} ${height - padBottom} Z`
  return { plotted, linePoints, areaPath, padBottom, padTop, height, width }
}

export function estimateTrendLabelWidth(text: string, locale: string): number {
  const wideChar = locale === 'en' ? 5.4 : 8.8
  const narrowChar = 5.2
  let width = 6
  for (const ch of text) {
    width += ch.charCodeAt(0) > 0x2e7f ? wideChar : narrowChar
  }
  return width
}

function boxesOverlap(
  a: Pick<TrendValueLabelBox, 'left' | 'right' | 'top' | 'bottom'>,
  b: Pick<TrendValueLabelBox, 'left' | 'right' | 'top' | 'bottom'>
): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

export function layoutHealthTrendValueLabels(
  plotted: PlottedTrendPoint[],
  texts: string[],
  locale: string,
  chart: { height: number, padBottom: number }
): TrendValueLabelBox[] {
  const placed: TrendValueLabelBox[] = []
  const xAxisReserve = chart.padBottom + 18

  for (let index = 0; index < plotted.length; index++) {
    const point = plotted[index]!
    const text = texts[index] ?? ''
    const labelWidth = estimateTrendLabelWidth(text, locale)
    const half = labelWidth / 2
    const left = point.x - half
    const right = point.x + half

    const gaps = [12, 20, 28, 36]
    const candidates: Array<{ above: boolean, gap: number }> = []
    for (const gap of gaps) {
      candidates.push({ above: true, gap })
      candidates.push({ above: false, gap })
    }

    let chosen: TrendValueLabelBox | null = null
    for (const candidate of candidates) {
      const centerY = candidate.above
        ? point.y - candidate.gap - LABEL_LINE_HEIGHT / 2
        : point.y + candidate.gap + LABEL_LINE_HEIGHT / 2
      const top = centerY - LABEL_LINE_HEIGHT / 2
      const bottom = centerY + LABEL_LINE_HEIGHT / 2
      if (top < LABEL_MARGIN_TOP) {
        continue
      }
      if (bottom > chart.height - xAxisReserve) {
        continue
      }
      const box: TrendValueLabelBox = {
        index,
        x: point.x,
        y: centerY,
        text,
        above: candidate.above,
        left,
        right,
        top,
        bottom
      }
      if (placed.some(other => boxesOverlap(other, box))) {
        continue
      }
      chosen = box
      break
    }

    if (!chosen) {
      const centerY = Math.max(
        LABEL_MARGIN_TOP + LABEL_LINE_HEIGHT / 2,
        point.y - LABEL_MIN_GAP_FROM_POINT - LABEL_LINE_HEIGHT / 2
      )
      chosen = {
        index,
        x: point.x,
        y: centerY,
        text,
        above: true,
        left,
        right,
        top: centerY - LABEL_LINE_HEIGHT / 2,
        bottom: centerY + LABEL_LINE_HEIGHT / 2
      }
    }

    placed.push(chosen)
  }

  return placed
}

export function plotHealthTrendWithValueLabels(
  points: HealthTrendChartPoint[],
  texts: string[],
  locale: string
): {
  chart: ReturnType<typeof plotHealthTrend>
  valueLabels: TrendValueLabelBox[]
} {
  let extraPadTop = 0
  let chart = plotHealthTrend(points, extraPadTop)
  let valueLabels = layoutHealthTrendValueLabels(chart.plotted, texts, locale, chart)

  for (let attempt = 0; attempt < 8; attempt++) {
    const minTop = Math.min(...valueLabels.map(label => label.top))
    if (minTop >= LABEL_MARGIN_TOP) {
      break
    }
    extraPadTop += LABEL_MARGIN_TOP + LABEL_LINE_HEIGHT - minTop
    chart = plotHealthTrend(points, extraPadTop)
    valueLabels = layoutHealthTrendValueLabels(chart.plotted, texts, locale, chart)
  }

  return { chart, valueLabels }
}

/** @deprecated Use layoutHealthTrendValueLabels */
export function healthTrendValueLabelOffset(index: number, plotted: PlottedTrendPoint[]): number {
  const point = plotted[index]
  if (!point) {
    return 20
  }
  return index % 2 === 0 ? 22 : 30
}
