<script setup lang="ts">
import type { HealthReportResult } from '~/utils/candor-api'

const props = defineProps<{
  open: boolean
  collapsed: boolean
  results: HealthReportResult[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:collapsed': [value: boolean]
}>()

type StatusClass = 'ok' | 'warn' | 'alert' | 'unknown'

function resultNumeric(r: HealthReportResult): number | null {
  if (r.value_numeric != null && !Number.isNaN(Number(r.value_numeric))) {
    return Number(r.value_numeric)
  }
  if (r.raw_value != null && r.raw_value !== '' && !Number.isNaN(Number(r.raw_value))) {
    return Number(r.raw_value)
  }
  return null
}

function statusClass(r: HealthReportResult): StatusClass {
  const v = resultNumeric(r)
  if (v == null) {
    return r.needs_review ? 'warn' : 'unknown'
  }
  if (r.critical_low != null && v < Number(r.critical_low)) {
    return 'alert'
  }
  if (r.critical_high != null && v > Number(r.critical_high)) {
    return 'alert'
  }
  if (r.borderline_low != null && v < Number(r.borderline_low)) {
    return 'warn'
  }
  if (r.borderline_high != null && v > Number(r.borderline_high)) {
    return 'warn'
  }
  if (r.ref_low != null && v < Number(r.ref_low)) {
    return 'warn'
  }
  if (r.ref_high != null && v > Number(r.ref_high)) {
    return 'warn'
  }
  if (r.ref_low != null || r.ref_high != null) {
    return 'ok'
  }
  return r.needs_review ? 'warn' : 'unknown'
}

function statusLabel(cls: StatusClass) {
  if (cls === 'ok') {
    return '最佳值'
  }
  if (cls === 'warn') {
    return '提醒值'
  }
  if (cls === 'alert') {
    return '警戒值'
  }
  return '待確認'
}

function formatRef(r: HealthReportResult) {
  const low = r.ref_low
  const high = r.ref_high
  if (low == null && high == null) {
    return '—'
  }
  if (low != null && high != null) {
    return `${low} ~ ${high}`
  }
  if (low != null) {
    return `≥ ${low}`
  }
  return `≤ ${high}`
}

function gaugePct(r: HealthReportResult): number | null {
  const v = resultNumeric(r)
  const low = r.ref_low != null ? Number(r.ref_low) : null
  const high = r.ref_high != null ? Number(r.ref_high) : null
  if (v == null || low == null || high == null || high <= low) {
    return null
  }
  const pad = (high - low) * 0.5
  const min = low - pad
  const max = high + pad
  return Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))
}

function displayValue(r: HealthReportResult) {
  const v = resultNumeric(r)
  if (v != null) {
    return String(v)
  }
  return r.raw_value != null ? String(r.raw_value) : '—'
}

function toggle() {
  emit('update:collapsed', !props.collapsed)
}

function close() {
  emit('update:open', false)
  emit('update:collapsed', false)
}
</script>

<template>
  <div
    v-if="open"
    class="report-dock absolute inset-x-0 top-0 z-20 flex flex-col overflow-hidden rounded-xl border shadow-lg"
    :class="collapsed ? 'h-auto' : 'h-1/2 min-h-[11rem]'"
    data-testid="chat-report-dock"
  >
    <div class="report-dock-head flex shrink-0 items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
      <strong class="text-sm font-semibold tracking-wide">
        {{ $t('labChart.dockTitle') }}
      </strong>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-md bg-white/15 px-2.5 py-1 text-xs text-white"
          data-testid="chat-report-dock-toggle"
          @click="toggle"
        >
          {{ collapsed ? $t('labChart.expand') : $t('labChart.collapse') }}
        </button>
        <button
          type="button"
          class="rounded-md bg-white/15 px-2.5 py-1 text-xs text-white"
          data-testid="chat-report-dock-close"
          @click="close"
        >
          {{ $t('labChart.close') }}
        </button>
      </div>
    </div>

    <div
      v-show="!collapsed"
      class="report-dock-body min-h-0 flex-1 overflow-auto px-3 py-3 sm:px-4"
    >
      <div class="mb-3 flex flex-wrap items-center gap-3 rounded-lg bg-[#eef2f2] px-2.5 py-2 text-xs text-[#4a5a5e]">
        <span><i class="yr-dot ok" />{{ $t('labChart.optimal') }}</span>
        <span><i class="yr-dot warn" />{{ $t('labChart.caution') }}</span>
        <span><i class="yr-dot alert" />{{ $t('labChart.alert') }}</span>
        <span class="ms-auto text-[#7a8a8e]">{{ $t('labChart.colorHint') }}</span>
      </div>

      <p
        v-if="!results.length"
        class="text-sm text-[#6a7a7e]"
      >
        {{ $t('labChart.empty') }}
      </p>

      <div
        v-else
        class="overflow-auto rounded-lg border border-[#e1e7e8] bg-white"
      >
        <table class="w-full min-w-[32rem] border-collapse text-sm">
          <thead>
            <tr class="bg-[#eef2f2] text-left text-xs font-semibold text-[#5b6b6f]">
              <th class="border-b border-dashed border-[#d5dddf] px-2.5 py-2">
                {{ $t('labChart.status') }}
              </th>
              <th class="border-b border-dashed border-[#d5dddf] px-2.5 py-2">
                {{ $t('labChart.item') }}
              </th>
              <th class="border-b border-dashed border-[#d5dddf] px-2.5 py-2">
                {{ $t('labChart.value') }}
              </th>
              <th class="border-b border-dashed border-[#d5dddf] px-2.5 py-2">
                {{ $t('labChart.unit') }}
              </th>
              <th class="border-b border-dashed border-[#d5dddf] px-2.5 py-2">
                {{ $t('labChart.refRange') }}
              </th>
              <th class="border-b border-dashed border-[#d5dddf] px-2.5 py-2">
                {{ $t('labChart.position') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in results"
              :key="row.id"
              class="border-b border-dashed border-[#e6ecec] last:border-0"
            >
              <td class="px-2.5 py-2.5 text-[#1f2a2e]">
                <i
                  class="yr-dot"
                  :class="statusClass(row)"
                />{{ statusLabel(statusClass(row)) }}
              </td>
              <td class="px-2.5 py-2.5 font-semibold text-[#1f2a2e]">
                {{ row.raw_name || row.biomarker_id || '—' }}
              </td>
              <td
                class="px-2.5 py-2.5 text-base font-bold"
                :class="`yr-val-${statusClass(row)}`"
              >
                {{ displayValue(row) }}
              </td>
              <td class="px-2.5 py-2.5 text-[#5b6b6f]">
                {{ row.unit || row.raw_unit || '—' }}
              </td>
              <td class="px-2.5 py-2.5 text-xs text-[#6a7a7e]">
                {{ formatRef(row) }}
              </td>
              <td class="px-2.5 py-2.5">
                <div
                  v-if="gaugePct(row) != null"
                  class="yr-gauge relative h-2 w-[4.5rem] rounded-full"
                >
                  <div
                    class="absolute top-[-3px] h-3.5 w-0.5 -translate-x-1/2 rounded-sm bg-[#1f2a2e]"
                    :style="{ left: `${gaugePct(row)}%` }"
                  />
                </div>
                <span
                  v-else
                  class="text-[#6a7a7e]"
                >—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.report-dock {
  background: #f7f8f8;
  border-color: #d5dddf;
  color: #1f2a2e;
  font-family: "Noto Sans TC", "IBM Plex Sans", sans-serif;
}

.report-dock-head {
  background: #2f6f6a;
  color: #fff;
  border-bottom: 1px solid #cfd8da;
}

.yr-dot {
  display: inline-block;
  width: 0.55rem;
  height: 0.55rem;
  margin-right: 0.3rem;
  vertical-align: middle;
  border-radius: 999px;
}

.yr-dot.ok {
  background: #3bb273;
}

.yr-dot.warn {
  background: #e2a23a;
}

.yr-dot.alert {
  background: #e35d8c;
}

.yr-dot.unknown {
  background: #9aa7ab;
}

.yr-val-ok {
  color: #2f9b5f;
}

.yr-val-warn {
  color: #c8871f;
}

.yr-val-alert {
  color: #c94474;
}

.yr-val-unknown {
  color: #5b6b6f;
}

.yr-gauge {
  background: linear-gradient(90deg, #e35d8c 0%, #e2a23a 28%, #3bb273 50%, #e2a23a 72%, #e35d8c 100%);
  opacity: 0.85;
}
</style>
