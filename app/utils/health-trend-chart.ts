export interface HealthTrendChartPoint {
  key: string
  value: number
  label?: string
}

export interface PlottedTrendPoint extends HealthTrendChartPoint {
  x: number
  y: number
}

const width = 420
const height = 180
const padX = 28
const padTop = 24
const padBottom = 36

export function plotHealthTrend(points: HealthTrendChartPoint[]): {
  plotted: PlottedTrendPoint[]
  linePoints: string
  areaPath: string
  padBottom: number
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
  return { plotted, linePoints, areaPath, padBottom }
}
