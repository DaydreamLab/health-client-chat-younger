<template>
  <div
    class="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center"
    :class="variant === 'overlay'
      ? 'absolute inset-0 z-10 min-h-72 rounded-2xl bg-elevated/85 backdrop-blur-sm'
      : 'min-h-72 rounded-2xl border border-dashed border-default bg-elevated/85 backdrop-blur-sm'"
    :data-testid="testId"
  >
    <span
      v-if="icon"
      class="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20"
    >
      <UIcon
        :name="icon"
        class="size-7"
      />
    </span>
    <p class="text-base font-semibold text-highlighted">
      {{ title }}
    </p>
    <p class="max-w-sm text-sm leading-6 text-muted">
      {{ hint }}
    </p>
    <div class="mt-2 flex w-full max-w-xs flex-col gap-2 sm:flex-row">
      <AppButton
        class="w-full"
        :to="loginTo"
        :data-testid="loginTestId"
      >
        {{ $t('memberShell.login') }}
      </AppButton>
      <AppButton
        class="w-full"
        variant="outline"
        :to="registerTo"
        :data-testid="registerTestId"
      >
        {{ $t('memberShell.register') }}
      </AppButton>
    </div>
    <AppButton
      v-if="showBackToChat"
      variant="ghost"
      class="mt-1"
      :to="chatTo"
      :data-testid="backToChatTestId"
    >
      {{ $t('memberShell.backToChat') }}
    </AppButton>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  hint: string
  icon?: string
  variant?: 'card' | 'overlay'
  testId?: string
  loginTestId?: string
  registerTestId?: string
  backToChatTestId?: string
  showBackToChat?: boolean
}>(), {
  icon: 'i-lucide-lock',
  variant: 'card',
  testId: 'member-auth-gate',
  loginTestId: 'member-auth-login',
  registerTestId: 'member-auth-register',
  backToChatTestId: 'member-auth-back-chat',
  showBackToChat: true
})

const { loginTo, registerTo, chatTo } = useMemberAuthLinks()
</script>
