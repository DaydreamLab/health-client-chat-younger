<template>
  <section
    v-if="packagesWithItems.length"
    class="mt-3 rounded-2xl border border-default bg-elevated p-4"
    data-testid="chat-recommendation-packages"
  >
    <h2 class="text-sm font-semibold text-highlighted">
      {{ $t('recommendation.packagePick') }}
    </h2>
    <p
      v-if="pending"
      class="mt-2 text-sm text-muted"
      data-testid="chat-recommendation-loading"
    >
      {{ $t('recommendation.recoLoading') }}
    </p>
    <p
      v-else-if="error"
      class="mt-2 text-sm text-error"
      data-testid="chat-recommendation-error"
    >
      {{ error }}
    </p>
    <div
      v-else
      class="mt-3 grid gap-2 sm:grid-cols-2"
    >
      <div
        v-for="pkg in packagesWithItems"
        :key="pkg.package_plan_code"
        class="rounded-xl border border-default bg-default p-3"
        :data-testid="`chat-package-plan-${pkg.package_plan_code}`"
      >
        <p class="font-medium text-highlighted">
          {{ pkg.package_plan_name }}
        </p>
        <p class="mt-1 text-sm font-semibold text-primary">
          {{ $t('recommendation.perMonth', { price: formatTwd(pkg.price) }) }}
        </p>
        <p class="mt-1 text-xs text-muted">
          {{ $t('recommendation.itemCountHint', { count: pkg.items.length }) }}
        </p>
      </div>
    </div>
    <AppButton
      v-if="!pending && packagesWithItems.length"
      class="mt-4 w-full sm:w-auto"
      size="sm"
      data-testid="chat-recommendation-checkout"
      @click="emit('checkout')"
    >
      {{ $t('chat.viewRecommend') }}
    </AppButton>
  </section>
</template>

<script setup lang="ts">
import type { RecommendationPackage } from '~/utils/candor-api'
import { formatTwd } from '~/utils/first-order'

const props = defineProps<{
  packages: RecommendationPackage[]
  pending: boolean
  error: string
}>()

const emit = defineEmits<{
  checkout: []
}>()

const packagesWithItems = computed(() =>
  props.packages.filter(pkg => pkg.items.length > 0)
)
</script>
