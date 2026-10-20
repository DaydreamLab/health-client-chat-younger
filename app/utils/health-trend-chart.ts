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

const width = 420
const height = 196
const padX = 28
const padTop = 44
const padBottom = 36

/** Show per-point value labels up to this many points; denser series rely on tooltips. */
export const HEALTH_TREND_VALUE_LABEL_MAX_POINTS = 7

export function plotHealthTrend(points: HealthTrendChartPoint[]): {
  plotted: PlottedTrendPoint[]
  linePoints: string
  areaPath: string
  padBottom: number
  padTop: number
  height: number
} {
  if (points.length < 2) {
    throw new Error('Health trend chart requires at least two points')
  }
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
  return { plotted, linePoints, areaPath, padBottom, padTop, height }
}

/** Vertical offset (px above point center) for value labels to reduce overlap with the line. */
export function healthTrendValueLabelOffset(index: number, plotted: PlottedTrendPoint[]): number {
  const point = plotted[index]
  if (!point) {
    return 20
  }
  const prev = plotted[index - 1]
  const next = plotted[index + 1]
  const isPeak = (!prev || point.y <= prev.y) && (!next || point.y <= next.y)
  const isValley = (!prev || point.y >= prev.y) && (!next || point.y >= next.y)
  let offset = index % 2 === 0 ? 22 : 30
  if (isPeak) {
    offset += 10
  } else if (isValley) {
    offset += 4
  }
  const prevRise = prev ? prev.y - point.y : 0
  const nextRise = next ? next.y - point.y : 0
  if (prevRise > 8 && nextRise > 8) {
    offset += 6
  }
  return offset
}
