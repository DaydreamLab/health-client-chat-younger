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
const baseHeight = 228
const padX = 28
const basePadTop = 52
const padBottom = 40

export const HEALTH_TREND_LINE_STROKE_WIDTH = 3
export const HEALTH_TREND_POINT_RADIUS = 4.5

/**
 * Keep plotted points above X-axis weekday/day labels (label baseline is
 * padBottom-relative + ~16; font ~11; circle radius extends below center).
 */
export const HEALTH_TREND_POINT_AXIS_CLEARANCE
  = HEALTH_TREND_POINT_RADIUS + 28

/** Show per-point value labels up to this many points; denser series rely on tooltips. */
export const HEALTH_TREND_VALUE_LABEL_MAX_POINTS = 7

/** Dense day series: show first, last, and every Nth day label. */
export const HEALTH_TREND_AXIS_LABEL_INTERVAL = 5

const LABEL_LINE_HEIGHT = 14
const LABEL_MARGIN_TOP = 4
const LABEL_POINT_CLEARANCE = 10
const LABEL_LINE_CLEARANCE = 5

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

interface Rect {
  left: number
  right: number
  top: number
  bottom: number
}

export function plotHealthTrend(
  points: HealthTrendChartPoint[],
  extraPadTop = 0,
  chartWidth = HEALTH_TREND_CHART_WIDTH
): {
  plotted: PlottedTrendPoint[]
  linePoints: string
  linePath: string
  pathLength: number
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
  const width = chartWidth
  const values = points.map(item => item.value)
  const min = Math.min(...values) - 10
  const max = Math.max(...values) + 6
  const plotBottom = height - padBottom - HEALTH_TREND_POINT_AXIS_CLEARANCE
  const plotSpan = Math.max(plotBottom - padTop, 1)
  const plotted = points.map((item, index) => {
    const x = padX + (index / (points.length - 1)) * (width - padX * 2)
    const y = padTop + (1 - (item.value - min) / (max - min)) * plotSpan
    return { ...item, x, y }
  })
  const linePoints = plotted.map(point => `${point.x},${point.y}`).join(' ')
  const linePath = buildTrendLinePath(plotted)
  const pathLength = measureTrendPathLength(plotted)
  const areaPath = `M ${plotted[0]!.x} ${height - padBottom} L ${plotted.map(point => `${point.x} ${point.y}`).join(' L ')} L ${plotted.at(-1)!.x} ${height - padBottom} Z`
  return { plotted, linePoints, linePath, pathLength, areaPath, padBottom, padTop, height, width }
}

export function buildTrendLinePath(plotted: PlottedTrendPoint[]): string {
  if (!plotted.length) {
    return ''
  }
  return `M ${plotted.map(point => `${point.x} ${point.y}`).join(' L ')}`
}

export function measureTrendPathLength(plotted: PlottedTrendPoint[]): number {
  let length = 0
  for (let index = 1; index < plotted.length; index++) {
    const prev = plotted[index - 1]!
    const next = plotted[index]!
    length += Math.hypot(next.x - prev.x, next.y - prev.y)
  }
  return Math.ceil(length + 24)
}

export function parseTrendLinePath(pathAttribute: string): Array<{ x: number, y: number }> {
  const numbers = pathAttribute.match(/-?\d*\.?\d+/g)?.map(Number) ?? []
  const vertices: Array<{ x: number, y: number }> = []
  for (let index = 0; index + 1 < numbers.length; index += 2) {
    const x = numbers[index]
    const y = numbers[index + 1]
    if (x === undefined || y === undefined) {
      continue
    }
    vertices.push({ x, y })
  }
  return vertices
}

export function parseTrendLinePoints(pointsAttribute: string): Array<{ x: number, y: number }> {
  return pointsAttribute
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((pair) => {
      const [rawX, rawY] = pair.split(',')
      return { x: Number(rawX), y: Number(rawY) }
    })
}

export function assertTrendLineMatchesPoints(
  lineVertices: Array<{ x: number, y: number }>,
  plotted: PlottedTrendPoint[]
): void {
  if (lineVertices.length !== plotted.length) {
    throw new Error(`Trend line has ${lineVertices.length} vertices, expected ${plotted.length}`)
  }
  for (let index = 0; index < plotted.length; index++) {
    const vertex = lineVertices[index]!
    const point = plotted[index]!
    if (Math.hypot(vertex.x - point.x, vertex.y - point.y) > 0.5) {
      throw new Error(`Trend line vertex ${index} does not match plotted point`)
    }
  }
  const last = lineVertices.at(-1)!
  const lastPoint = plotted.at(-1)!
  if (Math.hypot(last.x - lastPoint.x, last.y - lastPoint.y) > 0.5) {
    throw new Error('Trend line does not reach the final data point')
  }
}

export function estimateTrendLabelWidth(text: string, locale: string): number {
  const wideChar = locale === 'en' ? 5.6 : 9.2
  const narrowChar = 5.4
  let width = 8
  for (const ch of text) {
    width += ch.charCodeAt(0) > 0x2e7f ? wideChar : narrowChar
  }
  return width
}

export function boxesOverlap(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

export function circleIntersectsRect(cx: number, cy: number, radius: number, rect: Rect): boolean {
  const closestX = Math.max(rect.left, Math.min(cx, rect.right))
  const closestY = Math.max(rect.top, Math.min(cy, rect.bottom))
  const dx = cx - closestX
  const dy = cy - closestY
  return dx * dx + dy * dy < radius * radius
}

export function segmentIntersectsRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thickness: number,
  rect: Rect
): boolean {
  const steps = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 2))
  for (let step = 0; step <= steps; step++) {
    const t = step / steps
    const px = x1 + (x2 - x1) * t
    const py = y1 + (y2 - y1) * t
    const halo: Rect = {
      left: px - thickness,
      right: px + thickness,
      top: py - thickness,
      bottom: py + thickness
    }
    if (boxesOverlap(halo, rect)) {
      return true
    }
  }
  return false
}

export function trendLabelCollidesWithGeometry(
  box: Rect,
  plotted: PlottedTrendPoint[],
  strokeWidth = HEALTH_TREND_LINE_STROKE_WIDTH
): boolean {
  const lineThickness = strokeWidth / 2 + LABEL_LINE_CLEARANCE
  const pointRadius = HEALTH_TREND_POINT_RADIUS + strokeWidth / 2 + LABEL_POINT_CLEARANCE

  for (const point of plotted) {
    if (circleIntersectsRect(point.x, point.y, pointRadius, box)) {
      return true
    }
  }
  for (let i = 0; i < plotted.length - 1; i++) {
    const a = plotted[i]!
    const b = plotted[i + 1]!
    if (segmentIntersectsRect(a.x, a.y, b.x, b.y, lineThickness, box)) {
      return true
    }
  }
  return false
}

export function assertTrendValueLabelsClear(
  labels: TrendValueLabelBox[],
  plotted: PlottedTrendPoint[],
  chartHeight: number
): void {
  for (const label of labels) {
    if (label.top < LABEL_MARGIN_TOP) {
      throw new Error(`Label ${label.index} clipped at top`)
    }
    if (label.bottom > chartHeight - 4) {
      throw new Error(`Label ${label.index} clipped at bottom`)
    }
    if (trendLabelCollidesWithGeometry(label, plotted)) {
      throw new Error(`Label ${label.index} collides with line or point`)
    }
  }
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      if (boxesOverlap(labels[i]!, labels[j]!)) {
        throw new Error(`Labels ${labels[i]!.index} and ${labels[j]!.index} overlap`)
      }
    }
  }
}

function chartWidthForLocale(locale: string, metric?: string): number {
  if (metric === 'steps') {
    return locale === 'en' ? 560 : 580
  }
  return locale === 'en' ? 460 : 520
}

export function layoutHealthTrendValueLabels(
  plotted: PlottedTrendPoint[],
  texts: string[],
  locale: string,
  chart: { height: number, padBottom: number }
): TrendValueLabelBox[] {
  const placed: TrendValueLabelBox[] = []
  const xAxisReserve = chart.padBottom + 20
  const gaps = [16, 24, 32, 42, 52, 62]
  const xShifts = [-36, -24, -12, 0, 12, 24, 36]

  for (let index = 0; index < plotted.length; index++) {
    const point = plotted[index]!
    const text = texts[index] ?? ''
    const labelWidth = estimateTrendLabelWidth(text, locale)

    let chosen: TrendValueLabelBox | null = null
    for (const above of [true, false]) {
      for (const gap of gaps) {
        for (const xShift of xShifts) {
          const centerX = point.x + xShift
          const half = labelWidth / 2
          const left = centerX - half
          const right = centerX + half
          const centerY = above
            ? point.y - gap - LABEL_LINE_HEIGHT / 2
            : point.y + gap + LABEL_LINE_HEIGHT / 2
          const top = centerY - LABEL_LINE_HEIGHT / 2
          const bottom = centerY + LABEL_LINE_HEIGHT / 2
          if (top < LABEL_MARGIN_TOP || bottom > chart.height - xAxisReserve) {
            continue
          }
          const box: TrendValueLabelBox = {
            index,
            x: centerX,
            y: centerY,
            text,
            above,
            left,
            right,
            top,
            bottom
          }
          if (placed.some(other => boxesOverlap(other, box))) {
            continue
          }
          if (trendLabelCollidesWithGeometry(box, plotted)) {
            continue
          }
          chosen = box
          break
        }
        if (chosen) {
          break
        }
      }
      if (chosen) {
        break
      }
    }

    if (!chosen) {
      throw new Error(`Unable to place label for trend point ${index}`)
    }
    placed.push(chosen)
  }

  return placed
}

export function plotHealthTrendWithValueLabels(
  points: HealthTrendChartPoint[],
  texts: string[],
  locale: string,
  metric?: string
): {
  chart: ReturnType<typeof plotHealthTrend>
  valueLabels: TrendValueLabelBox[]
} {
  const width = chartWidthForLocale(locale, metric)
  let extraPadTop = 0
  let chart = plotHealthTrend(points, extraPadTop, width)
  let valueLabels = layoutHealthTrendValueLabels(chart.plotted, texts, locale, chart)

  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      assertTrendValueLabelsClear(valueLabels, chart.plotted, chart.height)
      break
    } catch {
      extraPadTop += 12
      chart = plotHealthTrend(points, extraPadTop, width)
      valueLabels = layoutHealthTrendValueLabels(chart.plotted, texts, locale, chart)
    }
  }
  assertTrendValueLabelsClear(valueLabels, chart.plotted, chart.height)
  return { chart, valueLabels }
}

/**
 * Whether to draw an X-axis label for a point in a (possibly dense) series.
 * Short series (≤7) show every label; longer series use interval ticks.
 */
export function shouldShowTrendAxisLabel(
  index: number,
  pointCount: number,
  interval = HEALTH_TREND_AXIS_LABEL_INTERVAL
): boolean {
  if (pointCount <= HEALTH_TREND_VALUE_LABEL_MAX_POINTS) {
    return true
  }
  if (index === 0 || index === pointCount - 1) {
    return true
  }
  const dayNumber = index + 1
  return dayNumber % interval === 0
}

/** @deprecated Use layoutHealthTrendValueLabels */
export function healthTrendValueLabelOffset(index: number, plotted: PlottedTrendPoint[]): number {
  const point = plotted[index]
  if (!point) {
    return 20
  }
  return index % 2 === 0 ? 22 : 30
}
