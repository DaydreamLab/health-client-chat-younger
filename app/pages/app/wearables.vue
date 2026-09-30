<template>
  <div
    class="relative isolate flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center overflow-hidden px-4 py-16 text-center sm:px-6"
    data-testid="wearables-soon"
  >
    <div
      class="pointer-events-none absolute inset-0 -z-10"
      aria-hidden="true"
    >
      <div class="absolute inset-0 bg-gradient-to-b from-primary/12 via-transparent to-transparent dark:from-primary/18" />
      <div class="wearable-orb absolute -start-16 top-12 size-56 rounded-full bg-primary/15 blur-3xl dark:bg-primary/25" />
      <div class="wearable-orb-delayed absolute -end-10 bottom-8 size-72 rounded-full bg-brand-300/20 blur-3xl dark:bg-brand-500/15" />
    </div>

    <div class="wearable-icon-wrap relative mb-8 flex size-28 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20 dark:bg-primary/15">
      <span class="wearable-ring absolute inset-2 rounded-full border border-primary/25" />
      <UIcon
        name="i-lucide-watch"
        class="size-12 text-primary"
      />
    </div>

    <p class="text-sm font-medium tracking-wide text-primary">
      {{ $t('wearables.eyebrow') }}
    </p>
    <h1 class="mt-3 text-3xl font-semibold tracking-tight text-highlighted sm:text-4xl">
      {{ $t('wearables.title') }}
    </h1>
    <p class="mt-4 max-w-md text-sm leading-6 text-muted sm:text-base">
      {{ $t('wearables.subtitle') }}
    </p>

    <div class="mt-10 flex flex-wrap items-center justify-center gap-3">
      <AppButton
        :to="localePath('/app')"
        variant="primary"
        data-testid="wearables-back-health"
      >
        {{ $t('wearables.ctaHealth') }}
      </AppButton>
      <AppButton
        :to="localePath('/chat')"
        variant="outline"
        data-testid="wearables-back-chat"
      >
        {{ $t('wearables.ctaChat') }}
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const localePath = useLocalePath()
</script>

<style scoped>
.wearable-icon-wrap {
  animation: wearable-float 4.5s ease-in-out infinite;
}

.wearable-ring {
  animation: wearable-pulse 2.8s ease-out infinite;
}

.wearable-orb {
  animation: wearable-drift 9s ease-in-out infinite alternate;
}

.wearable-orb-delayed {
  animation: wearable-drift 11s ease-in-out infinite alternate-reverse;
}

@keyframes wearable-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

@keyframes wearable-pulse {
  0% {
    opacity: 0.7;
    transform: scale(1);
  }
  70% {
    opacity: 0;
    transform: scale(1.18);
  }
  100% {
    opacity: 0;
    transform: scale(1.18);
  }
}

@keyframes wearable-drift {
  from {
    transform: translate(0, 0);
  }
  to {
    transform: translate(12px, -18px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .wearable-icon-wrap,
  .wearable-ring,
  .wearable-orb,
  .wearable-orb-delayed {
    animation: none;
  }
}
</style>
