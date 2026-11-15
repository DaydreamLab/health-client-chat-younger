<template>
  <div :data-testid="testId">
    <MemberPageSkeleton
      v-if="!settled"
      :variant="skeletonVariant"
      :test-id="skeletonTestId"
    />

    <template v-else-if="!auth.isMember">
      <slot name="guest">
        <div
          class="mx-auto w-full max-w-md"
          :data-testid="loginTestId"
        >
          <AuthLoginForm
            stay
            :show-description="false"
            :show-guest-link="false"
          />
        </div>
      </slot>
    </template>

    <slot v-else />
  </div>
</template>

<script setup lang="ts">
/**
 * Shared auth gate for member surfaces:
 * prerender / first paint → skeleton; after ensureSession → inline AuthLoginForm
 * (stay on page) or member slot. Do not flash login while !settled.
 */
withDefaults(defineProps<{
  skeletonVariant?: 'dashboard' | 'list' | 'form' | 'detail' | 'default'
  testId?: string
  skeletonTestId?: string
  loginTestId?: string
}>(), {
  skeletonVariant: 'default',
  testId: 'member-auth-shell',
  skeletonTestId: 'member-auth-skeleton',
  loginTestId: 'member-auth-login'
})

const auth = useAuthStore()
const { settled, sync } = useAuthClientSync()

defineExpose({
  settled,
  sync
})
</script>
