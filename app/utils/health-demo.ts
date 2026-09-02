export type HealthStatus = 'ok' | 'low' | 'high'

export type HealthSystemKey
  = 'nutrition'
    | 'metabolic'
    | 'cardio'
    | 'detox'
    | 'endocrine'
    | 'immune'

export interface HealthMarker {
  key: string
  value: number
  unit: string
  range: string
  status: HealthStatus
}

export const healthScore = 84
export const healthScoreDelta = 6
export const healthAge = { actual: 42, biological: 36 }
export const healthMarkerCount = 68

export const healthTrend = [
  { key: 'may', value: 72 },
  { key: 'sep', value: 76 },
  { key: 'jan', value: 80 },
  { key: 'may2', value: 84 }
] as const

export const healthSystems: Array<{
  key: HealthSystemKey
  score: number
  color: string
  markers: HealthMarker[]
}> = [
  {
    key: 'nutrition',
    score: 82,
    color: 'var(--color-chart-primary)',
    markers: [
      { key: 'vitaminD', value: 28, unit: 'ng/mL', range: '30–60', status: 'low' },
      { key: 'b12', value: 512, unit: 'pg/mL', range: '200–900', status: 'ok' },
      { key: 'ferritin', value: 42, unit: 'ng/mL', range: '50–150', status: 'low' }
    ]
  },
  {
    key: 'metabolic',
    score: 68,
    color: 'var(--color-chart-amber)',
    markers: [
      { key: 'hba1c', value: 5.4, unit: '%', range: '4.0–5.6', status: 'ok' },
      { key: 'homa', value: 2.8, unit: '', range: '≤ 1.4', status: 'high' },
      { key: 'triglyceride', value: 148, unit: 'mg/dL', range: '< 150', status: 'ok' }
    ]
  },
  {
    key: 'cardio',
    score: 88,
    color: 'var(--color-chart-blue)',
    markers: [
      { key: 'ldl', value: 98, unit: 'mg/dL', range: '< 100', status: 'ok' },
      { key: 'hdl', value: 62, unit: 'mg/dL', range: '≥ 50', status: 'ok' },
      { key: 'hscrp', value: 0.7, unit: 'mg/L', range: '< 1.0', status: 'ok' }
    ]
  },
  {
    key: 'detox',
    score: 74,
    color: 'var(--color-chart-teal)',
    markers: [
      { key: 'ggt', value: 38, unit: 'U/L', range: '≤ 40', status: 'ok' },
      { key: 'egfr', value: 96, unit: 'mL/min', range: '≥ 90', status: 'ok' }
    ]
  },
  {
    key: 'endocrine',
    score: 71,
    color: 'var(--color-chart-purple)',
    markers: [
      { key: 'tsh', value: 2.1, unit: 'μIU/mL', range: '0.4–4.0', status: 'ok' },
      { key: 'dheas', value: 246, unit: 'µg/dL', range: '250–350', status: 'low' }
    ]
  },
  {
    key: 'immune',
    score: 79,
    color: 'var(--color-chart-rose)',
    markers: [
      { key: 'wbc', value: 5.8, unit: '10³/μL', range: '4.0–10.0', status: 'ok' },
      { key: 'ige', value: 42, unit: 'IU/mL', range: '< 100', status: 'ok' }
    ]
  }
]
