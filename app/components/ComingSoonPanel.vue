<template>
  <div
    class="relative isolate -m-4 flex min-h-[calc(100dvh-7.5rem)] w-[calc(100%+2rem)] flex-col items-center justify-center overflow-hidden px-4 py-16 text-center sm:-m-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:min-h-dvh"
    :data-testid="testId"
  >
    <div
      class="pointer-events-none absolute inset-0 -z-10"
      aria-hidden="true"
    >
      <div class="absolute inset-0 bg-gradient-to-b from-primary/12 via-transparent to-transparent dark:from-primary/18" />
      <div class="coming-soon-orb absolute -start-16 top-12 size-56 rounded-full bg-primary/15 blur-3xl dark:bg-primary/25" />
      <div class="coming-soon-orb-delayed absolute -end-10 bottom-8 size-72 rounded-full bg-brand-300/20 blur-3xl dark:bg-brand-500/15" />
    </div>

    <div class="coming-soon-icon-wrap relative mb-8 flex size-28 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20 dark:bg-primary/15">
      <span class="coming-soon-ring absolute inset-2 rounded-full border border-primary/25" />
      <UIcon
        :name="icon"
        class="size-12 text-primary"
      />
    </div>

    <p class="text-sm font-medium tracking-wide text-primary">
      {{ eyebrow }}
    </p>
    <h1 class="mt-3 text-3xl font-semibold tracking-tight text-highlighted sm:text-4xl">
      {{ title }}
    </h1>
    <p class="mt-4 max-w-md text-sm leading-6 text-muted sm:text-base">
      {{ subtitle }}
    </p>

    <div class="mt-10 flex flex-wrap items-center justify-center gap-3">
      <AppButton
        :to="primaryTo"
        variant="primary"
        :data-testid="primaryTestId"
      >
        {{ primaryLabel }}
      </AppButton>
      <AppButton
        :to="secondaryTo"
        variant="outline"
        :data-testid="secondaryTestId"
      >
        {{ secondaryLabel }}
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  testId: string
  icon: string
  eyebrow: string
  title: string
  subtitle: string
  primaryTo: string
  primaryLabel: string
  primaryTestId: string
  secondaryTo: string
  secondaryLabel: string
  secondaryTestId: string
}>()
</script>

<style scoped>
.coming-soon-icon-wrap {
  animation: coming-soon-float 4.5s ease-in-out infinite;
}

.coming-soon-ring {
  animation: coming-soon-pulse 2.8s ease-out infinite;
}

.coming-soon-orb {
  animation: coming-soon-drift 9s ease-in-out infinite alternate;
}

.coming-soon-orb-delayed {
  animation: coming-soon-drift 11s ease-in-out infinite alternate-reverse;
}

@keyframes coming-soon-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

@keyframes coming-soon-pulse {
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

@keyframes coming-soon-drift {
  from {
    transform: translate(0, 0);
  }
  to {
    transform: translate(12px, -18px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .coming-soon-icon-wrap,
  .coming-soon-ring,
  .coming-soon-orb,
  .coming-soon-orb-delayed {
    animation: none;
  }
}
</style>
