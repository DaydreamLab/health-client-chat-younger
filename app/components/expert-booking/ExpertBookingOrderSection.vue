<script setup lang="ts">
import {
  EXPERT_BOOKING_PRICE_TWD,
  formatConfirmedAtLabel,
  type ExpertBookingOnOrder
} from '~/utils/expert-booking'
import { formatTwd } from '~/utils/first-order'

const props = defineProps<{
  booking: ExpertBookingOnOrder
  amount?: number | null
}>()

const { locale } = useI18n()

const confirmedLabel = computed(() =>
  formatConfirmedAtLabel(
    props.booking.confirmed_starts_at,
    props.booking.confirmed_ends_at,
    locale.value
  )
)

const picks = computed(() => props.booking.product_picks ?? [])

const amountLabel = computed(() =>
  formatTwd(props.amount ?? EXPERT_BOOKING_PRICE_TWD)
)
</script>

<template>
  <div
    class="space-y-4"
    data-testid="expert-booking-order-section"
  >
    <section
      class="rounded-2xl border border-default bg-elevated p-5"
      data-testid="expert-booking-service-card"
    >
      <h2 class="text-sm font-semibold text-muted">
        {{ $t('expertBooking.orderSectionTitle') }}
      </h2>
      <dl class="mt-3 space-y-3 text-sm">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <dt class="text-muted">
            {{ $t('expertBooking.serviceStatus') }}
          </dt>
          <dd>
            <ExpertBookingStatusPill :status="booking.status" />
          </dd>
        </div>
        <div class="flex flex-wrap items-start justify-between gap-2">
          <dt class="text-muted">
            {{ $t('expertBooking.confirmedAt') }}
          </dt>
          <dd
            class="text-highlighted"
            data-testid="expert-booking-confirmed-at"
          >
            {{ confirmedLabel || $t('expertBooking.confirmedAtPending') }}
          </dd>
        </div>
        <div class="flex flex-wrap items-start justify-between gap-2">
          <dt class="text-muted">
            {{ $t('expertBooking.amount') }}
          </dt>
          <dd class="font-semibold tabular-nums text-primary">
            {{ amountLabel }}
          </dd>
        </div>
      </dl>
    </section>

    <section
      class="rounded-2xl border border-default bg-elevated p-5"
      data-testid="expert-booking-recommendations"
    >
      <h2 class="text-sm font-semibold text-muted">
        {{ $t('expertBooking.recommendationsTitle') }}
      </h2>
      <ul
        v-if="picks.length"
        class="mt-3 space-y-3"
      >
        <li
          v-for="item in picks"
          :key="item.id"
          class="space-y-1"
          :data-testid="`expert-booking-rec-${item.sellable_item_id}`"
        >
          <p class="font-semibold text-highlighted">
            {{ item.sellable_item_name || item.sellable_item_code || item.sellable_item_id }}
          </p>
          <p class="text-sm text-muted">
            {{ item.reason }}
          </p>
        </li>
      </ul>
      <p
        v-else
        class="mt-3 text-sm text-muted"
        data-testid="expert-booking-recommendations-empty"
      >
        {{ $t('expertBooking.recommendationsEmpty') }}
      </p>
    </section>

    <p
      class="text-xs leading-5 text-muted"
      data-testid="expert-booking-reschedule-note"
    >
      {{ $t('expertBooking.rescheduleNote') }}
    </p>
  </div>
</template>
