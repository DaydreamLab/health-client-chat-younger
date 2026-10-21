export type WearableDeviceStatus = 'connected' | 'delayed' | 'auth_expired' | 'sync_error'

export type WearableMetricType = 'resting_hr' | 'steps' | 'sleep_minutes'

export type WearableDemoState = 'list' | 'empty' | 'no_data' | 'errors'

export interface WearableTrendPoint {
  key: string
  value: number
  /** X-axis label for day-of-month series; omit when `weekdayIndex` is set */
  label?: string
  /** 0 = Monday … 6 = Sunday for 7-day trends */
  weekdayIndex?: number
}

export interface WearableDevice {
  id: string
  display_name: string
  status: WearableDeviceStatus
  last_synced_at: string
  metrics: WearableMetricType[]
  last_error?: string
  last_success_sync_at?: string
}

export interface WearableMetricSummary {
  metric_type: WearableMetricType
  range_days: 7 | 30
  average: number
  unit: string
  last_updated_at: string
  trend: WearableTrendPoint[]
}

export interface WearableReportReference {
  range_days: 7
  avg_sleep_minutes: number
  avg_resting_hr: number
  resting_hr_unit: string
  device_id: string
}

export const WEARABLE_DEMO_STATE_QUERY = 'demo'

export function parseWearableDemoState(raw: string | null | undefined): WearableDemoState {
  if (raw === 'empty' || raw === 'no_data' || raw === 'errors') {
    return raw
  }
  return 'list'
}

const restingHr7: WearableTrendPoint[] = [
  { key: 'd1', value: 60, weekdayIndex: 0 },
  { key: 'd2', value: 65, weekdayIndex: 1 },
  { key: 'd3', value: 63, weekdayIndex: 2 },
  { key: 'd4', value: 62, weekdayIndex: 3 },
  { key: 'd5', value: 64, weekdayIndex: 4 },
  { key: 'd6', value: 61, weekdayIndex: 5 },
  { key: 'd7', value: 62, weekdayIndex: 6 }
]

const restingHr30: WearableTrendPoint[] = Array.from({ length: 30 }, (_, index) => {
  const day = index + 1
  const wave = Math.sin(index / 4) * 3
  return {
    key: `d${day}`,
    value: Math.round(62 + wave + (index % 5) - 2),
    label: `${day}`
  }
})

const steps7: WearableTrendPoint[] = [
  { key: 'd1', value: 6200, weekdayIndex: 0 },
  { key: 'd2', value: 9100, weekdayIndex: 1 },
  { key: 'd3', value: 7800, weekdayIndex: 2 },
  { key: 'd4', value: 8400, weekdayIndex: 3 },
  { key: 'd5', value: 7200, weekdayIndex: 4 },
  { key: 'd6', value: 10200, weekdayIndex: 5 },
  { key: 'd7', value: 8800, weekdayIndex: 6 }
]

const steps30: WearableTrendPoint[] = Array.from({ length: 30 }, (_, index) => ({
  key: `d${index + 1}`,
  value: 6500 + (index % 7) * 420 + Math.round(Math.sin(index / 3) * 800),
  label: `${index + 1}`
}))

const sleep7: WearableTrendPoint[] = [
  { key: 'd1', value: 390, weekdayIndex: 0 },
  { key: 'd2', value: 420, weekdayIndex: 1 },
  { key: 'd3', value: 405, weekdayIndex: 2 },
  { key: 'd4', value: 398, weekdayIndex: 3 },
  { key: 'd5', value: 412, weekdayIndex: 4 },
  { key: 'd6', value: 430, weekdayIndex: 5 },
  { key: 'd7', value: 408, weekdayIndex: 6 }
]

const sleep30: WearableTrendPoint[] = Array.from({ length: 30 }, (_, index) => ({
  key: `d${index + 1}`,
  value: 380 + (index % 6) * 8 + Math.round(Math.cos(index / 5) * 25),
  label: `${index + 1}`
}))

export const wearablesMockDevices: WearableDevice[] = [
  {
    id: 'apple-watch',
    display_name: 'Apple Watch',
    status: 'connected',
    last_synced_at: '2026-10-19T08:12:00+08:00',
    metrics: ['resting_hr', 'steps', 'sleep_minutes']
  },
  {
    id: 'oura-ring',
    display_name: 'Oura Ring',
    status: 'delayed',
    last_synced_at: '2026-10-16T09:40:00+08:00',
    metrics: ['resting_hr', 'steps', 'sleep_minutes']
  },
  {
    id: 'garmin',
    display_name: 'Garmin',
    status: 'auth_expired',
    last_synced_at: '2026-10-12T21:40:00+08:00',
    last_success_sync_at: '2026-10-12T21:40:00+08:00',
    last_error: 'auth_expired',
    metrics: ['resting_hr', 'steps', 'sleep_minutes']
  }
]

export const wearablesSyncErrorDevice: WearableDevice = {
  id: 'oura-ring',
  display_name: 'Oura Ring',
  status: 'sync_error',
  last_synced_at: '2026-10-16T09:40:00+08:00',
  last_error: 'sync_failed',
  metrics: ['resting_hr', 'steps', 'sleep_minutes']
}

export const wearablesNoDataDevice: WearableDevice = {
  id: 'apple-watch',
  display_name: 'Apple Watch',
  status: 'connected',
  last_synced_at: '2026-10-19T08:12:00+08:00',
  metrics: ['resting_hr', 'steps', 'sleep_minutes']
}

export const wearablesReportReferenceMock: WearableReportReference = {
  range_days: 7,
  avg_sleep_minutes: 408,
  avg_resting_hr: 62,
  resting_hr_unit: 'bpm',
  device_id: 'apple-watch'
}

const metricTrendByRange: Record<WearableMetricType, Record<7 | 30, WearableTrendPoint[]>> = {
  resting_hr: { 7: restingHr7, 30: restingHr30 },
  steps: { 7: steps7, 30: steps30 },
  sleep_minutes: { 7: sleep7, 30: sleep30 }
}

const metricAverages: Record<WearableMetricType, Record<7 | 30, number>> = {
  resting_hr: { 7: 62, 30: 63 },
  steps: { 7: 7820, 30: 7650 },
  sleep_minutes: { 7: 408, 30: 402 }
}

export function getWearableDevice(deviceId: string): WearableDevice | undefined {
  return wearablesMockDevices.find(device => device.id === deviceId)
    ?? (deviceId === wearablesSyncErrorDevice.id ? wearablesSyncErrorDevice : undefined)
}

export function getWearableMetricSummary(
  deviceId: string,
  metricType: WearableMetricType,
  rangeDays: 7 | 30
): WearableMetricSummary | null {
  const device = getWearableDevice(deviceId)
  if (!device || !device.metrics.includes(metricType)) {
    return null
  }
  const unit = metricType === 'resting_hr' ? 'bpm' : metricType === 'steps' ? 'steps' : 'min'
  return {
    metric_type: metricType,
    range_days: rangeDays,
    average: metricAverages[metricType][rangeDays],
    unit,
    last_updated_at: device.last_synced_at,
    trend: metricTrendByRange[metricType][rangeDays]
  }
}

export function devicesForDemoState(state: WearableDemoState): WearableDevice[] {
  if (state === 'empty') {
    return []
  }
  if (state === 'no_data') {
    return [wearablesNoDataDevice]
  }
  if (state === 'errors') {
    return [
      wearablesMockDevices[2]!,
      wearablesSyncErrorDevice
    ]
  }
  return wearablesMockDevices
}
