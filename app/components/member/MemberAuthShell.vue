<template>
  <div :data-testid="testId">
    <MemberPageSkeleton
      v-if="!settled"
      :variant="skeletonVariant"
      :test-id="skeletonTestId"
    />

    <template v-else-if="!auth.isMember">
      <slot name="guest">
        <MemberAuthGate
          :title="title"
          :hint="hint"
          :icon="icon"
          :variant="gateVariant"
          :test-id="gateTestId"
          :login-test-id="loginTestId"
          :register-test-id="registerTestId"
          :back-to-chat-test-id="backToChatTestId"
          :show-back-to-chat="showBackToChat"
        />
      </slot>
    </template>

    <slot v-else />
  </div>
</template>

<script setup lang="ts">
/**
 * Shared auth gate for member surfaces:
 * prerender / first paint → skeleton; after ensureSession → guest gate or member slot.
 */
withDefaults(defineProps<{
  title?: string
  hint?: string
  icon?: string
  skeletonVariant?: 'dashboard' | 'list' | 'form' | 'detail' | 'default'
  testId?: string
  skeletonTestId?: string
  gateTestId?: string
  loginTestId?: string
  registerTestId?: string
  backToChatTestId?: string
  showBackToChat?: boolean
  gateVariant?: 'card' | 'overlay'
}>(), {
  title: '',
  hint: '',
  icon: 'i-lucide-lock',
  skeletonVariant: 'default',
  testId: 'member-auth-shell',
  skeletonTestId: 'member-auth-skeleton',
  gateTestId: 'member-auth-gate',
  loginTestId: 'member-auth-login',
  registerTestId: 'member-auth-register',
  backToChatTestId: 'member-auth-back-chat',
  showBackToChat: true,
  gateVariant: 'card'
})

const auth = useAuthStore()
const { settled, sync } = useAuthClientSync()

defineExpose({
  settled,
  sync
})
</script>
